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
 */

const path = require("path");
const express = require("express");

const app = express();
app.use(express.json({ limit: "50kb" }));

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

app.post("/api/book", async (req, res) => {
  const { quoteId, ratePlanId, ccToken, guest, policy, tracking } = req.body || {};
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


// Public settings for the page. The Stripe publishable key is public by
// design; when it is missing the page hands payment to Balinest's checkout.
app.get("/api/config", (req, res) => {
  res.json({
    stripePk: process.env.STRIPE_PUBLISHABLE_KEY || null,
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
