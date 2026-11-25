/**
 * Oasis Uluwatu — direct booking service
 * -------------------------------------------------
 * Serves the booking page (public/) and a small API on top of the
 * Guesty Booking Engine (BE) API:
 *   GET  /api/search      availability + live quotes for the villas
 *   POST /api/book        create an instant reservation from a quote
 *   GET  /api/status      what the BE API key can see (no secrets)
 *   GET  /api/config      public settings for the page (Stripe publishable key)
 *   POST /api/lead        guest details + ad source, before payment
 *   POST /api/transfer    airport-transfer request after a booking
 *
 * Secrets live in Render environment variables, never in this file:
 *   GUESTY_CLIENT_ID, GUESTY_CLIENT_SECRET
 * Public setting (safe to show in the page):
 *   STRIPE_PUBLISHABLE_KEY  Balinest's Stripe key (pk_live_...). While it is
 *   not set, guests pay on Balinest's own checkout page instead.
 *   ONPAGE_PAYMENT          "off" hides the card form (guests then pay on
 *   Balinest's checkout); test links (?paytest=1) still show it.
 */

const path = require("path");
const express = require("express");

const app = express();
app.use(express.json({ limit: "200kb", verify: (req, res, buf) => { req.rawBody = buf; } }));

// ---------------------------------------------------------------------------
// 1. CONFIG
// ---------------------------------------------------------------------------

const CLIENT_ID = process.env.GUESTY_CLIENT_ID;
const CLIENT_SECRET = process.env.GUESTY_CLIENT_SECRET;
const GUESTY_BASE = "https://booking.guesty.com";

// Villas shown on the booking page, in display order.
// Jati is added later (needs its listing ID and Balinest to include it).
// Ceylon is never shown on the Oasis booking page.
const VILLAS = [
  {
    key: "palem",
    name: "Palem",
    listingId: "6a1330f6ee884400143bd533",
    group: "forest",
  },
  {
    key: "kapuk",
    name: "Kapuk",
    listingId: "69b67cfa3e48290011c5d1b2",
    group: "forest",
  },
  {
    key: "jati",
    name: "Jati",
    listingId: "6ab3478a1387f800372ef40d",
    group: "jati",
  },
  {
    key: "ceylon",
    name: "Ceylon Residences",
    listingId: "69cf268b4d255a0013ac88d2",
    group: "ceylon",
  },
];

// ---------------------------------------------------------------------------
// 2. GUESTY TOKEN (cached; Guesty limits how often a new one can be issued)
// ---------------------------------------------------------------------------

let cachedToken = null;
let tokenExpiresAt = 0;
let tokenPromise = null;

async function fetchToken() {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "booking_engine:api",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  const res = await fetch(`${GUESTY_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token fetch failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 86400) * 1000;
  saveTokenCache();
  return cachedToken;
}

// Optional: keep the token across restarts when a persistent disk is mounted
// (set TOKEN_CACHE_PATH, e.g. /var/data/guesty-token.json).
const TOKEN_CACHE_PATH = process.env.TOKEN_CACHE_PATH || "";
function saveTokenCache() {
  if (!TOKEN_CACHE_PATH) return;
  try {
    require("fs").writeFileSync(TOKEN_CACHE_PATH, JSON.stringify({ token: cachedToken, expiresAt: tokenExpiresAt }), { mode: 0o600 });
  } catch (e) { console.log("token cache write failed:", e.message); }
}
(function loadTokenCache() {
  if (!TOKEN_CACHE_PATH) return;
  try {
    const c = JSON.parse(require("fs").readFileSync(TOKEN_CACHE_PATH, "utf8"));
    if (c.token && c.expiresAt > Date.now() + 10 * 60 * 1000) { cachedToken = c.token; tokenExpiresAt = c.expiresAt; }
  } catch (e) { /* no cache yet */ }
})();

// After Guesty refuses a token (429), wait before asking again, so repeated
// searches don't keep hitting the limit.
let tokenBlockedUntil = 0;
async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 5 * 60 * 1000) return cachedToken;
  if (Date.now() < tokenBlockedUntil) throw new Error("Token fetch paused after rate limit");
  if (!tokenPromise) {
    tokenPromise = fetchToken()
      .catch((err) => {
        if (/\(429\)/.test(err.message)) tokenBlockedUntil = Date.now() + 15 * 60 * 1000;
        throw err;
      })
      .finally(() => {
        tokenPromise = null;
      });
  }
  return tokenPromise;
}

async function guesty(pathname, options = {}) {
  const token = await getToken();
  const res = await fetch(`${GUESTY_BASE}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

// ---------------------------------------------------------------------------
// 3. QUOTES
// ---------------------------------------------------------------------------

function summariseQuote(villa, data) {
  const plan = data?.rates?.ratePlans?.[0];
  const rp = plan?.ratePlan;
  const money = rp?.money;
  if (!rp || !money) return null;

  const items = Array.isArray(money.invoiceItems) ? money.invoiceItems : [];
  const lines = items.map((i) => ({
    title: i.title,
    amount: i.amount,
    type: i.normalType || i.type,
  }));
  const itemsTotal = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const total = itemsTotal > 0 ? itemsTotal : money.hostPayout;

  // Guesty gives a USD figure for the host payout; use the same ratio for an
  // approximate USD total shown next to the charged currency.
  const usdRatio = money.hostPayout ? (money.hostPayoutUsd || 0) / money.hostPayout : 0;

  return {
    key: villa.key,
    name: villa.name,
    group: villa.group,
    available: true,
    listingId: villa.listingId,
    quoteId: data._id,
    expiresAt: data.expiresAt,
    ratePlanId: rp._id,
    ratePlanName: rp.name || "Standard",
    cancellationPolicy: rp.cancellationPolicy || [],
    cancellationFee: rp.cancellationFee || null,
    nights: Array.isArray(rp.days) ? rp.days.length : null,
    currency: money.currency,
    total,
    totalUsd: usdRatio ? Math.round(total * usdRatio) : null,
    lines,
  };
}

async function quoteVilla(villa, checkIn, checkOut, guests) {
  const { ok, status, data } = await guesty("/api/reservations/quotes", {
    method: "POST",
    body: JSON.stringify({
      checkInDateLocalized: checkIn,
      checkOutDateLocalized: checkOut,
      listingId: villa.listingId,
      guestsCount: guests,
    }),
  });

  if (!ok || !data || data.error) {
    return {
      key: villa.key,
      name: villa.name,
      group: villa.group,
      available: false,
      listingId: villa.listingId,
      reason: data?.error?.code || `HTTP_${status}`,
      message: data?.error?.message || null,
    };
  }
  return (
    summariseQuote(villa, data) || {
      key: villa.key,
      name: villa.name,
      group: villa.group,
      available: false,
      reason: "NO_RATE",
    }
  );
}

// ---------------------------------------------------------------------------
// 4. ROUTES
// ---------------------------------------------------------------------------

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

app.get("/healthz", (req, res) => res.json({ status: "ok", build: BUILD }));

app.get("/api/search", async (req, res) => {
  const { checkin, checkout } = req.query;
  if (!dateRe.test(checkin || "") || !dateRe.test(checkout || "")) {
    return res.status(400).json({ error: "dates_invalid" });
  }
  if (new Date(checkout) <= new Date(checkin)) {
    return res.status(400).json({ error: "checkout_before_checkin" });
  }
  const guests = Math.min(Math.max(parseInt(req.query.guests, 10) || 2, 1), 20);

  try {
    const villas = await Promise.all(VILLAS.map((v) => quoteVilla(v, checkin, checkout, guests)));
    res.json({ checkin, checkout, guests, villas });
  } catch (err) {
    console.error("search_failed:", err.message);
    res.status(502).json({ error: "search_failed" });
  }
});

// Listing details for the page: house rules, amenities, check-in times and
// minimum stay, straight from Guesty. Cached for 6 hours.
const listingCache = new Map();
async function getListingData(key) {
  const villa = VILLAS.find((v) => v.key === key);
  if (!villa) throw new Error("unknown_villa");
  const hit = listingCache.get(villa.key);
  if (hit && hit.at > Date.now() - 6 * 3600 * 1000) return hit.data;
  {
    const r = await guesty(`/api/listings/${villa.listingId}`);
    if (!r.ok || !r.data) throw new Error(r.data?.error?.code || `HTTP_${r.status}`);
    const l = r.data;
    const data = {
      key: villa.key,
      title: l.title || null,
      publicDescription: l.publicDescription || null,
      amenities: l.amenities || [],
      terms: l.terms || null,
      checkInTime: l.defaultCheckInTime || null,
      checkOutTime: l.defaultCheckOutTime || null,
      accommodates: l.accommodates || null,
      bedrooms: l.bedrooms || null,
      bathrooms: l.bathrooms || null,
      beds: l.beds || null,
      houseRules: l.houseRules || null,
      taxes: l.taxes || null,
      fields: Object.keys(l),
    };
    listingCache.set(villa.key, { at: Date.now(), data });
    return data;
  }
}
app.get("/api/listing/:key", async (req, res) => {
  if (!VILLAS.find((v) => v.key === req.params.key)) return res.status(404).json({ error: "unknown_villa" });
  try { res.json(await getListingData(req.params.key)); }
  catch (err) { res.status(502).json({ error: "listing_failed" }); }
});

// Day-by-day availability for the calendar (greys out booked nights and shows
// minimum stays). Cached for 10 minutes per range.
const calCache = new Map();
app.get("/api/calendar", async (req, res) => {
  const { from, to } = req.query;
  if (!dateRe.test(from || "") || !dateRe.test(to || "")) return res.status(400).json({ error: "dates_invalid" });
  const ck = from + "|" + to;
  const hit = calCache.get(ck);
  if (hit && hit.at > Date.now() - 10 * 60 * 1000) return res.json(hit.data);
  try {
    const out = {};
    await Promise.all(VILLAS.map(async (v) => {
      const r = await guesty(`/api/listings/${v.listingId}/calendar?from=${from}&to=${to}`);
      const days = Array.isArray(r.data) ? r.data : Array.isArray(r.data?.days) ? r.data.days : [];
      out[v.key] = r.ok ? days.map((x) => ({ date: x.date, status: x.status, minNights: x.minNights, cta: x.cta, ctd: x.ctd })) : { error: r.data?.error?.code || `HTTP_${r.status}` };
    }));
    const data = { from, to, villas: out };
    calCache.set(ck, { at: Date.now(), data });
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "calendar_failed" });
  }
});

const crypto = require("crypto");
const sha = (v) => (v ? crypto.createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex") : undefined);
async function reportPurchase({ data, guest, stay, tracking, req }) {
  const t = tracking || {}, st = stay || {};
  const code = data.confirmationCode || data._id;
  const value = Number(st.total) || undefined, currency = st.currency || "IDR";
  const villa = st.villa || undefined;
  const jobs = [];
  if (process.env.META_CAPI_TOKEN) {
    const phone = guest.phone ? String(guest.phone).replace(/\D/g, "") : "";
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
    const ev = {
      event_name: "Purchase", event_time: Math.floor(Date.now() / 1000), event_id: "purchase-" + code,
      action_source: "website", event_source_url: t.page || "https://book.oasisuluwatu.com/",
      user_data: {
        em: [sha(guest.email)], ...(phone ? { ph: [sha(phone)] } : {}),
        fn: [sha(guest.firstName)], ln: [sha(guest.lastName)],
        client_ip_address: ip || undefined, client_user_agent: req.headers["user-agent"] || undefined,
        fbp: t.fbp || undefined, fbc: t.fbc || undefined,
      },
      custom_data: { currency, value, content_ids: villa ? [villa] : undefined, content_type: "hotel", order_id: code },
    };
    const pixelId = process.env.META_PIXEL_ID || "1081596576728068";
    jobs.push(fetch(`https://graph.facebook.com/v23.0/${pixelId}/events?access_token=${encodeURIComponent(process.env.META_CAPI_TOKEN)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [ev], ...(process.env.META_TEST_CODE ? { test_event_code: process.env.META_TEST_CODE } : {}) }),
    }).then(async (r) => console.log("meta_capi:", r.status, (await r.text()).slice(0, 200))));
  }
  if (process.env.GA4_API_SECRET) {
    const mid = process.env.GA4_MEASUREMENT_ID || "G-TJ274KHR96";
    const clientId = t.gaClientId || `${Math.floor(Math.random() * 1e10)}.${Math.floor(Date.now() / 1000)}`;
    jobs.push(fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${mid}&api_secret=${encodeURIComponent(process.env.GA4_API_SECRET)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, events: [{ name: "purchase", params: {
        transaction_id: code, value, currency,
        items: villa ? [{ item_id: villa, item_name: villa }] : [],
      } }] }),
    }).then((r) => console.log("ga4_mp:", r.status)));
  }
  await Promise.all(jobs);
}

// Checks the server-side reporting keys work, without sending any event. Shows no secrets.
app.get("/api/report-status", async (req, res) => {
  const out = { meta: "off", ga4: process.env.GA4_API_SECRET ? "key set" : "off" };
  if (process.env.META_CAPI_TOKEN) {
    try {
      const pixelId = process.env.META_PIXEL_ID || "1081596576728068";
      const r = await fetch(`https://graph.facebook.com/v23.0/${pixelId}?fields=name&access_token=${encodeURIComponent(process.env.META_CAPI_TOKEN)}`);
      const j = await r.json();
      out.meta = r.ok ? `ok (${j.name})` : `error: ${j.error?.message || r.status}`;
    } catch (e) { out.meta = "error: " + e.message; }
  }
  res.json(out);
});

app.post("/api/book", async (req, res) => {
  const { quoteId, ratePlanId, ccToken, guest, policy, tracking, stay } = req.body || {};
  if (!quoteId || !ratePlanId || !ccToken) {
    return res.status(400).json({ error: "missing_quote_or_payment" });
  }
  if (!guest?.firstName || !guest?.lastName || !guest?.email) {
    return res.status(400).json({ error: "missing_guest_details" });
  }

  try {
    const body = {
      ratePlanId,
      ccToken,
      guest: {
        firstName: String(guest.firstName).slice(0, 80),
        lastName: String(guest.lastName).slice(0, 80),
        email: String(guest.email).slice(0, 160),
        ...(guest.phone ? { phone: String(guest.phone).slice(0, 40) } : {}),
      },
      ...(policy ? { policy } : {}),
    };
    const { ok, status, data } = await guesty(
      `/api/reservations/quotes/${encodeURIComponent(quoteId)}/instant`,
      { method: "POST", body: JSON.stringify(body) }
    );

    if (!ok || !data || data.error) {
      console.error("book_failed:", status, JSON.stringify(data?.error || data).slice(0, 500));
      return res.status(status >= 400 && status < 500 ? status : 502).json({
        error: "booking_failed",
        code: data?.error?.code || null,
      });
    }

    // Booking confirmed. Conversion reporting (Meta Conversions API, Google)
    // and the notification to Jayne are added in the next step.
    console.log(
      "BOOKED",
      JSON.stringify({
        reservationId: data._id,
        confirmationCode: data.confirmationCode,
        status: data.status,
        tracking: tracking || null,
      })
    );

    // Instant email to Balinest's reservations inbox with everything Guesty
    // can't hold (special requests, children's ages, WhatsApp). Never blocks the guest.
    sendBookingAlert({ data, guest, stay }).catch((e) => console.error("alert_failed:", e.message));
    // Server-side conversion reporting (Meta Conversions API, Google Analytics), so a
    // booking still counts when an ad blocker stops the browser tags. Off until keys are set.
    reportPurchase({ data, guest, stay, tracking, req }).catch((e) => console.error("report_failed:", e.message));

    res.json({
      reservationId: data._id,
      confirmationCode: data.confirmationCode,
      status: data.status,
    });
  } catch (err) {
    console.error("book_error:", err.message);
    res.status(502).json({ error: "booking_failed" });
  }
});


// ---------------------------------------------------------------------------
// Booking alert email (Resend, from mail.oasisuluwatu.com)
//   RESEND_API_KEY      sending-only key for mail.oasisuluwatu.com (Render env)
//   BOOKING_ALERT_TO    who gets it; default Balinest reservations
// ---------------------------------------------------------------------------
const VILLA_NAMES = { palem: "Oasis Palem", kapuk: "Oasis Kapuk", jati: "Oasis Jati", ceylon: "Ceylon Residences" };
function escHtml(v) { return String(v == null ? "" : v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function niceDate(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return isNaN(d) ? String(iso || "") : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
async function sendBookingAlert({ data, guest, stay }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  const to = (process.env.BOOKING_ALERT_TO || "Balinestvillas@gmail.com").split(",").map((x) => x.trim()).filter(Boolean);
  const s = stay || {};
  const villa = VILLA_NAMES[s.villa] || s.villa || "Villa";
  const nights = s.checkin && s.checkout ? Math.round((new Date(s.checkout) - new Date(s.checkin)) / 86400000) : null;
  const ages = Array.isArray(s.childAges) && s.childAges.length ? " (ages " + s.childAges.map((a) => (String(a) === "0" ? "under 1" : a)).join(", ") + ")" : "";
  const isTest = /test/i.test(String(s.occasion || "") + " " + String(guest?.lastName || ""));
  const rows = [
    ["Confirmation", data.confirmationCode || data._id],
    ["Villa", villa],
    ["Check-in", niceDate(s.checkin) + " (from 3pm)"],
    ["Checkout", niceDate(s.checkout) + " (by 11am)"],
    ["Nights", nights],
    ["Guests", (s.adults || 0) + " adults" + (s.children ? ", " + s.children + " children" + ages : "")],
    ["Guest name", ((guest?.firstName || "") + " " + (guest?.lastName || "")).trim()],
    ["Email", guest?.email || ""],
    ["WhatsApp", s.whatsapp || guest?.phone || ""],
    ["Special requests", s.occasion || "None"],
    ["Paid", s.total ? (s.currency || "IDR") + " " + Math.round(s.total).toLocaleString("en-US") + " (card, non-refundable)" : ""],
  ];
  const subject = (isTest ? "[TEST] " : "") + "New website booking: " + villa + ", " + niceDate(s.checkin) + " to " + niceDate(s.checkout) + " · " + (data.confirmationCode || "");
  const text = "A guest just booked on book.oasisuluwatu.com. It is already confirmed in Guesty.\n\n" +
    rows.map(([k, v]) => k + ": " + (v == null ? "" : v)).join("\n") +
    "\n\nThe special requests and children's ages above are not in Guesty, as the booking page can't send notes to Guesty.";
  const html = '<p style="font:15px/1.5 Arial,sans-serif">A guest just booked on <b>book.oasisuluwatu.com</b>. It is already confirmed in Guesty.</p>' +
    '<table style="font:15px/1.5 Arial,sans-serif;border-collapse:collapse">' +
    rows.map(([k, v]) => '<tr><td style="padding:4px 16px 4px 0;color:#666;vertical-align:top">' + escHtml(k) + '</td><td style="padding:4px 0"><b>' + escHtml(v) + "</b></td></tr>").join("") +
    '</table><p style="font:13px/1.5 Arial,sans-serif;color:#666">The special requests and children\'s ages above are not in Guesty, as the booking page can\'t send notes to Guesty.</p>';
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Oasis website bookings <bookings@mail.oasisuluwatu.com>",
      to,
      ...(guest?.email ? { reply_to: guest.email } : {}),
      subject,
      text,
      html,
    }),
  });
  const out = await r.text();
  console.log("ALERT", r.status, out.slice(0, 200));
}

// Public settings for the page. The Stripe publishable key is public by
// design; when it is missing the page hands payment to Balinest's checkout.
app.get("/api/config", (req, res) => {
  res.json({
    // Card payment on our page for every guest, unless switched off with ONPAGE_PAYMENT=off.
    stripePk: (process.env.ONPAGE_PAYMENT !== "off" || req.query.test === "1")
      ? (process.env.STRIPE_PUBLISHABLE_KEY || null) : null,
    checkoutBase: "https://book.balinestvillas.com/en/properties",
  });
});

function clean(v, n) {
  return v == null ? null : String(v).replace(/[\u0000-\u001f]/g, " ").slice(0, n);
}
function cleanTracking(t) {
  const out = {};
  if (t && typeof t === "object") {
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "from", "landing", "referrer"]) {
      if (t[k]) out[k] = clean(t[k], 300);
    }
  }
  return out;
}

// Guest details and ad source, sent just before payment. Logged as LEAD so
// every attempt is recorded with its source even when payment happens on
// Balinest's page. (Email/WhatsApp alert to Jayne: next step.)
app.post("/api/lead", (req, res) => {
  const b = req.body || {};
  const lead = {
    villa: clean(b.villa, 20),
    checkin: clean(b.checkin, 10),
    checkout: clean(b.checkout, 10),
    adults: Number(b.adults) || null,
    children: Number(b.children) || 0,
    childAges: Array.isArray(b.childAges) ? b.childAges.slice(0, 10).map((a) => Number(a) || 0) : [],
    total: Number(b.total) || null,
    currency: clean(b.currency, 5),
    firstName: clean(b.firstName, 80),
    lastName: clean(b.lastName, 80),
    email: clean(b.email, 160),
    whatsapp: clean(b.whatsapp, 40),
    occasion: clean(b.occasion, 300),
    mode: clean(b.mode, 20),
    tracking: cleanTracking(b.tracking),
  };
  if (!lead.villa || !lead.checkin || (!lead.email && !lead.whatsapp)) {
    return res.status(400).json({ error: "missing_details" });
  }
  console.log("LEAD", JSON.stringify(lead));
  res.json({ ok: true });
});

// Airport transfer with Pak Nyoman, asked for after a booking is confirmed.
app.post("/api/transfer", (req, res) => {
  const b = req.body || {};
  const t = {
    confirmationCode: clean(b.confirmationCode, 40),
    want: b.want === true,
    flight: clean(b.flight, 20),
    landing: clean(b.landing, 30),
    bags: Number(b.bags) || 0,
    boards: Number(b.boards) || 0,
    guests: Number(b.guests) || null,
    cars: Number(b.cars) || null,
    contact: clean(b.contact, 160),
  };
  console.log("TRANSFER", JSON.stringify(t));
  res.json({ ok: true });
});

// What the Booking Engine key can see. No secrets or account numbers returned.
async function bookingEngineStatus() {
  const out = { tokenOk: false, listings: [], paymentProviders: {} };
  await getToken();
  out.tokenOk = true;

  const listings = await guesty("/api/listings?limit=50");
  const rows = listings.data?.results || (Array.isArray(listings.data) ? listings.data : []);
  out.listings = rows.map((r) => ({ id: r._id, nickname: r.nickname || null, title: r.title || null }));

  const ids = new Set([...out.listings.map((l) => l.id), ...VILLAS.map((v) => v.listingId)]);
  for (const id of ids) {
    const p = await guesty(`/api/listings/${id}/payment-provider`);
    out.paymentProviders[id] = p.ok
      ? {
          providerType: p.data?.providerType || null,
          processor: p.data?.paymentProcessorName || null,
          status: p.data?.status || null,
        }
      : { error: p.data?.error?.code || `HTTP_${p.status}` };
  }
  return out;
}

app.get("/api/status", async (req, res) => {
  try {
    res.json(await bookingEngineStatus());
  } catch (err) {
    res.status(502).json({ tokenOk: false, error: err.message.slice(0, 200) });
  }
});

// Plain email through Resend (from mail.oasisuluwatu.com), for internal alerts.
async function sendEmail({ to, subject, text }) {
  if (!process.env.RESEND_API_KEY) return;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Oasis website <bookings@mail.oasisuluwatu.com>", to, subject, text }),
  });
  console.log("EMAIL", r.status, subject.slice(0, 80));
}

// Instagram DM assistant (@oasisuluwatu, @daysatjati). Off until IG_ASSISTANT=on.
require("./ig-assistant")(app, { VILLAS, quoteVilla, getListing: getListingData, sendEmail });

// ---------------------------------------------------------------------------
// 5. BOOKING PAGE
// ---------------------------------------------------------------------------

// The page itself is never cached, so a new deploy shows at once. Its CSS and
// JS are linked with a ?v= version, so they can be cached and still update.
const BUILD = (process.env.RENDER_GIT_COMMIT || String(Date.now())).slice(0, 8);
const fs = require("fs");
const pageHtml = () =>
  fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8").replace(/__BUILD__/g, BUILD);
function sendPage(req, res) {
  res.set("Cache-Control", "no-cache");
  res.type("html").send(pageHtml());
}
app.get(["/", "/index.html"], sendPage);
app.use(
  express.static(path.join(__dirname, "public"), {
    index: false,
    setHeaders: (res, file) => {
      if (/bar\.js$/.test(file)) { res.setHeader("Cache-Control", "public, max-age=600"); res.setHeader("Access-Control-Allow-Origin", "*"); return; }
      res.setHeader("Cache-Control", /\.(ttf|otf)$/.test(file) ? "public, max-age=2592000" : "public, max-age=31536000, immutable");
    },
  })
);
app.get("*", sendPage);

// ---------------------------------------------------------------------------
// 6. START
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Oasis booking service running on :${PORT}`);
  // No Guesty call at start-up: Guesty only issues a few tokens a day, and
  // every deploy or restart would use one. The token is fetched on the first
  // search instead. /api/status still shows the set-up on demand.
});
