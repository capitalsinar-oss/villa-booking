/**
 * Anwa / Oasis Villas — Booking Search Service
 * -------------------------------------------------
 * One small backend that Wix (and later ManyChat / WhatsApp) calls.
 * It holds the Guesty Booking Engine API credentials, caches the auth
 * token, checks availability + pricing across your villas, and returns
 * a clean list of only the available ones.
 *
 * Guesty still handles the actual booking + payment — this service is
 * search + display only.
 */

const express = require("express");
const app = express();

// ---------------------------------------------------------------------------
// 1. CONFIG
// ---------------------------------------------------------------------------

// Credentials come from environment variables set in the Render dashboard —
// NEVER hard-code them in this file.
const CLIENT_ID = process.env.GUESTY_CLIENT_ID;
const CLIENT_SECRET = process.env.GUESTY_CLIENT_SECRET;

// Your villas. Add Ceylon once Balinest includes it; add Jati when it's live.
// `order` controls display order in search results.
const VILLAS = [
  {
    key: "kapuk",
    name: "Villa Kapuk",
    listingId: "69b67cfa3e48290011c5d1b2",
    bookingUrl: "https://book.balinestvillas.com/en/properties/69b67cfa3e48290011c5d1b2",
    order: 1,
  },
  {
    key: "palem",
    name: "Villa Palem",
    listingId: "6a1330f6ee884400143bd533",
    bookingUrl: "https://book.balinestvillas.com/en/properties/6a1330f6ee884400143bd533",
    order: 2,
  },
  // --- Not yet enabled — uncomment when ready ---
  // {
  //   key: "ceylon",
  //   name: "Ceylon Residence",
  //   listingId: "69cf268b4d255a0013ac88d2",
  //   bookingUrl: "https://book.balinestvillas.com/en/properties/69cf268b4d255a0013ac88d2",
  //   order: 3,
  // },
  // {
  //   key: "jati",
  //   name: "Villa Jati",
  //   listingId: "PUT_JATI_ID_HERE",
  //   bookingUrl: "https://book.balinestvillas.com/en/properties/PUT_JATI_ID_HERE",
  //   order: 4,
  // },
];

// Which website(s) are allowed to call this service (CORS).
// Add your live Wix domain here. Keep localhost for testing.
const ALLOWED_ORIGINS = [
  "https://www.oasisvillasbali.com", // <-- replace with your real Wix domain
  "https://oasisvillasbali.com",
  "http://localhost:3000",
];

const GUESTY_BASE = "https://booking.guesty.com";

// ---------------------------------------------------------------------------
// 2. TOKEN CACHING
// ---------------------------------------------------------------------------
// Guesty tokens last 24h and can only be renewed a few times per day, so we
// cache the token in memory and only re-fetch when it's close to expiring.

let cachedToken = null;
let tokenExpiresAt = 0; // epoch ms

async function getToken() {
  const now = Date.now();
  // Re-use the cached token until 5 minutes before it expires.
  if (cachedToken && now < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedToken;
  }

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
    throw new Error(`Token fetch failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // expires_in is in seconds
  tokenExpiresAt = now + (data.expires_in || 86400) * 1000;
  return cachedToken;
}

// ---------------------------------------------------------------------------
// 3. QUOTE A SINGLE VILLA
// ---------------------------------------------------------------------------
// Returns { available: true, ...pricing } or { available: false, reason }.

async function quoteVilla(villa, checkIn, checkOut, guests, token) {
  const res = await fetch(`${GUESTY_BASE}/api/reservations/quotes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      checkInDateLocalized: checkIn,
      checkOutDateLocalized: checkOut,
      listingId: villa.listingId,
      guestsCount: guests,
    }),
  });

  const data = await res.json();

  // Not available for these dates (blocked / min-nights / etc.), or no access.
  if (!res.ok || data.error) {
    return {
      key: villa.key,
      name: villa.name,
      available: false,
      reason: data.error?.code || `HTTP_${res.status}`,
    };
  }

  // Pull pricing out of the first rate plan (Standard).
  const plan = data?.rates?.ratePlans?.[0];
  const money = plan?.ratePlan?.money;

  if (!money) {
    return { key: villa.key, name: villa.name, available: false, reason: "NO_RATE" };
  }

  return {
    key: villa.key,
    name: villa.name,
    order: villa.order,
    available: true,
    quoteId: data._id,
    currency: money.currency, // "IDR"
    totalIDR: money.hostPayout, // total in IDR
    totalUSD: money.hostPayoutUsd, // Guesty's converted USD figure
    nights: plan?.ratePlan?.days?.length || null,
    ratePlanName: plan?.ratePlan?.name || "Standard",
    cancellationPolicy: plan?.ratePlan?.cancellationPolicy || null,
    bookingUrl: `${villa.bookingUrl}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`,
  };
}

// ---------------------------------------------------------------------------
// 4. CORS
// ---------------------------------------------------------------------------

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ---------------------------------------------------------------------------
// 5. ROUTES
// ---------------------------------------------------------------------------

// Health check — visit this in a browser to confirm the service is up.
app.get("/", (req, res) => {
  res.json({ status: "ok", villas: VILLAS.map((v) => v.name) });
});

// The main search endpoint.
// Example: /search?checkin=2026-11-10&checkout=2026-11-14&guests=4
app.get("/search", async (req, res) => {
  const { checkin, checkout, guests } = req.query;

  // --- basic validation ---
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(checkin || "") || !dateRe.test(checkout || "")) {
    return res.status(400).json({ error: "checkin and checkout must be YYYY-MM-DD" });
  }
  if (new Date(checkout) <= new Date(checkin)) {
    return res.status(400).json({ error: "checkout must be after checkin" });
  }
  const guestCount = parseInt(guests, 10) || 2;

  try {
    const token = await getToken();

    // Quote all villas in parallel.
    const results = await Promise.all(
      VILLAS.map((v) => quoteVilla(v, checkin, checkout, guestCount, token))
    );

    const available = results
      .filter((r) => r.available)
      .sort((a, b) => a.order - b.order);

    res.json({
      checkin,
      checkout,
      guests: guestCount,
      availableCount: available.length,
      villas: available,
      // Included for debugging; remove if you don't want unavailable reasons public.
      unavailable: results.filter((r) => !r.available),
    });
  } catch (err) {
    console.error("Search error:", err.message);
    res.status(500).json({ error: "search_failed" });
  }
});

// ---------------------------------------------------------------------------
// 6. START
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Villa search service running on :${PORT}`));
