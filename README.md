# Oasis Uluwatu — direct booking

Booking page and API for Oasis Uluwatu, on top of Balinest's Guesty
Booking Engine (BE) API. Hosted on Render (`villa-booking`), to be served at
`book.oasisuluwatu.com`.

## What it does

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
