/* Oasis direct booking. Plain JS, no build step. */
(function () {
  "use strict";

  // ---------- villa content (copy from the live listings; prices come live from Guesty) ----------
  // Photos are resized and compressed by Wix (or Airbnb's CDN for Ceylon) to the
  // size each screen needs. A photo can carry a crop (x,y,w,h on the original),
  // e.g. to centre Jati's cover on the dining table.
  function wix(id, w, h) { return pic({ id: id }, w, h); }
  function pic(p, w, h, fit) {
    if (p.abnb) return "https://a0.muscache.com/im/pictures/hosting/Hosting-1655454682482668727/original/" + p.abnb + ".jpeg?im_w=" + (w <= 480 ? 480 : w <= 720 ? 720 : w <= 960 ? 960 : 1200);
    var crop = p.crop && !fit ? "crop/" + p.crop + "/" : "";
    return "https://static.wixstatic.com/media/0bd874_" + p.id + "~mv2.jpg/v1/" + crop + (fit ? "fit" : "fill") + "/w_" + w + ",h_" + h + (fit ? "" : ",al_c") + ",q_70,enc_auto/0bd874_" + p.id + "~mv2.jpg";
  }
  function srcset(p) { return [480, 800, 1200].map(function (w) { return pic(p, w, Math.round(w * 0.7)) + " " + w + "w"; }).join(", "); }
  function wixSet(ids) { return ids.map(function (x) { return typeof x === "string" ? { id: x } : x; }); }
  function abnb(id) { return { abnb: id }; }

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
      name: "Oasis Jati", dot: "jati", eyebrow: "A different house · Pecatu, Uluwatu", bookable: true, max: 6,
      sub: "A house for slower days",
      body: "A house shaped almost entirely from solid teak, at the end of a quiet Pecatu lane. Named for the twenty teak trees that stood on the plot, lifted through construction and replanted into the finished home. Designed by Sidarta & Sandjaja, interiors by Michelle Arderia of BUD Studio.",
      facts: [3, 3, 6], link: "https://www.oasisuluwatu.com/daysatjati",
      photos: wixSet([{ id: "45e262c2aa554dae95063c207e20e539", crop: "x_0,y_2250,w_1800,h_1450" }, "4c137e0ddcf9490fad2946d84824e935", "d6478c6a13e8488ba029cdd282036efe", "663135cd6dcc42ce8ebb6af7f867df56", "c45897d7e7cc4fcd983e0da65daa5f8b"])
    },
    ceylon: {
      name: "Ceylon Residences", dot: "ceylon", eyebrow: "Unit 4 · Suluban, Uluwatu", bookable: true, max: 4,
      sub: "Ocean view, sauna, ice bath",
      body: "Two king bedrooms, a private pool among the greenery, and your own rooftop with a sauna, ice bath and ocean view, where the Uluwatu sunset glows pink and gold each evening.",
      where: "Ceylon is in <b>Suluban, Uluwatu</b>, not at Oasis in Pecatu. A separate residence with its own team.",
      facts: [2, "2.5", 4], link: "",
      photos: ["3c84d0c6-0de5-4298-9163-f89ee4f45799", "05189a7e-6a7b-4be7-8ef5-c10b58ae98eb", "d83e3a4a-ee87-4d24-ac6e-b839c89abf2e", "507c5137-4b25-43a4-b1e6-f1c7d5b8fe35", "62d2377e-ef94-42c4-b3c5-96c376077095"].map(abnb)
    }
  };
  var ORDER = {
    forest: ["palem", "kapuk", "jati", "ceylon"],
    all: ["palem", "kapuk", "jati", "ceylon"],
    jati: ["jati", "palem", "kapuk", "ceylon"],
    ceylon: ["ceylon", "palem", "kapuk", "jati"]
  };
  var SCOPE = { all: ["palem", "kapuk", "jati", "ceylon"], forest: ["palem", "kapuk"], jati: ["jati"], ceylon: ["ceylon"] };
  Object.keys(VILLAS).forEach(function (k) { VILLAS[k].key = k; });
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
  function cookie(n) { var m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : ""; }
  function tracking() {
    var t = {}; try { t = JSON.parse(load("oasis_src") || "{}"); } catch (e) {}
    // For server-side reporting: Meta browser ids and the Google Analytics client id.
    t.fbp = cookie("_fbp") || undefined; t.fbc = cookie("_fbc") || undefined;
    var ga = cookie("_ga").split("."); if (ga.length >= 4) t.gaClientId = ga[2] + "." + ga[3];
    t.page = location.href.split("#")[0].slice(0, 500);
    return t;
  }
  // Every funnel event goes to Meta (fbq) and to GTM's dataLayer under its GA4 name.
  var GA4 = { Search: "search", ViewContent: "view_item", InitiateCheckout: "begin_checkout", Lead: "generate_lead", Purchase: "purchase" };
  function pixel(ev, data, eventId) {
    data = data || {};
    // eventID lets Meta match this browser event with the same one sent from our server.
    try { if (window.fbq) { if (eventId) window.fbq("track", ev, data, { eventID: eventId }); else window.fbq("track", ev, data); } } catch (e) {}
    // Clarity: mark each funnel step, so recordings can be filtered by how far a visitor got.
    try { if (window.clarity) { window.clarity("event", ev); if (data.content_ids && data.content_ids.length) window.clarity("set", "villa", data.content_ids.join(",")); } } catch (e) {}
    try {
      window.dataLayer = window.dataLayer || [];
      var ids = data.content_ids || [];
      // GTM-WFM4LBXL has GA4 triggers for search and generate_lead only, so the
      // other funnel steps go to GA4 directly through the Google tag GTM loads.
      if (ev === "ViewContent" || ev === "InitiateCheckout" || ev === "Purchase") {
        (function () { window.dataLayer.push(arguments); })("event", GA4[ev], { send_to: "G-TJ274KHR96", currency: data.currency || "IDR", value: data.value,
          transaction_id: ev === "Purchase" && state.booking ? state.booking.confirmationCode : undefined,
          items: ids.map(function (k) { return { item_id: k, item_name: VILLAS[k] ? VILLAS[k].name : k }; }) });
      }
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
    $("#start-dock").hidden = v !== "start";
    $("#bar").hidden = v === "confirmed" || v === "transfer" || v === "details";
    window.scrollTo(0, 0);
    remember(v);
  }

  // ---------- browser Back button walks back through the steps ----------
  // Each step gets its own history entry, so Back on a phone or browser goes
  // villa → results → start instead of leaving the site. Confirmed replaces
  // its entry, so Back after paying never reopens the payment form.
  var fromHistory = false;
  function remember(v) {
    if (fromHistory || v === "loading") return;
    var st = { v: v, villa: state.villa };
    var cur = history.state;
    if (v === "start" || v === "results" || v === "confirmed" || (cur && cur.v === v)) history.replaceState(st, "", location.href);
    else history.pushState(st, "", location.href);
  }
  window.addEventListener("popstate", function (e) {
    var st = e.state || {};
    fromHistory = true;
    try {
      if (state.booking) { show("confirmed"); }               // already booked: stay on the confirmation
      else if (st.v === "villa" && st.villa && state.quotes[st.villa]) { state.villa = st.villa; openDetails(); }
      else if (st.v === "details" && state.villa && state.quotes[state.villa]) openDetails();
      else if (st.v === "transfer") show("transfer");
      else if (Object.keys(state.quotes).length) show("results");
      else show("start");
    } finally { fromHistory = false; }
    if (state.booking) history.pushState({ v: "confirmed" }, "", location.href);
  });
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
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { togglePop(false); if (typeof toggleDates === "function") toggleDates(false); closeSheet(); } });

  // ---------- calendar: one tap for arrival, the next for leaving ----------
  // Availability comes from Guesty's calendar (/api/calendar): nights when no
  // villa in the chosen group is free are struck through, and the minimum stay
  // for the arrival date is shown.
  var bar = $("#bar"), sheetForm = $("#sheet-form");
  var CAL = { idx: null, loading: null };
  function today0() { var t = new Date(); t.setHours(0, 0, 0, 0); return t; }
  function addDays(isoStr, n) { var x = d(isoStr); x.setDate(x.getDate() + n); return iso(x); }
  function loadAvail() {
    if (CAL.loading) return CAL.loading;
    var from = iso(today0()), to = addDays(from, 400);
    CAL.loading = fetch("/api/calendar?from=" + from + "&to=" + to).then(function (r) { return r.json(); }).then(function (j) {
      var idx = {};
      Object.keys(j.villas || {}).forEach(function (k) {
        var days = j.villas[k]; if (!Array.isArray(days)) return;
        idx[k] = {}; days.forEach(function (x) { idx[k][x.date] = x; });
      });
      CAL.idx = idx; drawCals();
    }).catch(function () {});
    return CAL.loading;
  }
  function currentScope(form) {
    if (form === bar) return bar.villa.value || "all";
    var r = $('input[name="villa"]:checked', sheetForm); return r ? r.value : "all";
  }
  // Is any villa in the scope free on this night? And the shortest minimum stay among them.
  function night(dateIso, scope) {
    if (!CAL.idx) return null;
    var free = false, min = 0;
    (SCOPE[scope] || SCOPE.all).forEach(function (k) {
      var x = CAL.idx[k] && CAL.idx[k][dateIso];
      if (x && x.status === "available") { free = true; var m = x.minNights || 1; min = min ? Math.min(min, m) : m; }
    });
    return { free: free, min: min || 1 };
  }
  function minStayFor(checkin, scope) { var n = night(checkin, scope); return n && n.free ? n.min : 1; }
  function minFor(key, checkin) { var x = CAL.idx && CAL.idx[key] && CAL.idx[key][checkin]; return x ? (x.minNights || 1) : 0; }

  var cals = [];
  function makeCal(el, form, mode) {
    var c = { el: el, form: form, mode: mode, offset: 0 };
    el.addEventListener("click", function (e) {
      e.stopPropagation(); // the calendar redraws, so outside-click checks would misfire
      var nav = e.target.closest("[data-cal-nav]");
      if (nav) { c.offset = Math.max(0, c.offset + Number(nav.getAttribute("data-cal-nav"))); drawCal(c); return; }
      var b = e.target.closest("[data-d]");
      if (b && !b.disabled) pick(c, b.getAttribute("data-d"));
    });
    cals.push(c); drawCal(c);
    return c;
  }
  var WD = ["M", "T", "W", "T", "F", "S", "S"];
  function monthHtml(y, m, c) {
    var f = c.form, a = f.checkin.value, b = f.checkout.value, scope = currentScope(f), t = iso(today0());
    var first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
    var picking = a && !b ? "out" : "in";
    var h = '<div class="cal-month"><p class="cal-title">' + first.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) + '</p><div class="cal-grid">';
    if (c.mode === "desk") h += WD.map(function (w) { return '<span class="cal-wd">' + w + "</span>"; }).join("");
    for (var i = 0; i < lead; i++) h += "<span></span>";
    for (var dd = 1; dd <= days; dd++) {
      var di = iso(new Date(y, m, dd)), cls = ["cal-d"], dis = di < t;
      var n = di < t ? null : night(di, "all");
      if (n && !n.free) cls.push("full");
      if (picking === "in" && n && !n.free) dis = true;           // no villa free that night: can't arrive
      if (picking === "out" && di <= a) dis = di < a ? true : dis; // leaving must be after arriving
      if (di === a) cls.push("start"); if (di === b) cls.push("end");
      if (a && b && di > a && di < b) cls.push("mid");
      if (di === t) cls.push("today");
      h += '<button type="button" class="' + cls.join(" ") + '" data-d="' + di + '"' + (dis ? " disabled" : "") + ' aria-label="' + d(di).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) + (n && !n.free ? ", nothing free" : "") + '">' + dd + "</button>";
    }
    return h + "</div></div>";
  }
  function calHint(c) {
    var f = c.form, a = f.checkin.value, b = f.checkout.value, scope = currentScope(f);
    if (!a) return "Tap your arrival date";
    var min = minStayFor(a, "all");
    if (!b) return "Now tap your leaving date" + (min > 1 ? " · minimum stay " + min + " nights" : "");
    var n = Math.round((d(b) - d(a)) / 86400000);
    return n + (n === 1 ? " night" : " nights") + (n < min ? " · the minimum stay is " + min + " nights" : "");
  }
  function drawCal(c) {
    var base = today0(), h = "";
    if (c.mode === "desk") {
      var y = base.getFullYear(), m = base.getMonth() + c.offset;
      h = '<div class="cal-head"><button type="button" class="icon-btn" data-cal-nav="-1" aria-label="Earlier months"' + (c.offset ? "" : " disabled") + ">" + ICON.left + '</button><button type="button" class="icon-btn" data-cal-nav="1" aria-label="Later months">' + ICON.right + "</button></div>" +
        '<div class="cal-months">' + monthHtml(y, m, c) + monthHtml(y, m + 1, c) + "</div>";
    } else {
      h = '<div class="cal-wds">' + WD.map(function (w) { return "<span>" + w + "</span>"; }).join("") + "</div>";
      for (var i = 0; i < 13; i++) h += monthHtml(base.getFullYear(), base.getMonth() + i, c);
    }
    h += '<p class="cal-hint" aria-live="polite">' + calHint(c) + "</p>";
    c.el.innerHTML = h;
  }
  function drawCals() { cals.forEach(drawCal); renderDateLabels(); }
  function pick(c, di) {
    var f = c.form, a = f.checkin.value, b = f.checkout.value;
    if (!a || b || di <= a) { f.checkin.value = di; f.checkout.value = ""; }
    else f.checkout.value = di;
    // keep both forms on the same dates
    [bar, sheetForm].forEach(function (o) { if (o !== f) { o.checkin.value = f.checkin.value; o.checkout.value = f.checkout.value; } });
    drawCals();
    if (c.mode === "desk" && f.checkin.value && f.checkout.value) setTimeout(function () { toggleDates(false); }, 250);
  }
  function renderDateLabels() {
    var a = bar.checkin.value, b = bar.checkout.value;
    var lbl = !a ? "Add dates" : !b ? fmt(a, { day: "numeric", month: "short" }) + " – leave?" : shortRange({ checkin: a, checkout: b });
    $all("[data-dates-label]").forEach(function (x) { x.textContent = lbl; });
    var vin = $('[data-tile-v="in"]'), vout = $('[data-tile-v="out"]');
    if (vin) {
      var sa = sheetForm.checkin.value, sb = sheetForm.checkout.value;
      vin.textContent = sa ? fmt(sa, { weekday: "short", day: "numeric", month: "short" }) : "Choose a date";
      vout.textContent = sb ? fmt(sb, { weekday: "short", day: "numeric", month: "short" }) : (sa ? "Choose a date" : "–");
      $('[data-tile="in"]').classList.toggle("on", !sa || !!sb);
      $('[data-tile="out"]').classList.toggle("on", !!sa && !sb);
    }
  }
  makeCal($('[data-cal="desk"]'), bar, "desk");
  makeCal($('[data-cal="phone"]'), sheetForm, "phone");
  var dBtn = $("#dates-btn"), dPop = $("#dates-pop");
  function toggleDates(open) { dPop.hidden = !open; dBtn.setAttribute("aria-expanded", open ? "true" : "false"); if (open) { loadAvail(); togglePop(false); } }
  dBtn.addEventListener("click", function () { toggleDates(dPop.hidden); });
  document.addEventListener("click", function (e) { if (!dPop.hidden && !e.target.closest(".dates")) toggleDates(false); });
  bar.villa.addEventListener("change", drawCals);
  $all('input[name="villa"]', sheetForm).forEach(function (r) { r.addEventListener("change", drawCals); });

  function readForm(form, villaValue) {
    return { checkin: form.checkin.value, checkout: form.checkout.value, villa: villaValue };
  }
  function checkDates(s) {
    if (!s.checkin || !s.checkout) return "Please choose both dates.";
    if (s.checkout <= s.checkin) return "Your leaving date needs to be after your arrival.";
    if (s.checkin < iso(new Date())) return "Your arrival date has already passed. Please choose a date from today.";
    var min = minStayFor(s.checkin, "all"), n = nightsOf(s);
    if (n < min) return "The minimum stay from " + fmt(s.checkin, { day: "numeric", month: "short" }) + " is " + min + " nights.";
    return null;
  }
  function fillForms(s) {
    [bar, sheetForm].forEach(function (f) { f.checkin.value = s.checkin; f.checkout.value = s.checkout; });
    bar.villa.value = s.villa;
    $all('input[name="villa"]', sheetForm).forEach(function (r) { r.checked = r.value === s.villa; });
    drawCals();
  }

  bar.addEventListener("submit", function (e) {
    e.preventDefault();
    var s = readForm(bar, bar.villa.value), err = checkDates(s), box = $("#bar-error");
    box.hidden = !err; box.textContent = err || "";
    if (!err) runSearch(s);
  });

  // ---------- phone sheet ----------
  var sheet = $("#sheet"), lastFocus = null;
  function openSheet(quiet) {
    lastFocus = document.activeElement;
    if (state.search) fillForms(state.search);
    loadAvail();
    sheet.hidden = false; document.body.style.overflow = "hidden";
    if (!quiet) $("[data-close-sheet]").focus();
  }
  // A guest who came from oasisuluwatu.com and closes the date picker before searching
  // is taken back to the page they came from, not left on the booking page (Jayne, 23 Nov 2026).
  var cameFromSite = /(^|\.)oasisuluwatu\.com$/.test((function () { try { return new URL(document.referrer).hostname; } catch (e) { return ""; } })()) &&
    !/^book\./.test((function () { try { return new URL(document.referrer).hostname; } catch (e) { return ""; } })());
  if (/^site/.test(new URLSearchParams(location.search).get("from") || "")) cameFromSite = true;
  function leaveToSite() {
    if (document.referrer && history.length > 1 && /oasisuluwatu\.com/.test(document.referrer) && !/book\.oasisuluwatu/.test(document.referrer)) history.back();
    else location.href = "https://www.oasisuluwatu.com/";
  }
  function closeSheet(byUser) {
    if (sheet.hidden) return;
    if (byUser && cameFromSite && !state.search) { leaveToSite(); return; }
    sheet.hidden = true; document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-open-sheet]")) { e.preventDefault(); openSheet(); }
    if (e.target.closest("[data-close-sheet]")) { e.preventDefault(); closeSheet(true); }
  });
  $("#sheet-clear").addEventListener("click", function () {
    [bar, sheetForm].forEach(function (f) { f.checkin.value = ""; f.checkout.value = ""; });
    drawCals();
  });
  sheetForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = ($('input[name="villa"]:checked', sheetForm) || {}).value || "all";
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
    // A party bigger than one forest villa (6) is looked up as two halves, so we can
    // offer Palem and Kapuk together instead of reporting them as taken.
    var g = totalGuests(), perVilla = g > 6 ? Math.min(6, Math.ceil(g / 2)) : g;
    var q = new URLSearchParams({ checkin: s.checkin, checkout: s.checkout, guests: String(perVilla) });
    history.replaceState(null, "", "?" + new URLSearchParams(Object.assign({}, paramsToKeep(), { checkin: s.checkin, checkout: s.checkout, adults: state.adults, children: state.children, villa: s.villa })).toString());
    var avail = loadAvail();
    fetch("/api/search?" + q.toString())
      .then(function (r) { return r.json().then(function (j) { return avail.then(function () { return { ok: r.ok, j: j }; }); }); })
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
    if (p.get("paytest")) out.paytest = p.get("paytest");
    return out;
  }

  // ---------- rendering pieces ----------
  function factsHtml(f) {
    function one(ic, n, t) { return '<div class="fact"><span class="n">' + ICON[ic] + (n === "" ? "" : esc(n)) + '</span><span class="t">' + t + "</span></div>"; }
    return '<div class="facts">' + one("bed", f[0], "Bedrooms") + one("bath", f[1], "Bathrooms") + one("guest", f[2], "Guests") + one("pool", "", "Private pool") + "</div>";
  }
  function photosHtml(v, cls, eager) {
    var imgs = v.photos.map(function (p, i) {
      return '<img src="' + pic(p, 800, 560) + '" srcset="' + srcset(p) + '" sizes="(max-width: 820px) 100vw, 55vw" alt="' + esc(v.name) + ", photo " + (i + 1) + " of " + v.photos.length + '" decoding="async"' + (i || !eager ? ' loading="lazy"' : "") + ">";
    }).join("");
    return '<div class="photos ' + (cls || "") + '" role="group" aria-label="' + esc(v.name) + ' photos">' +
      '<div class="track">' + imgs + "</div>" +
      '<button type="button" class="arrow l" aria-label="Previous photo">' + ICON.left + "</button>" +
      '<button type="button" class="arrow r" aria-label="Next photo">' + ICON.right + "</button>" +
      '<div class="dots" aria-hidden="true">' + v.photos.map(function (_, i) { return '<span class="' + (i ? "" : "on") + '"></span>'; }).join("") + "</div>" +
      '<button type="button" class="all-photos" data-gallery="' + v.key + '">See all photos</button></div>';
  }
  // Full-screen photo gallery, so guests never leave the booking page to see photos.
  function openGallery(key, start) {
    var v = VILLAS[key], i = start || 0, g = $("#gallery");
    function draw() {
      $("#gallery-img").src = pic(v.photos[i], 1600, 1600, true);
      $("#gallery-img").alt = v.name + ", photo " + (i + 1) + " of " + v.photos.length;
      $("#gallery-count").textContent = (i + 1) + " / " + v.photos.length;
    }
    $("#gallery-title").textContent = v.name;
    g.onclick = function (e) {
      var t = e.target.closest("[data-g]"); if (!t) return;
      var a = t.getAttribute("data-g");
      if (a === "close") return closeGallery();
      i = (i + (a === "next" ? 1 : -1) + v.photos.length) % v.photos.length; draw();
    };
    g.onkeydown = function (e) {
      if (e.key === "Escape") closeGallery();
      if (e.key === "ArrowRight") { i = (i + 1) % v.photos.length; draw(); }
      if (e.key === "ArrowLeft") { i = (i - 1 + v.photos.length) % v.photos.length; draw(); }
    };
    draw(); g.hidden = false; document.body.style.overflow = "hidden";
    $("#gallery [data-g=close]").focus();
  }
  function closeGallery() { $("#gallery").hidden = true; document.body.style.overflow = ""; }

  function wireCarousels(root) {
    $all(".photos", root).forEach(function (p) {
      var track = $(".track", p), dots = $all(".dots span", p);
      var gb = $("[data-gallery]", p);
      if (gb) gb.addEventListener("click", function () { openGallery(gb.getAttribute("data-gallery"), Math.round(track.scrollLeft / Math.max(1, track.clientWidth))); });
      function idx() { return Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); }
      function go(i) { track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" }); }
      $(".arrow.l", p).addEventListener("click", function () { go(Math.max(0, idx() - 1)); });
      $(".arrow.r", p).addEventListener("click", function () { go(Math.min(dots.length - 1, idx() + 1)); });
      track.addEventListener("scroll", function () { var i = idx(); dots.forEach(function (dd, j) { dd.className = j === i ? "on" : ""; }); }, { passive: true });
    });
  }
  function askLink(key) {
    var s = state.search, v = VILLAS[key];
    var text = "Hi Oasis, are " + shortRange(s) + " " + d(s.checkout).getFullYear() + " free at " + v.name + "? We are " + guestsText() + ".";
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(text);
  }

  // free · taken · min (stay too short) · big (party too large) · ask (not bookable online)
  function statusOf(key) {
    var v = VILLAS[key], q = state.quotes[key], s = state.search;
    if (!v.bookable) return "ask";
    if (totalGuests() > v.max) return "big";
    if (q && q.available) return "free";
    var min = minFor(key, s.checkin);
    if (min > nightsOf(s)) return "min";
    return "taken";
  }
  function cardHtml(key, eager) {
    var v = VILLAS[key], q = state.quotes[key], s = state.search, n = nightsOf(s), st = statusOf(key);
    var foot;
    if (st === "ask") {
      foot = '<div><p class="unavail">Online booking for ' + esc(v.name) + ' opens soon.</p><p class="per">Message us and we’ll check your dates.</p></div>' +
        '<a class="btn btn-line" href="' + askLink(key) + '" target="_blank" rel="noopener">Ask about these dates</a>';
    } else if (st === "big") {
      foot = '<div><p class="unavail">Sleeps up to ' + v.max + ' guests.</p><p class="per">' + (v.dot === "forest" ? "For your group, see Palem and Kapuk together above." : "Message us and we’ll help with your group.") + '</p></div>' +
        (v.dot === "forest" ? "" : '<a class="btn btn-line" href="' + askLink(key) + '" target="_blank" rel="noopener">Ask us</a>');
    } else if (st === "free") {
      foot = '<div><p class="price">' + idr(q.total, q.currency) + '</p><p class="per">' + (n > 1 ? "about " + idr(q.total / n, q.currency) + " a night · " : "") + n + (n === 1 ? " night" : " nights") + " · non-refundable</p></div>" +
        '<button type="button" class="btn" data-choose="' + key + '">Choose ' + esc(v.name.replace("Oasis ", "")) + "</button>";
    } else if (st === "min") {
      var min = minFor(key, s.checkin);
      foot = '<div><p class="unavail">Minimum stay ' + min + ' nights from ' + fmt(s.checkin, { day: "numeric", month: "short" }) + '.</p></div>' +
        '<button type="button" class="btn btn-line" data-extend="' + min + '">See ' + min + " nights</button>";
    } else {
      foot = '<div><p class="unavail">Booked for these dates.</p></div>' +
        '<a class="btn btn-line" href="' + askLink(key) + '" target="_blank" rel="noopener">Ask about other dates</a>';
    }
    if (st !== "free" && st !== "big") {
      // Compact card: villas you can't book for these dates take little room.
      return '<article class="card compact"><img class="thumb" src="' + pic(v.photos[0], 320, 240) + '" alt="" loading="lazy" decoding="async">' +
        '<div class="info"><p class="eyebrow"><span class="dot ' + v.dot + '"></span>' + esc(v.eyebrow) + "</p>" +
        '<h2 class="vname">' + esc(v.name) + "</h2>" +
        '<div class="price-row">' + foot + "</div></div></article>";
    }
    return '<article class="card">' + photosHtml(v, "", eager) +
      '<div class="info"><p class="eyebrow"><span class="dot ' + v.dot + '"></span>' + esc(v.eyebrow) + "</p>" +
      '<h2 class="vname">' + esc(v.name) + "</h2>" +
      '<p class="vsub">' + esc(v.sub) + "</p>" +
      (v.where ? '<div class="where">' + ICON.pin + "<span>" + v.where + "</span></div>" : "") +
      factsHtml(v.facts) +
      '<p class="body">' + esc(v.body) + "</p>" +
      '<div class="price-row">' + foot + "</div></div></article>";
  }
  function names(keys) {
    var n = keys.map(function (k) { return VILLAS[k].name; });
    return n.length < 2 ? n.join("") : n.slice(0, -1).join(", ") + " and " + n[n.length - 1];
  }

  // Groups of 7–12: both forest villas, booked together with us.
  function groupHtml(open, g) {
    var s = state.search, n = nightsOf(s);
    if (g > 12 || open.length < 2) {
      return '<div class="group-box"><p><b>' + (g > 12 ? "Our two forest villas sleep up to 12 together." : "Only one forest villa is free for these dates, and each sleeps up to 6.") +
        '</b> Message us and we’ll help with your group.</p><a class="btn btn-line" href="' + groupLink(open, g, 0) + '" target="_blank" rel="noopener">Message us</a></div>';
    }
    var a = state.quotes.palem, b = state.quotes.kapuk, total = a.total + b.total;
    return '<div class="group-box"><p class="label">For your group of ' + g + '</p>' +
      '<p class="gb-title">Oasis Palem and Oasis Kapuk, together</p>' +
      '<p class="small">Two three-bedroom villas in the same Oasis enclave, up to 12 guests. ' + n + (n === 1 ? " night" : " nights") + ', non-refundable.</p>' +
      '<p class="gb-price">' + idr(total, a.currency) + ' <span class="small muted">total for both (Palem ' + idr(a.total, a.currency) + ' + Kapuk ' + idr(b.total, b.currency) + ')</span></p>' +
      '<a class="btn" href="' + groupLink(open, g, total) + '" target="_blank" rel="noopener">Book both with us on WhatsApp</a></div>';
  }
  function groupLink(open, g, total) {
    var s = state.search;
    var text = "Hi Oasis, we'd like to book " + (open.length >= 2 ? "Palem and Kapuk together" : "the forest villas") + " for " + shortRange(s) + " " + d(s.checkout).getFullYear() + ". We are " + guestsText() + "." +
      (total ? " The page showed " + idr(total, state.quotes.palem.currency) + " for both." : "");
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(text);
  }

  function renderResults() {
    var s = state.search, order = ORDER[s.villa] || ORDER.all, scope = SCOPE[s.villa] || SCOPE.all;
    var g = totalGuests(), big = g > 6, nn = nightsOf(s);
    var open = ["palem", "kapuk"].filter(function (k) { var q = state.quotes[k]; return q && q.available; });
    var st = {}; order.forEach(function (k) { st[k] = statusOf(k); });
    var freeIn = order.filter(function (k) { return scope.indexOf(k) >= 0 && st[k] === "free"; });
    var freeOut = order.filter(function (k) { return scope.indexOf(k) < 0 && st[k] === "free"; });
    var free = freeIn.concat(freeOut);
    var rest = order.filter(function (k) { return st[k] !== "free"; });
    var minAll = rest.length && rest.every(function (k) { return st[k] === "min"; }) && !free.length;
    var scopeName = { forest: "The forest villas are", jati: "Oasis Jati is", ceylon: "Ceylon Residences is", all: "" }[s.villa] || "";
    var title;
    if (big && s.villa !== "jati" && s.villa !== "ceylon" && g <= 12 && open.length === 2) title = "Palem and Kapuk together sleep " + g;
    else if (big) title = "Each villa sleeps up to 6";
    else if (minAll) title = "The minimum stay is " + minFor(rest[0], s.checkin) + " nights for these dates";
    else if (!free.length) title = "Nothing is free for those dates";
    else if (!freeIn.length) title = scopeName + " taken, but " + names(freeOut) + (freeOut.length > 1 ? " are" : " is") + " free";
    else if (s.villa === "all" && freeIn.length === 4) title = "All four houses are free for your dates";
    else if (s.villa === "forest" && freeIn.length === 2) title = "Both forest villas are free";
    else title = names(freeIn) + (freeIn.length > 1 ? " are" : " is") + " free for your dates";
    $("#results-title").textContent = title;
    $("#results-sub").textContent = longRange(s) + " · " + nn + (nn === 1 ? " night" : " nights") + " · " + guestsText();
    $("[data-pill-text]").textContent = shortRange(s) + " · " + totalGuests() + " guests · " + VILLA_LABEL[s.villa];
    $("[data-pill-dot]").className = "dot " + (s.villa === "jati" ? "jati" : s.villa === "ceylon" ? "ceylon" : s.villa === "all" ? "none" : "forest");

    var html = "";
    if (big && s.villa !== "jati" && s.villa !== "ceylon") html += groupHtml(open, g);
    freeIn.forEach(function (k, i) { html += cardHtml(k, i === 0); });
    if (freeOut.length) {
      html += '<p class="label muted section-label">' + (freeIn.length ? "Also free for your dates" : "Free for your dates") + "</p>";
      freeOut.forEach(function (k, i) { html += cardHtml(k, !freeIn.length && i === 0); });
    }
    if (rest.length) {
      if (!big) html += '<p class="label muted section-label">' + (minAll ? "Choose a longer stay" : "Not available for your dates") + "</p>";
      rest.forEach(function (k) { html += cardHtml(k); });
    }
    if (!free.length && !minAll && !big) html += '<div class="group-box"><p>Message us and we’ll find the nearest free dates.</p><a class="btn" href="https://wa.me/' + WA + '?text=' + encodeURIComponent("Hi Oasis, is anything free around " + shortRange(s) + " " + d(s.checkout).getFullYear() + "? We are " + guestsText() + ".") + '" target="_blank" rel="noopener">WhatsApp us</a></div>';
    var box = $("#results");
    box.innerHTML = html;
    wireCarousels(box);
    $all("[data-choose]", box).forEach(function (b) { b.addEventListener("click", function () { chooseVilla(b.getAttribute("data-choose")); }); });
    $all("[data-extend]", box).forEach(function (b) { b.addEventListener("click", function () {
      runSearch({ checkin: s.checkin, checkout: addDays(s.checkin, Number(b.getAttribute("data-extend"))), villa: s.villa });
    }); });
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
  // Fine print under every price: the cancellation terms from the live quote,
  // plus Balinest's booking terms (the booking is made on their Guesty account).
  var TERMS_URL = "https://book.balinestvillas.com/en/terms";
  var PRIVACY_URL = "https://book.balinestvillas.com/en/privacy-policy";
  function finePrint(q) {
    var fee = Number(q.cancellationFee);
    var nonRef = fee >= 100 || /super_strict|non_?refundable/i.test(q.cancellationPolicy || "");
    var c = nonRef ? "Non-refundable: if you cancel, the full amount is charged."
      : (fee > 0 ? "If you cancel, " + fee + "% of the total is charged." : "");
    return '<p class="fine">' + (c ? esc(c) + " " : "") +
      '<a href="' + TERMS_URL + '" target="_blank" rel="noopener">Terms</a> · ' +
      '<a href="' + PRIVACY_URL + '" target="_blank" rel="noopener">Privacy</a></p>';
  }
  function openVilla(key) {
    var v = VILLAS[key], q = state.quotes[key], n = nightsOf(state.search);
    state.villa = key;
    $("#villa-photos").innerHTML = photosHtml(v, "", true);
    wireCarousels($("#villa-photos"));
    $("#villa-eyebrow").innerHTML = '<span class="dot ' + v.dot + '"></span>' + esc(v.eyebrow);
    $("#villa-name").textContent = v.name;
    $("#villa-sub").textContent = v.sub;
    $("#villa-facts").innerHTML = factsHtml(v.facts);
    $("#villa-body").textContent = v.body;
    $("#villa-pcard").innerHTML =
      '<div><p class="big">' + idr(q.total, q.currency) + '</p><p class="sub">for ' + n + (n === 1 ? " night" : " nights") + " · non-refundable</p></div>" +
      stayBox() +
      '<button type="button" class="btn btn-block" data-go="details">Continue</button>' +
      '<p class="note-c">You won’t be charged yet</p>' + breakdown(q) + finePrint(q);
    $("#villa-dock").innerHTML = '<div class="what"><span class="a">' + idr(q.total, q.currency) + '</span><span class="b">' + shortRange(state.search) + " · non-refundable</span></div>" +
      '<button type="button" class="btn" data-go="details">Continue</button>';
    show("villa");
    getListing(key).catch(function () {});
    pixel("ViewContent", { content_ids: [key], content_type: "hotel", value: q.total, currency: q.currency });
  }

  function chooseVilla(key) {
    var q = state.quotes[key];
    state.villa = key;
    getListing(key).catch(function () {});
    pixel("ViewContent", { content_ids: [key], content_type: "hotel", value: q.total, currency: q.currency });
    openDetails();
  }

  // ---------- details ----------
  function renderAges() {
    var row = $("#ages-row"), box = $("#ages");
    if (!row) return;
    row.hidden = state.children === 0;
    var html = "";
    for (var i = 0; i < state.children; i++) {
      var opts = '<option value="">Age</option>';
      for (var a = 0; a <= 12; a++) opts += '<option value="' + a + '"' + (String(state.ages[i]) === String(a) ? " selected" : "") + ">" + (a === 0 ? "Under 1" : a) + "</option>";
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

  // ---------- "Before you pay": house terms and what's included, from the Guesty listing ----------
  var listingCache = {};
  function getListing(key) {
    if (!listingCache[key]) listingCache[key] = fetch("/api/listing/" + key).then(function (r) { if (!r.ok) throw 0; return r.json(); });
    return listingCache[key];
  }
  // Keep the item, drop the sales line after it ("Daily housekeeping to keep your villa spotless" → "Daily housekeeping").
  function clean(line) {
    var t = line.replace(/^[^A-Za-z0-9(]+/, "").trim();
    t = t.split(/ to (?=[a-z])(?!temples)| for (?=[a-z])|, tailored/)[0];
    return t.replace(/^(Plush|Expert|Exciting) /, "").replace(/^\w/, function (c) { return c.toUpperCase(); });
  }
  // The listing's "access" text has two lists: free with every stay, and on request at a charge.
  function splitAccess(text) {
    var out = { incl: [], extra: [] }, cur = null;
    String(text || "").split(/\n/).forEach(function (raw) {
      var l = raw.trim(); if (!l) { return; }
      if (/included in every stay/i.test(l)) { cur = "incl"; return; }
      if (/additional charges apply|on request/i.test(l) && /:$/.test(l)) { cur = "extra"; return; }
      if (/and so much more/i.test(l)) return;
      if (cur) out[cur].push(clean(l).replace(/\s*\.$/, ""));
    });
    return out;
  }
  function hm(t) { if (!t) return ""; var p = t.split(":"), h = Number(p[0]), m = p[1] || "00"; return (h % 12 || 12) + (m !== "00" ? ":" + m : "") + (h < 12 ? "am" : "pm"); }
  function renderTerms(key) {
    var v = VILLAS[key], q = state.quotes[key], body = $("#terms-body");
    body.innerHTML = '<p class="small muted">Loading the house details…</p>';
    getListing(key).then(function (l) {
      if (state.villa !== key) return;
      var pd = l.publicDescription || {}, acc = splitAccess(pd.access), min = (l.terms && l.terms.minNights) || 1;
      var meals = acc.extra.some(function (x) { return /breakfast|chef/i.test(x); });
      var h = '<dl class="terms">' +
        "<div><dt>Check-in and checkout</dt><dd>Check-in from " + hm(l.checkInTime) + ", checkout by " + hm(l.checkOutTime) + ".</dd></div>" +
        "<div><dt>Guests</dt><dd>Up to " + v.max + " guests" + (min > 1 ? " · minimum stay " + min + " nights" : "") + ".</dd></div>" +
        "<div><dt>Cancellation</dt><dd>Non-refundable. You pay the full amount now, and it isn’t refunded if you cancel or change your dates.</dd></div>" +
        "<div><dt>Price</dt><dd>" + idr(q.total, q.currency) + " in total, charged in " + esc(q.currency || "IDR") + " when you book. It includes the booking fee shown in the price details.</dd></div>" +
        "</dl>";
      var facts = [];
      if (l.bedrooms) facts.push(l.bedrooms + (l.bedrooms === 1 ? " bedroom" : " bedrooms"));
      if (l.beds) facts.push(l.beds + (l.beds === 1 ? " bed" : " beds"));
      if (l.bathrooms) facts.push(l.bathrooms + (l.bathrooms === 1 ? " bathroom" : " bathrooms"));
      var AM = [["Swimming pool", "Private pool"], ["Air conditioning", "Air conditioning"], ["Wireless Internet", "Wi-Fi"], ["Kitchen", "Full kitchen"], ["Coffee maker", "Coffee maker"], ["Bathtub", "Bathtub"], ["TV", "TV"], ["Safe", "Safe"], ["Hair dryer", "Hair dryer"], ["Iron", "Iron"], ["Washer", "Washing machine"], ["Free parking on premises", "Parking"]];
      var am = AM.filter(function (a) { return (l.amenities || []).indexOf(a[0]) > -1; }).map(function (a) { return a[1]; });
      if (facts.length || am.length) h += '<p class="t-h">The house</p>' + (facts.length ? '<p class="small">' + esc(facts.join(" · ")) + "</p>" : "") + (am.length ? '<ul class="amen">' + am.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "");
      if (acc.incl.length) h += '<p class="t-h">Included in your stay</p><ul class="ticks">' + acc.incl.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
      if (meals) h += '<p class="t-h">Not included</p><ul class="crosses"><li>Meals. Breakfast or a private chef can be arranged, at an extra charge.</li></ul>';
      if (acc.extra.length) h += '<p class="t-h">On request, at an extra charge</p><p class="small">' + esc(acc.extra.join(" · ")) + "</p>";
      if (pd.houseRules) h += '<p class="t-h">House rules</p><p class="small">' + esc(pd.houseRules) + "</p>";
      // Only Ceylon's listing note (motorbike parking) is shown. The Oasis listings carry
      // a construction-noise note that Jayne says is not true (23 Nov 2026).
      if (pd.notes && key === "ceylon") h += '<p class="t-h">Good to know</p><p class="small">' + esc(pd.notes) + "</p>";
      h += '<p class="fine">Your booking is with Balinest Villas, who manage the house, under their <a href="' + TERMS_URL + '" target="_blank" rel="noopener">terms and conditions</a> and <a href="' + PRIVACY_URL + '" target="_blank" rel="noopener">privacy policy</a>.</p>';
      body.innerHTML = h;
    }).catch(function () {
      body.innerHTML = '<p class="small">Non-refundable: you pay the full amount now, and it isn’t refunded if you cancel. Check-in from 3pm, checkout by 11am. See the <a href="' + TERMS_URL + '" target="_blank" rel="noopener">booking terms</a>.</p>';
    });
  }
  function openDetails() {
    var v = VILLAS[state.villa], q = state.quotes[state.villa];
    renderCounts();
    loadPhoneLib();
    $("#details-pcard").innerHTML =
      '<div class="mini"><div class="ph" style="background-image:url(\'' + pic(v.photos[0], 240, 180) + '\')"></div><div><p class="eyebrow"><span class="dot ' + v.dot + '"></span>' + esc(v.eyebrow.split(" · ")[0]) + '</p><p class="vname">' + esc(v.name) + "</p></div></div>" +
      stayBox() + breakdown(q) + finePrint(q);
    renderTerms(state.villa);
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
    if (wa && !waNumber()) { showError("That WhatsApp number doesn't look right for the country chosen."); return false; }
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
      email: form.email.value.trim(), whatsapp: waNumber() || form.whatsapp.value.trim(), occasion: form.occasion.value.trim(),
      mode: mode, tracking: tracking()
    };
  }
  function postJSON(url, body) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); });
  }
  // ---------- WhatsApp: country code + number, checked as a real mobile number ----------
  // Uses libphonenumber's mobile metadata (served from /vendor). It can tell a valid
  // mobile number for the country; nobody outside WhatsApp can tell if a number uses it.
  var phoneLib = null;
  function loadPhoneLib() {
    if (phoneLib || window.__phoneLoading) return;
    window.__phoneLoading = true;
    var s = document.createElement("script");
    s.src = "vendor/libphonenumber-mobile.js?v=1.10.60";
    s.onload = function () { phoneLib = window.libphonenumber; fillCountries(); checkWa(); };
    document.head.appendChild(s);
  }
  // The guest's time zone says more about where they live than the browser
  // language (many browsers are set to en-US everywhere), so try that first.
  var TZ_COUNTRY = {
    "Asia/Singapore": "SG", "Asia/Jakarta": "ID", "Asia/Makassar": "ID", "Asia/Jayapura": "ID", "Asia/Pontianak": "ID",
    "Asia/Kuala_Lumpur": "MY", "Asia/Hong_Kong": "HK", "Asia/Shanghai": "CN", "Asia/Taipei": "TW", "Asia/Tokyo": "JP",
    "Asia/Seoul": "KR", "Asia/Bangkok": "TH", "Asia/Manila": "PH", "Asia/Ho_Chi_Minh": "VN", "Asia/Kolkata": "IN",
    "Asia/Dubai": "AE", "Europe/London": "GB", "Europe/Paris": "FR", "Europe/Berlin": "DE", "Europe/Amsterdam": "NL",
    "Europe/Madrid": "ES", "Europe/Rome": "IT", "Europe/Zurich": "CH", "Europe/Stockholm": "SE", "Europe/Moscow": "RU",
    "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Brisbane": "AU", "Australia/Perth": "AU", "Australia/Adelaide": "AU",
    "Pacific/Auckland": "NZ", "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US",
    "America/Toronto": "CA", "America/Vancouver": "CA"
  };
  function guessCountry() {
    try { var tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz]; } catch (e) {}
    var langs = navigator.languages || [navigator.language || ""];
    for (var i = 0; i < langs.length; i++) { var m = /-([A-Z]{2})$/i.exec(langs[i] || ""); if (m) return m[1].toUpperCase(); }
    return "ID";
  }
  function flag(cc) { return cc.replace(/./g, function (c) { return String.fromCodePoint(127397 + c.charCodeAt(0)); }); }
  // Country code: a button showing flag and code, opening a list you can search
  // by country name, code (+65) or letters (SG).
  var COUNTRIES = [];
  function fillCountries() {
    var names = null;
    try { names = new Intl.DisplayNames(["en"], { type: "region" }); } catch (e) {}
    COUNTRIES = phoneLib.getCountries().map(function (cc) {
      return { cc: cc, code: phoneLib.getCountryCallingCode(cc), name: names ? names.of(cc) : cc };
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    setCountry(form.waCountry.value || guessCountry());
    drawCountries("");
  }
  function setCountry(cc) {
    var c = COUNTRIES.filter(function (x) { return x.cc === cc; })[0] || COUNTRIES.filter(function (x) { return x.cc === "ID"; })[0];
    if (!c) return;
    form.waCountry.value = c.cc;
    $("#cc-label").textContent = flag(c.cc) + " +" + c.code;
    $("#cc-btn").setAttribute("aria-label", "Country code: " + c.name + " +" + c.code);
  }
  function drawCountries(q) {
    q = q.trim().toLowerCase().replace(/^\+/, "");
    var list = COUNTRIES.filter(function (c) {
      return !q || c.name.toLowerCase().indexOf(q) >= 0 || c.code.indexOf(q) === 0 || c.cc.toLowerCase() === q;
    });
    var MAIN = { "1": "US", "44": "GB", "7": "RU", "61": "AU", "47": "NO", "39": "IT", "358": "FI", "262": "RE", "590": "GP", "599": "CW", "212": "MA" };
    if (/^\d+$/.test(q)) list.sort(function (a, b) { return (b.code === q) - (a.code === q) || (MAIN[b.code] === b.cc) - (MAIN[a.code] === a.cc) || a.name.localeCompare(b.name); });
    $("#cc-list").innerHTML = list.map(function (c) {
      return '<li role="option" tabindex="-1" data-cc="' + c.cc + '"' + (c.cc === form.waCountry.value ? ' aria-selected="true"' : "") + "><span>" + flag(c.cc) + " " + esc(c.name) + '</span><span class="muted">+' + c.code + "</span></li>";
    }).join("") || '<li class="muted">No match</li>';
  }
  var ccBtn = $("#cc-btn"), ccPop = $("#cc-pop"), ccSearch = $("#cc-search");
  function toggleCc(open) {
    ccPop.hidden = !open; ccBtn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) { ccSearch.value = ""; drawCountries(""); ccSearch.focus(); var sel = $('#cc-list [aria-selected="true"]'); if (sel) sel.scrollIntoView({ block: "center" }); }
  }
  ccBtn.addEventListener("click", function () { toggleCc(ccPop.hidden); });
  ccSearch.addEventListener("input", function () { drawCountries(ccSearch.value); });
  ccSearch.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); var f = $("#cc-list [data-cc]"); if (f) { setCountry(f.getAttribute("data-cc")); toggleCc(false); checkWa(); form.whatsapp.focus(); } }
    if (e.key === "Escape") toggleCc(false);
  });
  $("#cc-list").addEventListener("click", function (e) {
    var li = e.target.closest("[data-cc]"); if (!li) return;
    setCountry(li.getAttribute("data-cc")); toggleCc(false); checkWa(); form.whatsapp.focus();
  });
  document.addEventListener("click", function (e) { if (!ccPop.hidden && !e.target.closest(".cc")) toggleCc(false); });
  function waNumber() {
    var raw = form.whatsapp.value.trim();
    if (!raw || !phoneLib) return "";
    try {
      var p = phoneLib.parsePhoneNumber(raw, form.waCountry.value || undefined);
      return p && p.isValid() ? p.number : "";
    } catch (e) { return ""; }
  }
  function checkWa() {
    var raw = form.whatsapp.value.trim(), ok = !!waNumber();
    $("#wa-ok").hidden = !ok;
    var hint = $("#wa-hint");
    hint.textContent = !raw ? "" : ok ? "Valid mobile number" : (phoneLib ? "Check the number for the country chosen" : "");
    hint.className = "wa-hint" + (raw && !ok && phoneLib ? " bad" : "");
    // A pasted +country number picks its own country.
    if (phoneLib && /^\+/.test(raw)) {
      try {
        var p = phoneLib.parsePhoneNumber(raw);
        if (p && p.country && p.isValid()) { setCountry(p.country); form.whatsapp.value = p.formatNational(); }
      } catch (e) {}
    }
  }
  form.whatsapp.addEventListener("input", checkWa);

  function handoffUrl() {
    var q = state.quotes[state.villa], s = state.search;
    var p = new URLSearchParams({ minOccupancy: String(totalGuests()), checkIn: s.checkin, checkOut: s.checkout, adults: String(totalGuests()) });
    // Balinest's checkout page only opens after their villa page has loaded the
    // quote, so we land guests on the villa page with dates filled; they press Book now.
    return state.config.checkoutBase + "/" + q.listingId + "?" + p.toString();
  }
  function book(ccToken) {
    var q = state.quotes[state.villa];
    var btn = $("#pay-btn"); btn.disabled = true; btn.textContent = "Confirming…";
    return postJSON("/api/book", {
      quoteId: q.quoteId, ratePlanId: q.ratePlanId, ccToken: ccToken,
      guest: { firstName: form.firstName.value.trim(), lastName: form.lastName.value.trim(), email: form.email.value.trim(), phone: waNumber() || form.whatsapp.value.trim() },
      stay: { villa: state.villa, checkin: state.search.checkin, checkout: state.search.checkout, adults: state.adults, children: state.children,
        childAges: state.ages.slice(0, state.children), occasion: form.occasion.value.trim(), whatsapp: waNumber() || form.whatsapp.value.trim(),
        total: q.total, currency: q.currency },
      tracking: tracking()
    }).then(function (res) {
      if (!res.ok) throw new Error(res.j.code || res.j.error || "booking_failed");
      state.booking = res.j;
      pixel("Purchase", { value: q.total, currency: q.currency, content_ids: [state.villa], content_type: "hotel" }, "purchase-" + (res.j.confirmationCode || res.j.reservationId));
      openConfirmed();
    }).catch(function () {
      btn.disabled = false; btn.textContent = "Confirm and pay " + idr(q.total, q.currency);
      showError("The payment didn't go through, and you haven't been charged. Please check the card and try again, or WhatsApp us.");
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
    $("#view-transfer").hidden = false;   // the transfer offer sits right under the confirmation
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
      contact: waNumber() || form.whatsapp.value.trim() || form.email.value.trim()
    }).catch(function () {});
    var done = $("#transfer-done");
    done.textContent = want ? "Thank you. We’ll confirm the pickup with Pak Nyoman and send you his number." : "No problem. If you change your mind, just message us.";
    done.hidden = false;
    $("#transfer-yes").disabled = true; $("#transfer-no").disabled = true;
  }
  $("#transfer-yes").addEventListener("click", function () { sendTransfer(true); });
  $("#transfer-no").addEventListener("click", function () { sendTransfer(false); });

  // ---------- start ----------
  $(".start-photo").style.backgroundImage = "url('" + wix("568a684ab4514aba98c6b6f02dae6370", window.innerWidth < 820 ? 800 : 1600, window.innerWidth < 820 ? 900 : 980) + "')";
  fetch("/api/config" + (/[?&]paytest=1/.test(location.search) ? "?test=1" : "")).then(function (r) { return r.json(); }).then(function (c) { state.config = Object.assign(state.config, c || {}); }).catch(function () {});

  (function initFromUrl() {
    var p = new URLSearchParams(location.search);
    var villa = p.get("villa") || (p.get("from") === "jati" ? "jati" : "all");
    if (villa === "palem" || villa === "kapuk") villa = "forest";
    if (!ORDER[villa]) villa = "all";
    var a = parseInt(p.get("adults"), 10), c = parseInt(p.get("children"), 10);
    if (a > 0) state.adults = Math.min(a, 12);
    if (c >= 0) { state.children = Math.min(c, 8); state.ages = new Array(state.children).fill(""); }
    renderCounts();
    var s = { checkin: p.get("checkin") || "", checkout: p.get("checkout") || "", villa: villa };
    fillForms(s);
    if (s.checkin && s.checkout && s.checkout > s.checkin && s.checkin >= iso(new Date())) runSearch(s);
    else {
      show("start");
      loadAvail();
      // On a phone, open straight to dates, guests and villa: no extra tap.
      if (window.matchMedia("(max-width: 820px)").matches) openSheet(true);
    }
  })();

  window.OasisBooking = { state: state, tracking: tracking };
})();
