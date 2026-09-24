const Typesense = require("typesense");

const TYPESENSE_HOST = process.env.TYPESENSE_HOST || "localhost";
const TYPESENSE_PORT = Number(process.env.TYPESENSE_PORT) || 8108;
const TYPESENSE_PROTOCOL = process.env.TYPESENSE_PROTOCOL || "http";
const TYPESENSE_API_KEY = process.env.TYPESENSE_API_KEY || "";

const { SUPPORTED_LANGUAGES } = require("./constants");

const DEALS_INDEX_NAME = "deals";

// Machine-translated titles (see translation.js indexTranslatedTitles), so a
// buyer can search in their own script - "जूते" finds "Mega Sale on Shoes".
// Optional: only filled once a title has been translated into that language.
const TRANSLATED_TITLE_FIELDS = SUPPORTED_LANGUAGES.map((lang) => `title_${lang}`);

const client = new Typesense.Client({
  nodes: [
    {
      host: TYPESENSE_HOST,
      port: TYPESENSE_PORT,
      protocol: TYPESENSE_PROTOCOL,
    },
  ],
  apiKey: TYPESENSE_API_KEY,
  // Short timeout - this is called from request handlers (search.js), so a
  // slow/unreachable Typesense shouldn't hang the whole request.
  connectionTimeoutSeconds: 3,
});

const DEALS_SCHEMA = {
  name: DEALS_INDEX_NAME,
  fields: [
    { name: "title", type: "string" },
    ...TRANSLATED_TITLE_FIELDS.map((name) => ({ name, type: "string", optional: true })),
    { name: "description", type: "string", optional: true },
    { name: "category", type: "string", facet: true, optional: true },
    { name: "location", type: "string", facet: true, optional: true },
    { name: "city", type: "string", facet: true, optional: true },
    { name: "deliveryMode", type: "string", facet: true, optional: true },
    { name: "sellerId", type: "string", facet: true, optional: true },
    { name: "sellerName", type: "string", optional: true },
    { name: "dealCode", type: "string", optional: true },
    { name: "status", type: "string", facet: true, optional: true },
    { name: "approvalStatus", type: "string", facet: true, optional: true },
    { name: "originalPrice", type: "float", optional: true },
    { name: "discountPrice", type: "float", optional: true },
    { name: "currentJoins", type: "int32", optional: true },
    { name: "minGroupSize", type: "int32", optional: true },
    { name: "expiresAtMs", type: "int64", facet: true, optional: true },
    // Not optional - Typesense requires the default_sorting_field to be a
    // required field. toTypesenseDocument() always computes this (defaults
    // to 0 if a deal is somehow missing createdAt), so that's safe.
    { name: "createdAtMs", type: "int64" },
    // Opaque JSON blob of the full list-projection deal shape
    // (sanitizeDealForListResponse) - returned as-is to the client so
    // search results render with the same fields as the browse feed,
    // without a second Firestore round trip per search.
    { name: "dealJson", type: "string" },
  ],
  default_sorting_field: "createdAtMs",
};

// Creates the collection if it doesn't exist yet. Safe to call repeatedly -
// used both on backend boot and as a manual "rebuild" utility.
async function ensureDealsCollection() {
  const exists = await client.collections(DEALS_INDEX_NAME).exists();
  if (!exists) {
    await client.collections().create(DEALS_SCHEMA);
    return;
  }
  // Collections created before the translated-title fields existed get
  // them added in place - no re-index needed, they're all optional.
  const current = await client.collections(DEALS_INDEX_NAME).retrieve();
  const existing = new Set((current.fields || []).map((field) => field.name));
  const missing = DEALS_SCHEMA.fields.filter((field) => !existing.has(field.name));
  if (missing.length) {
    await client.collections(DEALS_INDEX_NAME).update({ fields: missing });
  }
}

// ensureDealsCollection() once per process, for request paths (search) that
// may run before the first sync pass has migrated the schema.
let ensurePromise = null;
function ensureDealsCollectionOnce() {
  if (!ensurePromise) {
    ensurePromise = ensureDealsCollection().catch((error) => {
      ensurePromise = null;
      throw error;
    });
  }
  return ensurePromise;
}

module.exports = {
  client,
  DEALS_INDEX_NAME,
  DEALS_SCHEMA,
  TRANSLATED_TITLE_FIELDS,
  ensureDealsCollection,
  ensureDealsCollectionOnce,
};
