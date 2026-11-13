# Oasis Uluwatu — direct booking

Booking page and API for Oasis Uluwatu, on top of Balinest's Guesty
Booking Engine (BE) API. Hosted on Render (`villa-booking`), to be served at
`book.oasisuluwatu.com`.

## What it does

Design v3 (Nov 2026): slim booking bar on desktop, docked button and full-screen sheet on phones; four villa cards (Palem and Kapuk bookable live; Jati and Ceylon link to WhatsApp until they are in the Booking Engine); Airbnb-style price details; deep links `?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&adults=4&children=2&villa=forest|jati|ceylon|all` (or `from=jati`).


1. **Dates & guests** → `GET /api/search` asks Guesty for a live quote per villa.
2. **Results** → Palem, then Kapuk (unavailable villas show as "Not available").
3. **Villa & price** → the quote's price lines, total and cancellation policy.
4. **Details & payment** → guest details; the secure card field is added once
   the payment provider is confirmed (Guesty Pay or Stripe). Until then the
   pay button is disabled.
5. **Confirmed** → `POST /api/book` creates an instant reservation from the quote.

`GET /api/status` (and a `BE_STATUS` line in the Render logs at start-up)
shows which listings the BE key can see and each listing's payment provider.
No secrets are returned.

## Villas

Set in `server.js` (`VILLAS`). Jati is added once Balinest includes it in the
BE API and we have its listing ID. Ceylon is never shown on this page.

## Environment variables (Render → villa-booking → Environment)

| Key | What |
|-----|------|
| `GUESTY_CLIENT_ID` | Booking Engine API client ID |
| `GUESTY_CLIENT_SECRET` | Booking Engine API client secret |
| `STRIPE_PUBLISHABLE_KEY` | Balinest's Stripe publishable key (`pk_live_…`). Public by design. While it is empty, guests fill in their details on our page, the lead is logged with its ad source (`LEAD` in the logs), and payment opens on Balinest's own checkout. Once set, card, Apple Pay and Google Pay are taken on our page and the booking is made through `/api/book`. |

## Tracking

The page loads the Meta pixel (OASIS PIXEL) and keeps the visitor's UTM tags,
`fbclid` and `gclid` for the whole visit. It fires Search, ViewContent and
InitiateCheckout; Purchase (with the server-side Conversions API) is added
with the payment step.

## Still to do

- Payment field (Guesty Pay SDK or Stripe) and Purchase conversion.
- Meta Conversions API, GA4 / Google Ads conversion, booking alert to Jayne.
- Jati, with `?from=jati` putting Jati first.
- Custom domain `book.oasisuluwatu.com` (DNS is on Wix).
- Render free plan sleeps when idle (first load ~30s); move to Starter before launch.
