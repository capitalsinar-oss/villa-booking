/* Oasis direct booking. Plain JS, no build step. */
(function () {
  "use strict";

  // ---------- villa content (copy from the live listings; prices come live from Guesty) ----------
  function wix(id, w, h) {
    return "https://static.wixstatic.com/media/0bd874_" + id + "~mv2.jpg/v1/fill/w_" + w + ",h_" + h + ",al_c,q_85,enc_auto/0bd874_" + id + "~mv2.jpg";
  }
  function wixSet(ids) { return ids.map(function (id) { return wix(id, 1400, 1000); }); }
  // Ceylon's photos are not in the Oasis Wix library yet: Airbnb listing photos until they are.
  function abnb(id) { return "https://a0.muscache.com/im/pictures/hosting/Hosting-1655454682482668727/original/" + id + ".jpeg?im_w=1200"; }

  var WA = "6281236676828";
  var VILLAS = {
    palem: {
      name: "Oasis Palem", dot: "forest", eyebrow: "Forest villa · Pecatu, Uluwatu", bookable: true, max: 6,
      sub: "A floating house in the forest",
      body: "Wake up inside a forest. An architect-designed house among the old teak trees of Pecatu, by Patisandhika Sidarta, the architect behind Potato Head and Katamama. More than 20 of the original trees were kept while it was built, and the Green Sukabumi pool sits in a sheltered courtyard.",
      facts: [3, 3, 6], link: "https://www.oasisuluwatu.com/forest-villas",
      photos: wixSet(["2a4cf88e2d9046a0bb5918ac6b9fab66", "51bedaf99c134ca8a28eb2fa969ae181", "75a7a42f056244c29a5ce9913b635cd5", "911172872b2848adbaa106be211c89c4", "7f11c63379064978a12481a21eea8a67"])
    },
    kapuk: {
      name: "Oasis Kapuk", dot: "forest", eyebrow: "Forest villa · Pecatu, Uluwatu", bookable: true, max: 6,
      sub: "Named for Uluwatu’s cotton tree",
      body: "Palem’s twin, by the same architect and among the same old teak trees. A private Green Sukabumi pool at the heart of a sheltered courtyard, linen by Madeem. Considered architecture, your home for the week.",
      facts: [3, 3, 6], link: "https://www.oasisuluwatu.com/forest-villas",
      photos: wixSet(["568a684ab4514aba98c6b6f02dae6370", "416afe75994b496485192590d6e85c3f", "f022ec0e63c34e69a330d3faec85487f", "18e44769d4ce488a914733fa8c6abcb0", "9261c28f97984bf2a40d98b76d0c77ed"])
    },
    jati: {
      name: "Oasis Jati", dot: "jati", eyebrow: "A different house · Pecatu, Uluwatu", bookable: false, max: 6,
      sub: "A house for slower days",
      body: "A house shaped almost entirely from solid teak, at the end of a quiet Pecatu lane. Named for the twenty teak trees that stood on the plot, lifted through construction and replanted into the finished home. Designed by Sidarta & Sandjaja, interiors by Michelle Arderia of BUD Studio.",
      facts: [3, 3, 6], link: "https://www.oasisuluwatu.com/daysatjati",
      photos: wixSet(["45e262c2aa554dae95063c207e20e539", "4c137e0ddcf9490fad2946d84824e935", "d6478c6a13e8488ba029cdd282036efe", "663135cd6dcc42ce8ebb6af7f867df56", "c45897d7e7cc4fcd983e0da65daa5f8b"])
    },
    ceylon: {
      name: "Ceylon Residences", dot: "ceylon", eyebrow: "Unit 4 · Suluban, Uluwatu", bookable: false, max: 4,
      sub: "Ocean view, sauna, ice bath",
      body: "Two king bedrooms, a private pool among the greenery, and your own rooftop with a sauna, ice bath and ocean view, where the Uluwatu sunset glows pink and gold each evening.",
      where: "Ceylon is in <b>Suluban, Uluwatu</b>, not at Oasis in Pecatu. A separate residence with its own team.",
      facts: [2, "2.5", 4], link: "https://www.airbnb.com/rooms/1655454682482668727",
      photos: ["3c84d0c6-0de5-4298-9163-f89ee4f45799", "05189a7e-6a7b-4be7-8ef5-c10b58ae98eb", "d83e3a4a-ee87-4d24-ac6e-b839c89abf2e", "507c5137-4b25-43a4-b1e6-f1c7d5b8fe35", "62d2377e-ef94-42c4-b3c5-96c376077095"].map(abnb)
    }
  };
  var ORDER = {
    forest: ["palem", "kapuk", "jati", "ceylon"],
    all: ["palem", "kapuk", "jati", "ceylon"],
    jati: ["jati", "palem", "kapuk", "ceylon"],
    ceylon: ["ceylon", "palem", "kapuk", "jati"]
  };
  var VILLA_LABEL = { forest: "Forest villas", jati: "Oasis Jati", ceylon: "Ceylon Residences", all: "All villas" };

  var ICON = {
    bed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 19V6M3 14h18v5M21 14v-1a3 3 0 0 0-3-3h-8v4"/><circle cx="6.5" cy="11" r="1.8"/></svg>',
    bath: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-2zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2"/></svg>',
    guest: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.3c2.9.4 5 2.8 5 5.7"/></svg>',
    pool: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 16c2 0 2 1.5 4.5 1.5S9 16 11 16s2.5 1.5 4.5 1.5S18 16 22 16M2 20c2 0 2 1.5 4.5 1.5S9 20 11 20s2.5 1.5 4.5 1.5S18 20 22 20M8 13V5a2 2 0 0 1 4 0M16 13V5a2 2 0 0 0-4 0M8 8h8"/></svg>',
    pin: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" style="flex:none"><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.4"/></svg>',
    left: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'
  };

  // ---------- state ----------
  var state = {
    search: null,          // { checkin, checkout, villa }
    adults: 2, children: 0, ages: [],
    quotes: {},            // key -> quote from /api/search
    villa: null,           // key of the chosen villa
    config: { stripePk: null, checkoutBase: "https://book.balinestvillas.com/en/properties" },
    booking: null
  };

  // ---------- helpers ----------
  function $(s, root) { return (root || document).querySelector(s); }
  function $all(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function idr(n, cur) {
    if (n == null) return "";
    return (cur || "IDR") + " " + Math.round(n).toLocaleString("en-US");
  }
  function d(iso) { return new Date(iso + "T00:00:00"); }
  function nightsOf(s) { return Math.round((d(s.checkout) - d(s.checkin)) / 86400000); }
  function fmt(iso, opts) { return d(iso).toLocaleDateString("en-GB", opts); }
  function shortRange(s) {
    var a = d(s.checkin), b = d(s.checkout);
    var sameMonth = a.getMonth() === b.getMonth();
    return a.getDate() + (sameMonth ? "" : " " + fmt(s.checkin, { month: "short" })) + " – " + b.getDate() + " " + fmt(s.checkout, { month: "short" });
  }
  function longRange(s) {
    return fmt(s.checkin, { weekday: "short" }) + " " + d(s.checkin).getDate() + " – " + fmt(s.checkout, { weekday: "short" }) + " " + d(s.checkout).getDate() + " " + fmt(s.checkout, { month: "long" });
  }
  function guestsText() {
    var t = state.adults + (state.adults === 1 ? " adult" : " adults");
    if (state.children) t += ", " + state.children + (state.children === 1 ? " child" : " children");
    return t;
  }
  function totalGuests() { return state.adults + state.children; }
  function iso(dt) { var z = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); }

  // ---------- tracking: keep the ad source for the whole visit ----------
  var TRACK_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "from"];
  function store(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  (function captureSource() {
    var p = new URLSearchParams(location.search), saved = {};
    try { saved = JSON.parse(load("oasis_src") || "{}"); } catch (e) {}
    TRACK_KEYS.forEach(function (k) { if (p.get(k)) saved[k] = p.get(k).slice(0, 200); });
    if (!saved.landing) { saved.landing = location.href.slice(0, 500); saved.referrer = document.referrer.slice(0, 300); }
    store("oasis_src", JSON.stringify(saved));
  })();
  function tracking() { try { return JSON.parse(load("oasis_src") || "{}"); } catch (e) { return {}; } }
  // Every funnel event goes to Meta (fbq) and to GTM's dataLayer under its GA4 name.
  var GA4 = { Search: "search", ViewContent: "view_item", InitiateCheckout: "begin_checkout", Lead: "generate_lead", Purchase: "purchase" };
  function pixel(ev, data) {
    data = data || {};
    try { if (window.fbq) window.fbq("track", ev, data); } catch (e) {}
    try {
      window.dataLayer = window.dataLayer || [];
      var ids = data.content_ids || [];
      window.dataLayer.push({ event: GA4[ev] || ev, booking: {
        value: data.value, currency: data.currency, villa: ids.join(","),
        checkin: data.checkin_date, checkout: data.checkout_date,
        adults: data.num_adults, children: data.num_children
      } });
    } catch (e) {}
  }

  // ---------- views ----------
  var VIEWS = ["start", "loading", "results", "villa", "details", "confirmed", "transfer"];
  var STEP = { results: "results", villa: "villa", details: "details", confirmed: "confirmed", transfer: "confirmed" };
  function show(v) {
    VIEWS.forEach(function (n) { $("#view-" + n).hidden = n !== v; });
    var steps = $("#steps");
    steps.hidden = !STEP[v];
    $all("li", steps).forEach(function (li) {
      if (li.dataset.step === STEP[v]) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    $("#start-dock").hidden = !(v === "start" || v === "results");
    $("#bar").hidden = v === "confirmed" || v === "transfer" || v === "details";
    window.scrollTo(0, 0);
  }
  document.addEventListener("click", function (e) {
    var go = e.target.closest("[data-go]");
    if (go) { e.preventDefault(); var v = go.getAttribute("data-go"); if (v === "details") openDetails(); else show(v); }
  });

  // ---------- guests: one count, many steppers ----------
  function setCount(kind, delta) {
    var v = state[kind] + delta;
    if (kind === "adults") v = Math.max(1, Math.min(12, v)); else v = Math.max(0, Math.min(8, v));
    state[kind] = v;
    if (kind === "children") {
      while (state.ages.length < v) state.ages.push("");
      state.ages.length = v;
    }
    renderCounts();
  }
  function renderCounts() {
    $all('[data-count="adults"]').forEach(function (o) { o.textContent = state.adults; });
    $all('[data-count="children"]').forEach(function (o) { o.textContent = state.children; });
    $all('[data-step="adults:-1"]').forEach(function (b) { b.disabled = state.adults <= 1; });
    $all('[data-step="children:-1"]').forEach(function (b) { b.disabled = state.children <= 0; });
    $all("[data-guests-label]").forEach(function (s) { s.textContent = guestsText(); });
    renderAges();
    renderPartyNote();
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-step]");
    if (!b) return;
    var parts = b.getAttribute("data-step").split(":");
    setCount(parts[0], Number(parts[1]));
  });

  // guests pop-over in the desktop bar
  var gBtn = $("#guests-btn"), gPop = $("#guests-pop");
  function togglePop(open) { gPop.hidden = !open; gBtn.setAttribute("aria-expanded", open ? "true" : "false"); }
  gBtn.addEventListener("click", function () { togglePop(gPop.hidden); });
  $("[data-close-pop]").addEventListener("click", function () { togglePop(false); gBtn.focus(); });
  document.addEventListener("click", function (e) { if (!gPop.hidden && !e.target.closest(".guests")) togglePop(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { togglePop(false); closeSheet(); } });

  // ---------- date inputs ----------
  function setupDates(form) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    form.checkin.min = iso(today); form.checkout.min = iso(tomorrow);
    form.checkin.addEventListener("change", function () {
      if (!form.checkin.value) return;
      var next = d(form.checkin.value); next.setDate(next.getDate() + 1);
      form.checkout.min = iso(next);
      if (!form.checkout.value || form.checkout.value <= form.checkin.value) form.checkout.value = iso(next);
    });
  }
  var bar = $("#bar"), sheetForm = $("#sheet-form");
  setupDates(bar); setupDates(sheetForm);

  function readForm(form, villaValue) {
    return { checkin: form.checkin.value, checkout: form.checkout.value, villa: villaValue };
  }
  function checkDates(s) {
    if (!s.checkin || !s.checkout) return "Please choose both dates.";
    if (s.checkout <= s.checkin) return "Your leaving date needs to be after your arrival.";
    return null;
  }
  function fillForms(s) {
    [bar, sheetForm].forEach(function (f) { f.checkin.value = s.checkin; f.checkout.value = s.checkout; });
    bar.villa.value = s.villa;
    $all('input[name="villa"]', sheetForm).forEach(function (r) { r.checked = r.value === s.villa; });
  }

  bar.addEventListener("submit", function (e) {
    e.preventDefault();
    var s = readForm(bar, bar.villa.value), err = checkDates(s), box = $("#bar-error");
    box.hidden = !err; box.textContent = err || "";
    if (!err) runSearch(s);
  });

  // ---------- phone sheet ----------
  var sheet = $("#sheet"), lastFocus = null;
  function openSheet() {
    lastFocus = document.activeElement;
    if (state.search) fillForms(state.search);
    sheet.hidden = false; document.body.style.overflow = "hidden";
    $("[data-close-sheet]").focus();
  }
  function closeSheet() {
    if (sheet.hidden) return;
    sheet.hidden = true; document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-open-sheet]")) { e.preventDefault(); openSheet(); }
    if (e.target.closest("[data-close-sheet]")) { e.preventDefault(); closeSheet(); }
  });
  $("#sheet-clear").addEventListener("click", function () {
    sheetForm.checkin.value = ""; sheetForm.checkout.value = "";
    state.adults = 2; state.children = 0; state.ages = []; renderCounts();
  });
  sheetForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = ($('input[name="villa"]:checked', sheetForm) || {}).value || "forest";
    var s = readForm(sheetForm, v), err = checkDates(s), box = $("#sheet-error");
    box.hidden = !err; box.textContent = err || "";
    if (!err) { closeSheet(); runSearch(s); }
  });

  var menuBtn = $("#menu-btn"), mNav = $("#m-nav");
  menuBtn.addEventListener("click", function () {
    var open = mNav.hidden; mNav.hidden = !open; menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // ---------- search ----------
  function runSearch(s) {
    state.search = s;
    fillForms(s);
    show("loading");
    var q = new URLSearchParams({ checkin: s.checkin, checkout: s.checkout, guests: String(totalGuests()) });
    history.replaceState(null, "", "?" + new URLSearchParams(Object.assign({}, paramsToKeep(), { checkin: s.checkin, checkout: s.checkout, adults: state.adults, children: state.children, villa: s.villa })).toString());
    fetch("/api/search?" + q.toString())
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.j.error || "search_failed");
        state.quotes = {};
        (res.j.villas || []).forEach(function (v) { state.quotes[v.key] = v; });
        renderResults();
        show("results");
        pixel("Search", { checkin_date: s.checkin, checkout_date: s.checkout, num_adults: state.adults, num_children: state.children });
      })
      .catch(function () {
        show("start");
        var box = window.matchMedia("(max-width: 820px)").matches ? null : $("#bar-error");
        var msg = "We couldn't check the houses just now. Please try again, or WhatsApp us.";
        if (box) { box.textContent = msg; box.hidden = false; } else { openSheet(); $("#sheet-error").textContent = msg; $("#sheet-error").hidden = false; }
      });
  }
  function paramsToKeep() {
    var p = new URLSearchParams(location.search), out = {};
    TRACK_KEYS.forEach(function (k) { if (p.get(k)) out[k] = p.get(k); });
    return out;
  }

  // ---------- rendering pieces ----------
  function factsHtml(f) {
    function one(ic, n, t) { return '<div class="fact"><span class="n">' + ICON[ic] + (n === "" ? "" : esc(n)) + '</span><span class="t">' + t + "</span></div>"; }
    return '<div class="facts">' + one("bed", f[0], "Bedrooms") + one("bath", f[1], "Bathrooms") + one("guest", f[2], "Guests") + one("pool", "", "Private pool") + "</div>";
  }
  function photosHtml(v, cls) {
    var imgs = v.photos.map(function (src, i) {
      return '<img src="' + src + '" alt="' + esc(v.name) + ", photo " + (i + 1) + ' of 5" ' + (i ? 'loading="lazy"' : "") + ">";
    }).join("");
    return '<div class="photos ' + (cls || "") + '" role="group" aria-label="' + esc(v.name) + ' photos">' +
      '<div class="track">' + imgs + "</div>" +
      '<button type="button" class="arrow l" aria-label="Previous photo">' + ICON.left + "</button>" +
      '<button type="button" class="arrow r" aria-label="Next photo">' + ICON.right + "</button>" +
      '<div class="dots" aria-hidden="true">' + v.photos.map(function (_, i) { return '<span class="' + (i ? "" : "on") + '"></span>'; }).join("") + "</div>" +
      '<a class="all-photos" href="' + v.link + '" target="_blank" rel="noopener">See all photos</a></div>';
  }
  function wireCarousels(root) {
    $all(".photos", root).forEach(function (p) {
      var track = $(".track", p), dots = $all(".dots span", p);
      function idx() { return Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); }
      function go(i) { track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" }); }
      $(".arrow.l", p).addEventListener("click", function () { go(Math.max(0, idx() - 1)); });
      $(".arrow.r", p).addEventListener("click", function () { go(Math.min(dots.length - 1, idx() + 1)); });
      track.addEventListener("scroll", function () { var i = idx(); dots.forEach(function (dd, j) { dd.className = j === i ? "on" : ""; }); }, { passive: true });
    });
  }
  function askLink(key) {
    var s = state.search, v = VILLAS[key];
    var text = "Hi Oasis, are " + v.name + "'s dates " + shortRange(s) + " " + d(s.checkout).getFullYear() + " free? We are " + guestsText() + ".";
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(text);
  }

  function cardHtml(key) {
    var v = VILLAS[key], q = state.quotes[key], s = state.search, n = nightsOf(s);
    var foot;
    if (!v.bookable) {
      foot = '<div><p class="unavail">Online booking for ' + esc(v.name) + ' opens soon.</p><p class="per">Message us and we’ll check your dates.</p></div>' +
        '<a class="btn btn-line" href="' + askLink(key) + '" target="_blank" rel="noopener">Ask about these dates</a>';
    } else if (totalGuests() > v.max) {
      foot = '<div><p class="unavail">Sleeps up to ' + v.max + ' guests.</p><p class="per">Try both forest villas side by side, or message us.</p></div>' +
        '<a class="btn btn-line" href="' + askLink(key) + '" target="_blank" rel="noopener">Ask us</a>';
    } else if (q && q.available) {
      foot = '<div><p class="price">' + idr(q.total, q.currency) + '</p><p class="per">' + n + (n === 1 ? " night" : " nights") + " · non-refundable</p></div>" +
        '<button type="button" class="btn" data-choose="' + key + '">Choose ' + esc(v.name.replace("Oasis ", "")) + "</button>";
    } else {
      foot = '<div><p class="unavail">Booked for these dates.</p><p class="per">Message us for the nearest free dates.</p></div>' +
        '<a class="btn btn-line" href="' + askLink(key) + '" target="_blank" rel="noopener">Ask about other dates</a>';
    }
    return '<article class="card">' + photosHtml(v) +
      '<div class="info"><p class="eyebrow"><span class="dot ' + v.dot + '"></span>' + esc(v.eyebrow) + "</p>" +
      '<h2 class="vname">' + esc(v.name) + "</h2>" +
      '<p class="vsub">' + esc(v.sub) + "</p>" +
      (v.where ? '<div class="where">' + ICON.pin + "<span>" + v.where + "</span></div>" : "") +
      factsHtml(v.facts) +
      '<p class="body">' + esc(v.body) + "</p>" +
      '<div class="price-row">' + foot + "</div></div></article>";
  }

  function renderResults() {
    var s = state.search, order = ORDER[s.villa] || ORDER.forest;
    var free = ["palem", "kapuk"].filter(function (k) { var q = state.quotes[k]; return q && q.available && totalGuests() <= VILLAS[k].max; });
    var title;
    if (s.villa === "jati") title = "Oasis Jati for your dates";
    else if (s.villa === "ceylon") title = "Ceylon Residences for your dates";
    else if (free.length === 2) title = "Both forest villas are free";
    else if (free.length === 1) title = VILLAS[free[0]].name + " is free for your dates";
    else title = "The forest villas are taken for those dates";
    $("#results-title").textContent = title;
    $("#results-sub").textContent = longRange(s) + " · " + nightsOf(s) + " nights · " + guestsText();
    $("[data-pill-text]").textContent = shortRange(s) + " · " + totalGuests() + " guests · " + VILLA_LABEL[s.villa];
    $("[data-pill-dot]").className = "dot " + (s.villa === "jati" ? "jati" : s.villa === "ceylon" ? "ceylon" : "forest");

    var html = "", forestShown = false;
    order.forEach(function (key, i) {
      var isForest = key === "palem" || key === "kapuk";
      if (i > 0) {
        if (key === "jati") html += '<p class="label muted section-label">' + (s.villa === "ceylon" ? "Also from us" : "Also at Oasis") + "</p>";
        else if (key === "ceylon") html += '<p class="label muted section-label">Also from us, in Suluban</p>';
        else if (isForest && !forestShown && order[0] !== "palem") html += '<p class="label muted section-label">The forest villas, also at Oasis</p>';
      }
      if (isForest) forestShown = true;
      html += cardHtml(key);
    });
    var box = $("#results");
    box.innerHTML = html;
    wireCarousels(box);
    $all("[data-choose]", box).forEach(function (b) { b.addEventListener("click", function () { openVilla(b.getAttribute("data-choose")); }); });
    if (free.length) pixel("ViewContent", { content_ids: free, content_type: "hotel" });
  }

  // ---------- villa + price ----------
  function lineLabel(l, q, n) {
    var t = (l.type || "").toUpperCase();
    if (t === "AF" || /accommodation/i.test(l.title || "")) return n + (n === 1 ? " night" : " nights") + " × " + idr(l.amount / n, q.currency);
    if (t === "AFE" || /platform/i.test(l.title || "")) return "Booking fee";
    return l.title;
  }
  function stayBox() {
    var s = state.search;
    return '<div class="stay"><div><div class="c"><span class="k">Check-in</span><span class="v">' + fmt(s.checkin, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) + "</span></div>" +
      '<div class="c"><span class="k">Checkout</span><span class="v">' + fmt(s.checkout, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) + "</span></div></div>" +
      '<div class="row2"><div class="c"><span class="k">Guests</span><span class="v">' + guestsText() + "</span></div></div></div>";
  }
  function breakdown(q) {
    var n = nightsOf(state.search);
    var rows = (q.lines || []).map(function (l) {
      return "<div><dt>" + esc(lineLabel(l, q, n)) + "</dt><dd>" + idr(l.amount, q.currency) + "</dd></div>";
    }).join("");
    return '<p class="pd-title">Price details</p><dl class="pd">' + rows +
      '<div class="total"><dt>Total (' + esc(q.currency || "IDR") + ")</dt><dd>" + idr(q.total, q.currency) + "</dd></div></dl>";
  }
  function openVilla(key) {
    var v = VILLAS[key], q = state.quotes[key], n = nightsOf(state.search);
    state.villa = key;
    $("#villa-photos").innerHTML = photosHtml(v);
    wireCarousels($("#villa-photos"));
    $("#villa-eyebrow").innerHTML = '<span class="dot ' + v.dot + '"></span>' + esc(v.eyebrow);
    $("#villa-name").textContent = v.name;
    $("#villa-sub").textContent = v.sub;
    $("#villa-facts").innerHTML = factsHtml(v.facts);
    $("#villa-body").textContent = v.body;
    $("#villa-pcard").innerHTML =
      '<div><p class="big">' + idr(q.total, q.currency) + '</p><p class="sub">for ' + n + " nights · non-refundable</p></div>" +
      stayBox() +
      '<button type="button" class="btn btn-block" data-go="details">Continue</button>' +
      '<p class="note-c">You won’t be charged yet</p>' + breakdown(q);
    $("#villa-dock").innerHTML = '<div class="what"><span class="a">' + idr(q.total, q.currency) + '</span><span class="b">' + shortRange(state.search) + " · non-refundable</span></div>" +
      '<button type="button" class="btn" data-go="details">Continue</button>';
    show("villa");
    pixel("ViewContent", { content_ids: [key], content_type: "hotel", value: q.total, currency: q.currency });
  }

  // ---------- details ----------
  function renderAges() {
    var row = $("#ages-row"), box = $("#ages");
    if (!row) return;
    row.hidden = state.children === 0;
    var html = "";
    for (var i = 0; i < state.children; i++) {
      var opts = '<option value="">Age</option>';
      for (var a = 0; a <= 17; a++) opts += '<option value="' + a + '"' + (String(state.ages[i]) === String(a) ? " selected" : "") + ">" + (a === 0 ? "Under 1" : a) + "</option>";
      html += '<label class="age">Child ' + (i + 1) + '<select data-age="' + i + '">' + opts + "</select></label>";
    }
    box.innerHTML = html;
    $all("[data-age]", box).forEach(function (sel) { sel.addEventListener("change", function () { state.ages[Number(sel.dataset.age)] = sel.value; }); });
  }
  function renderPartyNote() {
    var note = $("#party-note");
    if (!note || !state.villa) return;
    var v = VILLAS[state.villa], over = totalGuests() > v.max;
    note.textContent = over ? v.name + " sleeps up to " + v.max + " guests. Please reduce the party, or message us." : "Up to " + v.max + " guests at " + v.name + ".";
    note.style.color = over ? "#8A3B1E" : "";
  }
  function onPage() { return !!state.config.stripePk; }
  function openDetails() {
    var v = VILLAS[state.villa], q = state.quotes[state.villa];
    renderCounts();
    $("#details-pcard").innerHTML =
      '<div class="mini"><div class="ph" style="background-image:url(\'' + v.photos[0] + '\')"></div><div><p class="eyebrow"><span class="dot ' + v.dot + '"></span>' + esc(v.eyebrow.split(" · ")[0]) + '</p><p class="vname">' + esc(v.name) + "</p></div></div>" +
      stayBox() + breakdown(q) + '<p class="small muted">Non-refundable. Charged in ' + esc(q.currency || "IDR") + ".</p>";
    $("#pay-onpage").hidden = !onPage();
    $("#pay-handoff").hidden = onPage();
    $("#pay-btn").textContent = onPage() ? "Confirm and pay " + idr(q.total, q.currency) : "Continue to secure payment";
    if (onPage()) mountStripe(q);
    show("details");
    pixel("InitiateCheckout", { value: q.total, currency: q.currency, content_ids: [state.villa], num_items: 1 });
  }

  // ---------- Stripe (used once Balinest's publishable key is set) ----------
  var stripe = null, card = null, stripeLoading = null;
  function loadStripe() {
    if (window.Stripe) return Promise.resolve();
    if (!stripeLoading) stripeLoading = new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = "https://js.stripe.com/v3/"; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
    return stripeLoading;
  }
  function mountStripe(q) {
    loadStripe().then(function () {
      if (!stripe) stripe = window.Stripe(state.config.stripePk);
      if (!card) {
        var els = stripe.elements({ fonts: [] });
        card = els.create("card", { hidePostalCode: true, style: { base: { fontSize: "16px", color: "#2F3422", fontFamily: "Arial, sans-serif", "::placeholder": { color: "rgba(47,52,34,0.45)" } } } });
        card.mount("#card-el");
        // Apple Pay / Google Pay: Stripe shows its own button only where the device supports it.
        var pr = stripe.paymentRequest({ country: "ID", currency: (q.currency || "IDR").toLowerCase(), total: { label: VILLAS[state.villa].name + ", " + nightsOf(state.search) + " nights", amount: Math.round(q.total) * 100 }, requestPayerName: true, requestPayerEmail: true });
        var prb = els.create("paymentRequestButton", { paymentRequest: pr, style: { paymentRequestButton: { type: "book", theme: "dark", height: "48px" } } });
        pr.canMakePayment().then(function (ok) {
          if (ok) { prb.mount("#wallet-btn"); $("#wallet-or").hidden = false; }
        });
        pr.on("paymentmethod", function (ev) {
          if (!validate(true)) { ev.complete("fail"); return; }
          book(ev.paymentMethod.id).then(function () { ev.complete("success"); }, function () { ev.complete("fail"); });
        });
      }
    }).catch(function () { showError("The secure card field didn't load. Please refresh the page, or WhatsApp us."); });
  }

  // ---------- submit ----------
  var form = $("#details-form");
  function showError(msg) { var b = $("#details-error"); b.textContent = msg; b.hidden = !msg; }
  function validate(walletPath) {
    var v = VILLAS[state.villa];
    if (totalGuests() > v.max) { showError(v.name + " sleeps up to " + v.max + " guests."); return false; }
    for (var i = 0; i < state.children; i++) if (state.ages[i] === "" || state.ages[i] == null) { showError("Please add each child's age."); return false; }
    if (!form.firstName.value.trim() || !form.lastName.value.trim()) { showError("Please add the lead guest's first and last name."); return false; }
    var email = form.email.value.trim(), wa = form.whatsapp.value.trim();
    if (!email && !wa) { showError("Please give us an email or a WhatsApp number."); return false; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError("That email address doesn't look right."); return false; }
    if (!form.agree.checked) { showError("Please tick the box to confirm the booking is non-refundable."); return false; }
    showError("");
    return true;
  }
  function leadPayload(mode) {
    var q = state.quotes[state.villa], s = state.search;
    return {
      villa: state.villa, checkin: s.checkin, checkout: s.checkout,
      adults: state.adults, children: state.children, childAges: state.ages.slice(0, state.children),
      total: q.total, currency: q.currency,
      firstName: form.firstName.value.trim(), lastName: form.lastName.value.trim(),
      email: form.email.value.trim(), whatsapp: form.whatsapp.value.trim(), occasion: form.occasion.value.trim(),
      mode: mode, tracking: tracking()
    };
  }
  function postJSON(url, body) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); });
  }
  function handoffUrl() {
    var q = state.quotes[state.villa], s = state.search;
    var p = new URLSearchParams({ minOccupancy: String(totalGuests()), checkIn: s.checkin, checkOut: s.checkout, adults: String(totalGuests()) });
    return state.config.checkoutBase + "/" + q.listingId + "/checkout?" + p.toString();
  }
  function book(ccToken) {
    var q = state.quotes[state.villa];
    var btn = $("#pay-btn"); btn.disabled = true; btn.textContent = "Confirming…";
    return postJSON("/api/book", {
      quoteId: q.quoteId, ratePlanId: q.ratePlanId, ccToken: ccToken,
      guest: { firstName: form.firstName.value.trim(), lastName: form.lastName.value.trim(), email: form.email.value.trim(), phone: form.whatsapp.value.trim() },
      tracking: tracking()
    }).then(function (res) {
      if (!res.ok) throw new Error(res.j.code || res.j.error || "booking_failed");
      state.booking = res.j;
      pixel("Purchase", { value: q.total, currency: q.currency, content_ids: [state.villa], content_type: "hotel" });
      openConfirmed();
    }).catch(function () {
      btn.disabled = false; btn.textContent = "Confirm and pay " + idr(q.total, q.currency);
      showError("The payment didn't go through, and you haven't been charged. Please check the card, or WhatsApp us.");
      throw new Error("booking_failed");
    });
  }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;
    var mode = onPage() ? "onpage" : "handoff";
    var q = state.quotes[state.villa];
    var lead = postJSON("/api/lead", leadPayload(mode)).catch(function () {});
    pixel("Lead", { value: q.total, currency: q.currency, content_name: VILLAS[state.villa].name });
    if (mode === "handoff") {
      var btn = $("#pay-btn"); btn.disabled = true; btn.textContent = "Opening secure payment…";
      lead.then(function () { location.href = handoffUrl(); });
      return;
    }
    stripe.createPaymentMethod({ type: "card", card: card, billing_details: { name: form.firstName.value.trim() + " " + form.lastName.value.trim(), email: form.email.value.trim() || undefined } })
      .then(function (r) {
        if (r.error) { showError(r.error.message); return; }
        return book(r.paymentMethod.id);
      }).catch(function () {});
  });

  // ---------- confirmed + transfer ----------
  function icsHref() {
    var s = state.search, v = VILLAS[state.villa];
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Oasis Uluwatu//Booking//EN", "BEGIN:VEVENT",
      "UID:" + (state.booking && state.booking.confirmationCode || Date.now()) + "@oasisuluwatu.com",
      "DTSTART;VALUE=DATE:" + s.checkin.replace(/-/g, ""), "DTEND;VALUE=DATE:" + s.checkout.replace(/-/g, ""),
      "SUMMARY:Stay at " + v.name, "LOCATION:" + v.name + ", Pecatu, Uluwatu, Bali",
      "DESCRIPTION:Confirmation " + (state.booking && state.booking.confirmationCode || "") + ". Check-in from 3pm.",
      "END:VEVENT", "END:VCALENDAR"];
    return "data:text/calendar;charset=utf-8," + encodeURIComponent(lines.join("\r\n"));
  }
  function openConfirmed() {
    var s = state.search, v = VILLAS[state.villa];
    $("#conf-title").textContent = "See you in " + fmt(s.checkin, { month: "long" }) + ", " + form.firstName.value.trim() + ".";
    $("#conf-sub").textContent = v.name + " · " + longRange(s) + " · confirmation " + (state.booking.confirmationCode || "");
    $("#ics-link").href = icsHref();
    renderCars();
    show("confirmed");
  }
  var tForm = $("#transfer-form");
  function carsNeeded() {
    var g = totalGuests(), bags = Number(tForm.bags.value) || 0, boards = Number(tForm.boards.value) || 0;
    var cars = Math.ceil(g / 6);
    if (g >= 5 && (boards > 0 || bags > g)) cars = Math.max(cars, 2);
    return cars;
  }
  function renderCars() {
    var c = carsNeeded();
    $("#cars-note").textContent = "For " + totalGuests() + " guests we’ll ask for " + c + (c === 1 ? " car" : " cars") + ": IDR " + (c * 500000).toLocaleString("en-US") + " in all, paid to Pak Nyoman.";
  }
  tForm.addEventListener("input", renderCars);
  function sendTransfer(want) {
    var b = state.booking || {};
    postJSON("/api/transfer", {
      confirmationCode: b.confirmationCode, want: want, flight: tForm.flight.value, landing: tForm.landing.value,
      bags: tForm.bags.value, boards: tForm.boards.value, guests: totalGuests(), cars: carsNeeded(),
      contact: form.whatsapp.value.trim() || form.email.value.trim()
    }).catch(function () {});
    var done = $("#transfer-done");
    done.textContent = want ? "Thank you. We’ll confirm the pickup with Pak Nyoman and send you his number." : "No problem. If you change your mind, just message us.";
    done.hidden = false;
    $("#transfer-yes").disabled = true; $("#transfer-no").disabled = true;
  }
  $("#transfer-yes").addEventListener("click", function () { sendTransfer(true); });
  $("#transfer-no").addEventListener("click", function () { sendTransfer(false); });

  // ---------- start ----------
  $(".start-photo").style.backgroundImage = "url('" + wix("568a684ab4514aba98c6b6f02dae6370", 1800, 1100) + "')";
  fetch("/api/config").then(function (r) { return r.json(); }).then(function (c) { state.config = Object.assign(state.config, c || {}); }).catch(function () {});

  (function initFromUrl() {
    var p = new URLSearchParams(location.search);
    var villa = p.get("villa") || (p.get("from") === "jati" ? "jati" : "forest");
    if (!ORDER[villa]) villa = "forest";
    var a = parseInt(p.get("adults"), 10), c = parseInt(p.get("children"), 10);
    if (a > 0) state.adults = Math.min(a, 12);
    if (c >= 0) { state.children = Math.min(c, 8); state.ages = new Array(state.children).fill(""); }
    renderCounts();
    var s = { checkin: p.get("checkin") || "", checkout: p.get("checkout") || "", villa: villa };
    fillForms(s);
    if (s.checkin && s.checkout && !checkDates(s) && s.checkin >= iso(new Date())) runSearch(s);
    else show("start");
  })();

  window.OasisBooking = { state: state, tracking: tracking };
})();
