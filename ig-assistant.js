/*
 * Instagram DM assistant for @oasisuluwatu and @daysatjati.
 *
 * Meta sends each new DM to POST /webhooks/instagram. Claude answers in the
 * voice of the account it came to, using live availability and direct prices
 * from Guesty (the same quotes the booking page uses), and a booking link with
 * the guest's dates filled in. Anything it can't settle (special requests,
 * discounts, complaints, existing bookings, or a guest asking for a person) is
 * handed over: it asks for the guest's WhatsApp number and emails the
 * hand-over to Azure, where the Guest Enquiries process opens a WhatsApp group.
 *
 * Settings (Render environment, never in this file):
 *   IG_ASSISTANT        "on" to send replies. Anything else: read and log only.
 *   IG_VERIFY_TOKEN     any long random string, also entered in the Meta app
 *   IG_APP_SECRET       the Meta app secret, to check each webhook is from Meta
 *   IG_ACCOUNTS         JSON list: [{"id":"<IG user id>","handle":"oasisuluwatu",
 *                       "brand":"oasis","token":"<IG access token>"}, ...]
 *   ANTHROPIC_API_KEY   Claude API key (Azure account, capitalsinar@gmail.com)
 *   AI_MODEL            default claude-sonnet-5-5
 *   HANDOFF_TO          who gets hand-overs, default capitalsinar@gmail.com
 *   IG_GRAPH_VERSION    default v23.0
 */
const crypto = require("crypto");

const BOOK = "https://book.oasisuluwatu.com";
const MAX_HISTORY = 24;            // messages kept per conversation
const HUMAN_PAUSE_MS = 24 * 3600e3; // a person replied in the app: stay quiet a day

// ---------------------------------------------------------------------------
// Voices, from the "Brand language" tab of the Azure Villa Directory
// ---------------------------------------------------------------------------
const VOICE = {
  oasis: `You write for Oasis Uluwatu: two forest houses, Oasis Palem and Oasis Kapuk, in Pecatu, Uluwatu, plus Oasis Jati, a third, darker house on the same lane.
Voice: calm, nature-led, quietly confident. Short sentences. Plain reassurance on practical points. At most one sensory detail.
Words that fit: the house, your forest house, the teak canopy, the limestone, morning light, the courtyard, the Green Sukabumi pool, close to everything, quiet by design.
Never: exclamation marks, "stunning", "amazing", "luxury", hard selling, "jungle" (it's a forest), "beachfront" or "ocean view" (it isn't).
Emoji: none, or one at most.
Sign off as "Oasis" only if a sign-off is natural.`,
  jati: `You write for Oasis Jati ("Days at Jati"): a house for slower days in Pecatu, Uluwatu. Dark teak stained near black, espresso limewash, banana-paper screens, rationed light. Designed by Sidarta & Sandjaja, interiors by Michelle Arderia of BUD Studio.
Voice: editorial and restrained. Few words, each chosen. Calm, unhurried rhythm. One image at most.
Words that fit: the house, a house for slower days, somewhere to stop, stillness, rooted in place, built to last.
Never: exclamation marks, emoji, "luxury", "stunning", "Instagrammable", "bright", amenity lists, over-explaining.
Sign off as "Jati" only if a sign-off is natural.`,
};

function systemPrompt(brand, handle) {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Makassar" });
  return `${VOICE[brand] || VOICE.oasis}

You are replying to Instagram direct messages sent to @${handle}. Today is ${today} (Bali time).

How to answer:
- Always write in English. Use the guest's first name if you know it. Plain text only: no markdown, no bullet symbols, no headings. Keep each reply under 600 characters.
- You speak for the team. If someone asks whether you are a person or a bot, say honestly that you are the house's automated assistant and that a teammate can take over on WhatsApp.
- To give availability or a price you need: check-in date, check-out date, number of adults and number of children (and children's ages). Ask for whatever is missing, briefly, in one message.
- Never state a price, availability or a fact you did not get from a tool in this conversation. Never guess.
- Prices: use check_availability. Give the total and the price per night in IDR, say it is the direct rate, non-refundable, and paid by card on our booking page, then give that villa's booking link exactly as the tool returned it. Don't compare with Airbnb or other sites.
- Villas: Oasis Palem and Oasis Kapuk (3 bedrooms, up to 6 guests each, private pool), Oasis Jati (3 bedrooms, up to 6 guests). Minimum stay is usually 2 nights; check-in from 3pm, checkout by 11am.
- Families: if any child is under 10, don't suggest Jati unless the guest asks about Jati by name.
- Groups of 7 to 12: Palem and Kapuk can be taken together; that is a hand-over.
- If nothing is free, say so simply and offer to have a teammate look at nearby dates on WhatsApp.
- Hand over to a person for: special requests (cots, occasions, early check-in, airport transfers), discounts or price negotiation, flexible cancellation, two villas together, complaints, an existing booking, payment problems, anything you are unsure about, or when the guest asks for a person. To hand over: ask for their WhatsApp number with country code; once they give it, call hand_over, then tell them a teammate will message them on WhatsApp shortly. Don't call hand_over without a number unless the guest refuses to give one.
- Never mention internal words or partners' internal matters (no "Guesty", "Balinest", "compset", "SOP").`;
}

// ---------------------------------------------------------------------------
module.exports = function attachInstagramAssistant(app, deps) {
  const { VILLAS, quoteVilla, getListing, sendEmail } = deps;
  const convos = new Map();     // `${accountId}:${senderId}` -> { history, pausedUntil, handedOff, lastAt }
  const ourMids = new Set();    // message ids we sent, to tell our echoes from a person's

  const accounts = () => { try { return JSON.parse(process.env.IG_ACCOUNTS || "[]"); } catch (e) { return []; } };
  const live = () => process.env.IG_ASSISTANT === "on";

  // --- Meta's one-time webhook check -------------------------------------------
  app.get("/webhooks/instagram", (req, res) => {
    if (req.query["hub.mode"] === "subscribe" && process.env.IG_VERIFY_TOKEN && req.query["hub.verify_token"] === process.env.IG_VERIFY_TOKEN) {
      return res.status(200).send(String(req.query["hub.challenge"] || ""));
    }
    res.sendStatus(403);
  });

  // --- Incoming messages ---------------------------------------------------------
  app.post("/webhooks/instagram", (req, res) => {
    const secret = process.env.IG_APP_SECRET;
    const sig = req.get("x-hub-signature-256") || "";
    if (!secret || !req.rawBody) return res.sendStatus(403);
    const want = "sha256=" + crypto.createHmac("sha256", secret).update(req.rawBody).digest("hex");
    if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return res.sendStatus(403);
    res.sendStatus(200); // answer Meta at once; the reply is worked out after
    const body = req.body || {};
    if (body.object !== "instagram") return;
    for (const entry of body.entry || []) {
      for (const ev of entry.messaging || []) handleEvent(entry.id, ev).catch((e) => console.error("ig_error:", e.message));
    }
  });

  async function handleEvent(accountId, ev) {
    const msg = ev.message;
    if (!msg) return;
    const acct = accounts().find((a) => String(a.id) === String(accountId) || String(a.id) === String(ev.recipient?.id) || String(a.id) === String(ev.sender?.id));
    if (!acct) { console.log("IG unknown account", accountId); return; }

    // Echo of a message sent from our side: ours, or a person typing in the app.
    if (msg.is_echo) {
      if (ourMids.has(msg.mid)) return;
      const c = convo(acct.id, ev.recipient?.id);
      c.pausedUntil = Date.now() + HUMAN_PAUSE_MS;
      c.history.push({ role: "assistant", content: "[A teammate replied in the app]: " + (msg.text || "(attachment)") });
      console.log("IG human reply, assistant paused", acct.handle);
      return;
    }

    const guestId = ev.sender?.id;
    const c = convo(acct.id, guestId);
    const text = msg.text || (msg.attachments ? "[The guest sent " + msg.attachments.map((a) => a.type).join(", ") + "]" : "");
    if (!text) return;
    c.history.push({ role: "user", content: text });
    c.lastAt = Date.now();
    trim(c);
    console.log("IG in", acct.handle, guestId, JSON.stringify(text.slice(0, 200)));

    if (c.handedOff || Date.now() < c.pausedUntil) return; // a person has it
    if (!process.env.ANTHROPIC_API_KEY) { console.log("IG no AI key, not replying"); return; }

    const reply = await think(acct, guestId, c);
    if (!reply) return;
    c.history.push({ role: "assistant", content: reply });
    trim(c);
    if (!live()) { console.log("IG DRY RUN reply", acct.handle, JSON.stringify(reply.slice(0, 300))); return; }
    await send(acct, guestId, reply);
  }

  function convo(accountId, guestId) {
    const k = accountId + ":" + guestId;
    let c = convos.get(k);
    if (!c || Date.now() - c.lastAt > 7 * 24 * 3600e3) {
      c = { history: [], pausedUntil: 0, handedOff: false, lastAt: Date.now(), guestId, accountId };
      convos.set(k, c);
    }
    return c;
  }
  function trim(c) { while (c.history.length > MAX_HISTORY) c.history.shift(); }

  // --- Claude, with three tools --------------------------------------------------
  const TOOLS = [
    {
      name: "check_availability",
      description: "Live availability and the direct, non-refundable price for Oasis Palem, Oasis Kapuk and Oasis Jati for exact dates and party size. Returns each villa's total in IDR, nights, price per night and a booking link with the dates filled in.",
      input_schema: {
        type: "object",
        properties: {
          checkin: { type: "string", description: "YYYY-MM-DD" },
          checkout: { type: "string", description: "YYYY-MM-DD" },
          adults: { type: "integer", minimum: 1 },
          children: { type: "integer", minimum: 0 },
        },
        required: ["checkin", "checkout", "adults"],
      },
    },
    {
      name: "villa_facts",
      description: "Facts about a villa from its live listing: check-in and checkout times, minimum stay, what is included, what can be arranged at extra cost, house rules.",
      input_schema: { type: "object", properties: { villa: { type: "string", enum: ["palem", "kapuk", "jati"] } }, required: ["villa"] },
    },
    {
      name: "hand_over",
      description: "Pass the conversation to a person on WhatsApp. Call only after the guest has given a WhatsApp number (or refused to).",
      input_schema: {
        type: "object",
        properties: {
          whatsapp: { type: "string", description: "Guest's WhatsApp number with country code, or empty if refused" },
          guest_name: { type: "string" },
          reason: { type: "string", description: "Why a person is needed, in a few words" },
          summary: { type: "string", description: "What the guest wants: dates, party, villa, requests, prices already given" },
        },
        required: ["reason", "summary"],
      },
    },
  ];

  async function runTool(acct, c, name, input) {
    if (name === "check_availability") {
      const { checkin, checkout } = input;
      const adults = Math.max(1, Number(input.adults) || 1), children = Math.max(0, Number(input.children) || 0);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(checkin || "") || !/^\d{4}-\d{2}-\d{2}$/.test(checkout || "") || checkout <= checkin) return { error: "Dates need to be YYYY-MM-DD with checkout after check-in." };
      if (checkin < new Date().toISOString().slice(0, 10)) return { error: "Check-in date has passed." };
      const nights = Math.round((new Date(checkout) - new Date(checkin)) / 86400000);
      const guests = adults + children;
      const pick = VILLAS.filter((v) => ["palem", "kapuk", "jati"].includes(v.key));
      const quotes = await Promise.all(pick.map((v) => quoteVilla(v, checkin, checkout, Math.min(guests, 6))));
      return {
        checkin, checkout, nights, adults, children,
        note: guests > 6 ? "Each villa sleeps up to 6. A larger group needs two villas: hand over." : undefined,
        villas: quotes.map((q) => {
          const v = pick.find((x) => x.key === q.key);
          const name = { palem: "Oasis Palem", kapuk: "Oasis Kapuk", jati: "Oasis Jati" }[q.key];
          if (!q.available) return { villa: name, available: false, why: nights < 2 ? "Minimum stay is 2 nights" : "Booked for these dates" };
          const link = BOOK + "/?" + new URLSearchParams({ checkin, checkout, adults: String(adults), children: String(children), villa: v.group === "forest" ? "forest" : v.key, from: "ig-" + acct.handle }).toString();
          return { villa: name, available: true, total_idr: Math.round(q.total), per_night_idr: Math.round(q.total / nights), non_refundable: true, booking_link: link };
        }),
      };
    }
    if (name === "villa_facts") {
      const l = await getListing(input.villa).catch(() => null);
      if (!l) return { error: "Listing details unavailable right now." };
      const pd = l.publicDescription || {};
      return {
        villa: input.villa, check_in_from: l.checkInTime, check_out_by: l.checkOutTime, minimum_nights: l.terms?.minNights,
        max_guests: 6, bedrooms: l.bedrooms, bathrooms: l.bathrooms,
        included_and_extras: pd.access || "", house_rules: pd.houseRules || "",
        amenities: (l.amenities || []).slice(0, 60),
      };
    }
    if (name === "hand_over") {
      c.handedOff = true;
      const subject = "Instagram hand-over: @" + acct.handle + (input.guest_name ? " · " + input.guest_name : "") + (input.whatsapp ? " · " + input.whatsapp : "");
      const convoText = c.history.map((m) => (m.role === "user" ? "Guest: " : "Us: ") + (typeof m.content === "string" ? m.content : "")).join("\n");
      const text = `A guest on Instagram (@${acct.handle}) needs a person. Please open a WhatsApp chat or group with them and continue under the Azure Guest Enquiries process.

Guest name: ${input.guest_name || "(not given)"}
WhatsApp: ${input.whatsapp || "(not given)"}
Instagram user id: ${c.guestId}
Why: ${input.reason}
Summary: ${input.summary}

Conversation so far:
${convoText}`;
      console.log("IG HANDOFF", JSON.stringify({ handle: acct.handle, guest: c.guestId, whatsapp: input.whatsapp, reason: input.reason }));
      await sendEmail({ to: (process.env.HANDOFF_TO || "capitalsinar@gmail.com").split(","), subject, text }).catch((e) => console.error("handoff_email_failed:", e.message));
      return { ok: true, note: "A teammate will contact the guest on WhatsApp." };
    }
    return { error: "Unknown tool" };
  }

  async function think(acct, guestId, c) {
    const messages = c.history.map((m) => ({ role: m.role, content: m.content }));
    while (messages.length && messages[0].role !== "user") messages.shift();
    for (let i = 0; i < 5; i++) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: process.env.AI_MODEL || "claude-sonnet-5-5", max_tokens: 700, system: systemPrompt(acct.brand, acct.handle), tools: TOOLS, messages }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data) { console.error("ig_ai_failed:", r.status, JSON.stringify(data).slice(0, 300)); return null; }
      messages.push({ role: "assistant", content: data.content });
      if (data.stop_reason !== "tool_use") {
        return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim() || null;
      }
      const results = [];
      for (const b of data.content) {
        if (b.type !== "tool_use") continue;
        const out = await runTool(acct, c, b.name, b.input || {}).catch((e) => ({ error: e.message }));
        results.push({ type: "tool_result", tool_use_id: b.id, content: JSON.stringify(out) });
      }
      messages.push({ role: "user", content: results });
    }
    return null;
  }

  // --- Send a DM (split at Instagram's 1,000-character limit) --------------------
  async function send(acct, guestId, text) {
    const parts = [];
    let rest = text;
    while (rest.length > 950) { const cut = rest.lastIndexOf("\n", 950) > 400 ? rest.lastIndexOf("\n", 950) : rest.lastIndexOf(" ", 950); parts.push(rest.slice(0, cut)); rest = rest.slice(cut).trim(); }
    parts.push(rest);
    const ver = process.env.IG_GRAPH_VERSION || "v23.0";
    for (const p of parts) {
      const r = await fetch(`https://graph.instagram.com/${ver}/${acct.id}/messages`, {
        method: "POST",
        headers: { Authorization: "Bearer " + acct.token, "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: guestId }, message: { text: p } }),
      });
      const out = await r.json().catch(() => ({}));
      if (out.message_id) ourMids.add(out.message_id);
      console.log("IG out", acct.handle, r.status, JSON.stringify(p.slice(0, 120)));
    }
  }

  // Status for checking the set-up without exposing anything secret.
  app.get("/api/ig-status", (req, res) => {
    res.json({
      live: live(),
      accounts: accounts().map((a) => ({ handle: a.handle, brand: a.brand, hasToken: !!a.token })),
      aiKey: !!process.env.ANTHROPIC_API_KEY,
      verifyToken: !!process.env.IG_VERIFY_TOKEN,
      appSecret: !!process.env.IG_APP_SECRET,
      openConversations: convos.size,
    });
  });
};
