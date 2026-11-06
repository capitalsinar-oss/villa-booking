/* Oasis booking page. Plain JS, no build step. */
(function () {
  "use strict";

  var WIX = "https://static.wixstatic.com/media/0bd874_";
  function photo(id, w, h) {
    return WIX + id + "~mv2.jpg/v1/fill/w_" + w + ",h_" + h + ",al_c,q_85/" + id + ".jpg";
  }

  // Villa content (from oasisuluwatu.com). Prices and availability come live from Guesty.
  var CONTENT = {
    palem: {
      blurb: "Floor-to-ceiling glass opens the house to the garden. The pool sits in a sheltered courtyard lined with Green Sukabumi stone, under Bengkirai timber pergolas.",
      card: "Floor-to-ceiling glass opens the house to the garden, with the pool in a sheltered courtyard under teak pergolas.",
      photos: ["2a4cf88e2d9046a0bb5918ac6b9fab66", "51bedaf99c134ca8a28eb2fa969ae181", "75a7a42f056244c29a5ce9913b635cd5"]
    },
    kapuk: {
      blurb: "Palem's twin, built around the teak and cotton trees that were kept when the houses went up. Glass doors open onto the garden and a private pool.",
      card: "Palem's twin, built around the teak and cotton trees that were kept when the houses went up.",
      photos: ["568a684ab4514aba98c6b6f02dae6370", "416afe75994b496485192590d6e85c3f", "f022ec0e63c34e69a330d3faec85487f"]
    }
  };

  var state = { search: null, results: [], villa: null };

  // ---------- tracking: keep the ad source for the whole visit ----------
  var TRACK_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "from"];
  function store(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  (function captureSource() {
    var p = new URLSearchParams(location.search);
    var saved = {};
    try { saved = JSON.parse(load("oasis_src") || "{}"); } catch (e) {}
    var changed = false;
    TRACK_KEYS.forEach(function (k) { if (p.get(k)) { saved[k] = p.get(k).slice(0, 200); changed = true; } });
    if (!saved.landing) { saved.landing = location.href.slice(0, 500); saved.referrer = document.referrer.slice(0, 300); changed = true; }
    if (changed) store("oasis_src", JSON.stringify(saved));
  })();
  function tracking() { try { return JSON.parse(load("oasis_src") || "{}"); } catch (e) { return {}; } }
  function pixel(event, data, opts) { try { if (window.fbq) window.fbq("track", event, data || {}, opts || {}); } catch (e) {} }

  // ---------- helpers ----------
  function $(sel) { return document.querySelector(sel); }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "style") n.setAttribute("style", attrs[k]);
      else if (k.indexOf("on") === 0) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function money(amount, currency) {
    if (amount == null) return "—";
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(amount);
    } catch (e) { return (currency || "") + " " + Math.round(amount).toLocaleString("en-US"); }
  }
  function fmtDate(iso, withYear) {
    var d = new Date(iso + "T00:00:00");
    var s = d.toLocaleDateString("en-GB", { weekday: "short" }) + " " + d.getDate() + " " + d.toLocaleDateString("en-GB", { month: "short" });
    return withYear ? s + " " + d.getFullYear() : s;
  }
  function stayLine() {
    var s = state.search;
    var nights = Math.round((new Date(s.checkout) - new Date(s.checkin)) / 86400000);
    return fmtDate(s.checkin) + " – " + fmtDate(s.checkout, true) + " · " + nights + (nights === 1 ? " night" : " nights") + " · " + s.guests + (s.guests === 1 ? " guest" : " guests");
  }

  var VIEWS = ["dates", "results", "villa", "details", "confirmed"];
  var STEP_OF = { dates: "dates", results: "villa", villa: "villa", details: "details", confirmed: "confirmed" };
  function show(view) {
    VIEWS.forEach(function (v) { $("#view-" + v).hidden = v !== view; });
    $("#view-loading").hidden = true;
    document.querySelectorAll(".steps li").forEach(function (li) {
      if (li.dataset.step === STEP_OF[view]) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    document.body.classList.toggle("ink", view === "confirmed");
    window.scrollTo(0, 0);
  }
  document.addEventListener("click", function (e) {
    var go = e.target.closest("[data-go]");
    if (!go) return;
    e.preventDefault();
    var v = go.getAttribute("data-go");
    if (v === "details") { renderDetails(); pixel("InitiateCheckout", { value: state.villa.total, currency: state.villa.currency, content_ids: [state.villa.key] }); }
    show(v);
  });

  // ---------- step 1: search ----------
  (function initDates() {
    var f = $("#search-form");
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var iso = function (d) { return d.toISOString().slice(0, 10); };
    var tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    f.checkin.min = iso(today);
    f.checkout.min = iso(tomorrow);
    f.checkin.addEventListener("change", function () {
      if (!f.checkin.value) return;
      var next = new Date(f.checkin.value); next.setDate(next.getDate() + 1);
      f.checkout.min = iso(next);
      if (!f.checkout.value || f.checkout.value <= f.checkin.value) f.checkout.value = iso(next);
    });
  })();

  $("#search-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, err = $("#search-error");
    err.hidden = true;
    if (!f.checkin.value || !f.checkout.value) { err.textContent = "Please choose both dates."; err.hidden = false; return; }
    if (f.checkout.value <= f.checkin.value) { err.textContent = "Check-out needs to be after check-in."; err.hidden = false; return; }
    state.search = { checkin: f.checkin.value, checkout: f.checkout.value, guests: Number(f.guests.value) };
    $("#view-dates").hidden = true;
    $("#view-loading").hidden = false;
    var q = new URLSearchParams(state.search).toString();
    fetch("/api/search?" + q)
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.d.error || "search_failed");
        state.results = res.d.villas || [];
        renderResults();
        show("results");
        pixel("Search", { checkin_date: state.search.checkin, checkout_date: state.search.checkout, num_adults: state.search.guests });
      })
      .catch(function () {
        show("dates");
        err.textContent = "We couldn't check the villas just now. Please try again, or WhatsApp us.";
        err.hidden = false;
      });
  });

  // ---------- step 2: results ----------
  function renderResults() {
    $("#results-summary").textContent = stayLine();
    var list = $("#results");
    list.innerHTML = "";
    state.results.forEach(function (v) {
      var c = CONTENT[v.key] || { card: "", photos: [] };
      var foot = v.available
        ? el("div", { class: "foot" }, [
            el("div", {}, [
              el("p", { class: "price", text: money(v.total, v.currency) }),
              el("p", { class: "price-note", text: "for " + v.nights + (v.nights === 1 ? " night" : " nights") + " · non-refundable" })
            ]),
            el("button", { class: "btn btn-primary", onclick: function () { openVilla(v.key); } }, ["Choose " + v.name])
          ])
        : el("div", { class: "foot" }, [
            el("p", { class: "booked", text: "Not available on these dates" }),
            el("a", { class: "btn btn-outline", href: "https://wa.me/6285190315820?text=" + encodeURIComponent("Hi Oasis, which dates are free at " + v.name + "?") }, ["Ask about " + v.name + "'s dates"])
          ]);
      list.appendChild(el("article", { class: "villa-card" }, [
        el("div", { class: "photo", role: "img", "aria-label": v.name + ", forest villa", style: "background-image:url('" + photo(c.photos[0], 900, 700) + "')" }),
        el("div", { class: "body" }, [
          el("p", { class: "eyebrow", text: "Forest villa" }),
          el("h2", { class: "display", text: v.name }),
          el("p", { class: "facts", text: "3 bedrooms · 3 ensuite bathrooms · private pool · full kitchen" }),
          el("p", { class: "blurb", text: c.card }),
          foot
        ])
      ]));
    });
    var avail = state.results.filter(function (v) { return v.available; });
    if (avail.length) pixel("ViewContent", { content_ids: avail.map(function (v) { return v.key; }), content_type: "hotel" });
  }

  // ---------- step 2b: villa ----------
  function openVilla(key) {
    var v = state.results.filter(function (x) { return x.key === key; })[0];
    if (!v) return;
    state.villa = v;
    var c = CONTENT[key];
    var g = $("#villa-gallery");
    g.innerHTML = "";
    c.photos.forEach(function (id, i) {
      g.appendChild(el("div", { class: i === 0 ? "g-main" : "", role: "img", "aria-label": v.name + " photo " + (i + 1), style: "background-image:url('" + photo(id, i === 0 ? 1400 : 700, i === 0 ? 900 : 500) + "')" }));
    });
    $("#villa-name").textContent = v.name;
    $("#villa-blurb").textContent = c.blurb;
    var pol = (v.cancellationPolicy || []).join(" ");
    $("#villa-cancel").textContent = pol || "Ask us about cancellation before you book.";
    $("#villa-dates").textContent = fmtDate(state.search.checkin) + " – " + fmtDate(state.search.checkout, true);
    $("#villa-guests").textContent = v.nights + (v.nights === 1 ? " night · " : " nights · ") + state.search.guests + " guests";
    var dl = $("#villa-breakdown");
    dl.innerHTML = "";
    (v.lines || []).forEach(function (l) {
      dl.appendChild(el("div", {}, [el("dt", { text: l.title }), el("dd", { text: money(l.amount, v.currency) })]));
    });
    dl.appendChild(el("div", { class: "total" }, [el("dt", { text: "Total" }), el("dd", { text: money(v.total, v.currency) })]));
    $("#villa-usd").textContent = v.totalUsd && v.currency !== "USD" ? "About " + money(v.totalUsd, "USD") + ". You pay in " + v.currency + "." : "";
    show("villa");
    pixel("ViewContent", { content_ids: [v.key], content_type: "hotel", value: v.total, currency: v.currency });
  }

  // ---------- step 3: details ----------
  function renderDetails() {
    var v = state.villa;
    $("#sum-name").textContent = v.name;
    $("#sum-dates").textContent = stayLine();
    $("#sum-total").textContent = money(v.total, v.currency);
    $("#pay-btn").textContent = "Confirm and pay " + money(v.total, v.currency);
  }

  // Payment: the secure card field is connected once Balinest's payment
  // provider (Guesty Pay or Stripe) is confirmed. Until then the button stays
  // disabled, so no booking can be made without payment.
  $("#details-form").addEventListener("submit", function (e) {
    e.preventDefault();
  });

  window.OasisBooking = { state: state, tracking: tracking };
})();
