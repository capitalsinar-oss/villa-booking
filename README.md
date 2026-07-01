# Villa Booking Search Service

Backend for Anwa / Oasis Villas. Wix (and later ManyChat / WhatsApp) call this
service; it checks Guesty availability + pricing across your villas and returns
only the available ones. Guesty still handles booking + payment.

Currently live: **Villa Kapuk**, **Villa Palem**.
Add Ceylon (once Balinest includes it) and Jati (once live) by uncommenting them
in `server.js` section 1.

---

## PART A — Deploy to Render

### 1. Put this code on GitHub
- Create a new **private** repo (e.g. `villa-search`).
- Upload `server.js`, `package.json`, `README.md`.

### 2. Create the Render service
- Render dashboard → **New** → **Web Service** → connect the repo.
- Settings:
  - **Runtime:** Node
  - **Build command:** `npm install`
  - **Start command:** `npm start`
  - **Instance type:** Free is fine to start.

### 3. Add your secrets (critical)
In the Render service → **Environment** → add two variables:

| Key | Value |
|-----|-------|
| `GUESTY_CLIENT_ID` | your Booking Engine API client ID |
| `GUESTY_CLIENT_SECRET` | your Booking Engine API client secret |

**Never** put these in the code or GitHub. Render injects them securely.

### 4. Set your Wix domain for CORS
In `server.js` section 1, edit `ALLOWED_ORIGINS` to your real Wix domain(s),
then push the change. This stops other websites from using your service.

### 5. Deploy & test
Render gives you a URL like `https://villa-search.onrender.com`.

- Health check — open in browser:
  `https://villa-search.onrender.com/`
  → should show `{"status":"ok","villas":["Villa Kapuk","Villa Palem"]}`

- Live search — open in browser:
  `https://villa-search.onrender.com/search?checkin=2026-11-10&checkout=2026-11-14&guests=4`
  → should return Kapuk + Palem with prices.

If search returns prices, the backend is done.

> Note: Render's free tier sleeps after inactivity, so the first request after
> a quiet period takes ~30s to wake. Fine for testing; upgrade to paid ($7/mo)
> for instant response once live.

---

## PART B — Connect Wix (Velo)

### 1. Turn on Dev Mode
Wix editor → top bar → toggle **Dev Mode** on. A code panel appears.

### 2. Add page elements
On your booking page, add:
- Two **Date Pickers** — IDs `#checkIn` and `#checkOut`
- A **Dropdown** or number input for guests — ID `#guests`
- A **Button** — ID `#searchBtn`
- A **Repeater** — ID `#resultsRepeater`, containing:
  - a text element `#villaName`
  - a text element `#villaPrice`
  - a button `#bookBtn`
- A text element `#statusMsg` for "no villas available" etc.

### 3. Smoke test first (confirms Velo can reach Render)
Paste this in the page code, preview, click the button, check the browser
console. If it logs data, outbound fetch works on your plan.

```javascript
import { fetch } from 'wix-fetch';

$w.onReady(function () {
  $w('#searchBtn').onClick(async () => {
    const r = await fetch('https://villa-search.onrender.com/', { method: 'get' });
    const data = await r.json();
    console.log('Smoke test:', data);
  });
});
```

### 4. Real search code
Replace the smoke test with this once it works:

```javascript
import { fetch } from 'wix-fetch';

const SERVICE = 'https://villa-search.onrender.com'; // your Render URL

$w.onReady(function () {
  $w('#resultsRepeater').data = []; // start empty

  $w('#searchBtn').onClick(async () => {
    const checkin  = formatDate($w('#checkIn').value);
    const checkout = formatDate($w('#checkOut').value);
    const guests   = Number($w('#guests').value) || 2;

    if (!checkin || !checkout) {
      $w('#statusMsg').text = 'Please choose both dates.';
      $w('#statusMsg').show();
      return;
    }

    $w('#statusMsg').text = 'Searching...';
    $w('#statusMsg').show();

    try {
      const url = `${SERVICE}/search?checkin=${checkin}&checkout=${checkout}&guests=${guests}`;
      const res = await fetch(url, { method: 'get' });
      const data = await res.json();

      if (!data.villas || data.villas.length === 0) {
        $w('#resultsRepeater').data = [];
        $w('#statusMsg').text = 'No villas available for those dates.';
        $w('#statusMsg').show();
        return;
      }

      $w('#statusMsg').hide();

      // Repeater needs a unique _id per row
      const rows = data.villas.map(v => ({
        _id: v.key,
        name: v.name,
        priceUSD: v.totalUSD,
        nights: v.nights,
        bookingUrl: v.bookingUrl,
      }));

      $w('#resultsRepeater').data = rows;

      $w('#resultsRepeater').forEachItem(($item, itemData) => {
        $item('#villaName').text = itemData.name;
        $item('#villaPrice').text =
          `$${Math.round(itemData.priceUSD).toLocaleString()} total · ${itemData.nights} nights`;
        $item('#bookBtn').link = itemData.bookingUrl;
        $item('#bookBtn').target = '_blank';
      });

    } catch (err) {
      console.error(err);
      $w('#statusMsg').text = 'Something went wrong. Please try again.';
      $w('#statusMsg').show();
    }
  });
});

// Wix date pickers return a Date object; Guesty wants YYYY-MM-DD
function formatDate(d) {
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
```

### 5. Add tracking (the ads win)
On `#bookBtn` click, also fire your Meta pixel + GA4 event so you capture the
funnel on your own domain before the guest hands off to Guesty. (We'll wire the
exact pixel calls once the search itself is working.)

---

## Adding villas later
In `server.js` section 1, uncomment Ceylon / add Jati with its listing ID and
booking URL, then push to GitHub — Render redeploys automatically. Nothing in
Wix needs to change; new villas appear in results automatically.
