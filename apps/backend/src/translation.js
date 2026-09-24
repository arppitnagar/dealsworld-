// Deal title/description translation for buyers' preferred language.
//
// Translated lazily at read time, not when a deal is saved - deal creation
// and most edits are direct client-side Firestore writes from the seller
// app's CreateDealScreen.js (see typesenseSync.js), so a save-time hook in
// the backend routes would miss them. Each (deal, field, language) is sent
// to Azure Translator at most once, then served from:
//   1. an in-process LRU cache (no Firestore read at all), then
//   2. dealTranslations/{dealId} in Firestore (survives restarts).
// Stored translations are keyed to a hash of the source text, so a seller
// editing the title/description invalidates them automatically, no matter
// which code path made the edit.
//
// A slow or failing translation never blocks a response: past
// TRANSLATION_WAIT_MS the original text is returned and the translation
// keeps going in the background, ready for the next request. With no
// AZURE_TRANSLATOR_KEY set, everything returns the original text.
const crypto = require("crypto");
const { db } = require("./firebase");
const { DEAL_TRANSLATIONS_COLLECTION, SUPPORTED_LANGUAGES } = require("./constants");
const { client: typesenseClient, DEALS_INDEX_NAME } = require("./typesenseClient");

const AZURE_TRANSLATOR_KEY = process.env.AZURE_TRANSLATOR_KEY || "";
const AZURE_TRANSLATOR_REGION = process.env.AZURE_TRANSLATOR_REGION || "";
const AZURE_TRANSLATOR_ENDPOINT =
  process.env.AZURE_TRANSLATOR_ENDPOINT || "https://api.cognitive.microsofttranslator.com";
const TRANSLATION_WAIT_MS = Number(process.env.TRANSLATION_WAIT_MS) || 1200;
const AZURE_REQUEST_TIMEOUT_MS = 10_000;

// Azure allows 1000 items / 50k characters per request; stay well under.
const MAX_BATCH_ITEMS = 100;
const MAX_BATCH_CHARS = 20_000;

const CACHE_MAX_ENTRIES = 20_000;

const SUPPORTED_SET = new Set(SUPPORTED_LANGUAGES);

function normalizeLanguage(value) {
  const base = String(value || "").trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_SET.has(base) ? base : null;
}

function isTranslationEnabled() {
  return Boolean(AZURE_TRANSLATOR_KEY);
}

function hashText(text) {
  return crypto.createHash("sha1").update(text).digest("hex").slice(0, 16);
}

// --- in-process LRU (Map keeps insertion order) --------------------------

const cache = new Map();

function cacheGet(key) {
  if (!cache.has(key)) return undefined;
  const value = cache.get(key);
  cache.delete(key);
  cache.set(key, value);
  return value;
}

function cacheSet(key, value) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  if (cache.size > CACHE_MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
}

const textKey = (dealId, field, hash, lang) => `${dealId}|${field}|${hash}|${lang}`;
const sourceKey = (dealId, field, hash) => `${dealId}|${field}|${hash}|@source`;

// --- Azure Translator ----------------------------------------------------

function chunkForAzure(items) {
  const chunks = [];
  let current = [];
  let chars = 0;
  items.forEach((item) => {
    if (
      current.length > 0 &&
      (current.length >= MAX_BATCH_ITEMS || chars + item.text.length > MAX_BATCH_CHARS)
    ) {
      chunks.push(current);
      current = [];
      chars = 0;
    }
    current.push(item);
    chars += item.text.length;
  });
  if (current.length > 0) chunks.push(current);
  return chunks;
}

// Returns [{ text, detected }] in the same order as `texts`.
async function azureTranslate(texts, to) {
  const url = `${AZURE_TRANSLATOR_ENDPOINT}/translate?api-version=3.0&textType=plain&to=${to}`;
  const headers = {
    "Content-Type": "application/json",
    "Ocp-Apim-Subscription-Key": AZURE_TRANSLATOR_KEY,
  };
  if (AZURE_TRANSLATOR_REGION) headers["Ocp-Apim-Subscription-Region"] = AZURE_TRANSLATOR_REGION;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(texts.map((text) => ({ Text: text }))),
    signal: AbortSignal.timeout(AZURE_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Azure Translator ${response.status}: ${body.slice(0, 200)}`);
  }
  const results = await response.json();
  return results.map((result) => ({
    text: result?.translations?.[0]?.text ?? null,
    detected: result?.detectedLanguage?.language || null,
  }));
}

// --- search index ----------------------------------------------------------

// Partial update of each deal's title_<lang> in Typesense. Fire-and-forget:
// a deal not in the index (not active/approved, or not synced yet) just
// fails that one row, and search working without it is fine.
function indexTranslatedTitles(chunk, results, lang) {
  const updates = chunk
    .map((item) => {
      const hit = results.get(item.dealId);
      // Source already in this language - the plain title field covers it.
      if (!hit || hit.source === lang) return null;
      return { id: item.dealId, [`title_${lang}`]: hit.text };
    })
    .filter(Boolean);
  if (!updates.length) return;
  typesenseClient
    .collections(DEALS_INDEX_NAME)
    .documents()
    .import(updates, { action: "update" })
    .catch(() => {
      // import() rejects if any row failed (e.g. deal not indexed) - the
      // rest still applied.
    });
}

// Languages buyers have actually requested since this process started -
// the only ones worth translating new deals into ahead of time. English is
// excluded: most sellers write in English, and a Hindi-source deal still
// gets its English title lazily on first English view.
const requestedLanguages = new Set();

function prewarmTitleTranslations(deals) {
  if (!isTranslationEnabled() || !deals.length) return;
  requestedLanguages.forEach((lang) => {
    translateField(
      deals.map((deal) => ({ dealId: deal.id, text: deal.title })),
      "title",
      lang,
      { waitMs: 0 },
    ).catch((error) => {
      console.warn(`Pre-translating titles to ${lang} failed:`, error.message || error);
    });
  });
}

// --- core ----------------------------------------------------------------

// Concurrent requests for the same missing translation share one Azure call.
const inFlight = new Map();

// dealTranslations/{dealId} shape - every entry carries the hash of the
// source text it was made from, and is ignored once that no longer matches:
//   { title: { src: { h, lang }, hi: { h, t }, mr: { h, t } },
//     description: { ... } }
// Writes only ever touch their own language's entry (plus `src`), so two
// languages being translated at once can't clobber each other.
//
// Translates `field` of each item into `lang`, then persists the results.
// items: [{ dealId, text, hash }]
async function translateAndStore(items, field, lang) {
  const results = new Map();
  for (const chunk of chunkForAzure(items)) {
    const translated = await azureTranslate(chunk.map((item) => item.text), lang);
    const batch = db.batch();
    chunk.forEach((item, index) => {
      const { text: translatedText, detected } = translated[index] || {};
      if (!translatedText) return;
      const source = normalizeLanguage(detected) || detected || null;
      // Source already in the target language - keep the seller's own text
      // rather than Azure's round-trip of it.
      const finalText = source === lang ? item.text : translatedText;

      cacheSet(textKey(item.dealId, field, item.hash, lang), finalText);
      if (source) cacheSet(sourceKey(item.dealId, field, item.hash), source);
      results.set(item.dealId, { text: finalText, source });

      const ref = db.collection(DEAL_TRANSLATIONS_COLLECTION).doc(item.dealId);
      const entry = { [lang]: { h: item.hash, t: finalText } };
      const mergeFields = [`${field}.${lang}`];
      if (source) {
        entry.src = { h: item.hash, lang: source };
        mergeFields.push(`${field}.src`);
      }
      batch.set(ref, { [field]: entry }, { mergeFields });
    });
    // Already in the memory cache either way - failing to persist (e.g.
    // Firestore quota exhausted) only means paying for it again after a
    // restart, so it mustn't throw away this request's translations.
    await batch.commit().catch((error) => {
      console.warn(`Saving deal ${field} translations failed:`, error.message || error);
    });
    if (field === "title") indexTranslatedTitles(chunk, results, lang);
  }
  return results;
}

// entries: [{ dealId, text }]. Resolves to Map(dealId -> { text, source })
// for every entry it could translate in time; entries missing from the map
// should keep their original text.
async function translateField(entries, field, lang, { waitMs = TRANSLATION_WAIT_MS } = {}) {
  const out = new Map();
  const pending = [];

  entries.forEach(({ dealId, text }) => {
    const source = String(text || "").trim();
    if (!dealId || !source) return;
    const hash = hashText(source);
    const cachedSource = cacheGet(sourceKey(dealId, field, hash));
    if (cachedSource === lang) {
      out.set(dealId, { text: source, source: cachedSource });
      return;
    }
    const cached = cacheGet(textKey(dealId, field, hash, lang));
    if (cached !== undefined) {
      out.set(dealId, { text: cached, source: cachedSource || null });
      return;
    }
    pending.push({ dealId, text: source, hash });
  });

  if (pending.length === 0 || !isTranslationEnabled()) return out;

  // Firestore: one batched read for everything the memory cache missed.
  const refs = [...new Set(pending.map((item) => item.dealId))].map((id) =>
    db.collection(DEAL_TRANSLATIONS_COLLECTION).doc(id),
  );
  let storedById = new Map();
  try {
    const snaps = await db.getAll(...refs);
    storedById = new Map(snaps.map((snap) => [snap.id, snap.exists ? snap.data() : null]));
  } catch (error) {
    // Treat as "nothing stored" and translate anyway - the memory cache
    // still stops that from repeating on every request.
    console.warn(`Reading deal ${field} translations failed:`, error.message || error);
  }

  const toTranslate = [];
  pending.forEach((item) => {
    const storedField = storedById.get(item.dealId)?.[field] || {};
    const source = storedField.src?.h === item.hash ? storedField.src.lang : null;
    if (source) {
      cacheSet(sourceKey(item.dealId, field, item.hash), source);
      if (source === lang) {
        out.set(item.dealId, { text: item.text, source });
        return;
      }
    }
    const stored = storedField[lang];
    if (stored?.h === item.hash && typeof stored.t === "string") {
      cacheSet(textKey(item.dealId, field, item.hash, lang), stored.t);
      out.set(item.dealId, { text: stored.t, source });
      return;
    }
    const flightKey = textKey(item.dealId, field, item.hash, lang);
    if (inFlight.has(flightKey)) return;
    toTranslate.push({ ...item, flightKey });
  });

  if (toTranslate.length === 0) return out;

  const work = translateAndStore(toTranslate, field, lang)
    .catch((error) => {
      console.warn(`Deal ${field} translation to ${lang} failed:`, error.message || error);
      return new Map();
    })
    .finally(() => toTranslate.forEach((item) => inFlight.delete(item.flightKey)));
  toTranslate.forEach((item) => inFlight.set(item.flightKey, work));

  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), waitMs);
  });
  const translated = await Promise.race([work, timeout]);
  clearTimeout(timer);
  if (translated) translated.forEach((value, dealId) => out.set(dealId, value));
  return out;
}

// Swaps each deal's title (and optionally description) for its `lang`
// translation. The seller's text stays available as originalTitle /
// originalDescription for the buyer app's "Show original" toggle.
async function localizeDeals(deals, lang, { fields = ["title"] } = {}) {
  const target = normalizeLanguage(lang);
  if (!target || !Array.isArray(deals) || deals.length === 0) return deals;
  if (target !== "en") requestedLanguages.add(target);

  try {
    const byField = {};
    await Promise.all(
      fields.map(async (field) => {
        byField[field] = await translateField(
          deals.map((deal) => ({ dealId: deal?.id, text: deal?.[field] })),
          field,
          target,
        );
      }),
    );

    return deals.map((deal) => {
      let next = deal;
      fields.forEach((field) => {
        const hit = byField[field]?.get(deal?.id);
        if (!hit) return;
        const original = String(deal[field] || "").trim();
        if (field === "title") next = { ...next, sourceLanguage: hit.source || null };
        if (hit.text === original) return;
        const originalKey = `original${field[0].toUpperCase()}${field.slice(1)}`;
        next = { ...next, [field]: hit.text, [originalKey]: deal[field], translatedTo: target };
      });
      return next;
    });
  } catch (error) {
    // Translation is a nice-to-have on top of the deal data - never fail
    // the whole request over it.
    console.warn("Localizing deals failed:", error.message || error);
    return deals;
  }
}

// One deal field (e.g. a notification quoting the deal title) in `lang`,
// through the same caches as localizeDeals. Resolves to the original text
// if it can't be translated within waitMs.
async function translateDealText(dealId, field, text, lang, { waitMs } = {}) {
  const target = normalizeLanguage(lang);
  const original = String(text || "");
  if (!target || !dealId || !original.trim()) return original;
  try {
    const result = await translateField([{ dealId, text: original }], field, target, { waitMs });
    return result.get(dealId)?.text ?? original;
  } catch (error) {
    console.warn("Translating deal text failed:", error.message || error);
    return original;
  }
}

module.exports = {
  translateDealText,
  prewarmTitleTranslations,
  normalizeLanguage,
  isTranslationEnabled,
  localizeDeals,
};
