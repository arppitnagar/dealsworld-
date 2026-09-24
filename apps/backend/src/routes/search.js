const express = require("express");
const {
  client,
  DEALS_INDEX_NAME,
  TRANSLATED_TITLE_FIELDS,
  ensureDealsCollectionOnce,
} = require("../typesenseClient");
const { localizeDeals } = require("../translation");
const {
  db,
  DEALS_COLLECTION,
  MAX_DEAL_LIMIT,
  isExpiredDeal,
  normalizeApprovalStatus,
  sanitizeDealForResponse,
  attachSellerNamesToDeals,
} = require("../lib");

const router = express.Router();

// title_<lang> fields let a buyer search in their own script (see
// translation.js indexTranslatedTitles).
const SEARCH_QUERY_BY = [
  "title",
  ...TRANSLATED_TITLE_FIELDS,
  "description",
  "category",
  "location",
  "sellerName",
  "dealCode",
].join(",");

function escapeFilterValue(value) {
  // Typesense string filter values are backtick-quoted; strip any backticks
  // from the input rather than trying to escape them - none of the fields
  // filtered here legitimately contain one.
  return "`" + String(value).replace(/`/g, "") + "`";
}

// Typesense-free fallback for environments where it isn't hosted (e.g. the
// demo deploy). Scans active deals in Node instead of using a search index -
// fine at demo scale, not something to rely on at real marketplace scale.
async function searchDealsViaFirestore({ q, category, city, minPrice, maxPrice, page, perPage }) {
  const nowMs = Date.now();
  const snapshot = await db
    .collection(DEALS_COLLECTION)
    .where("status", "==", "active")
    .orderBy("createdAt", "desc")
    .limit(MAX_DEAL_LIMIT)
    .get();

  const needle = q && q !== "*" ? q.toLowerCase() : "";
  const cityNeedle = city.toLowerCase();

  const matches = snapshot.docs.map((doc) => sanitizeDealForResponse(doc)).filter((deal) => {
    if (isExpiredDeal(deal, nowMs)) return false;
    if (normalizeApprovalStatus(deal) !== "approved") return false;
    if (category && deal.category !== category) return false;
    if (cityNeedle && String(deal.cityLower || "") !== cityNeedle) return false;
    if (Number.isFinite(minPrice) && !(Number(deal.discountPrice) >= minPrice)) return false;
    if (Number.isFinite(maxPrice) && !(Number(deal.discountPrice) <= maxPrice)) return false;
    if (needle) {
      const haystack = [deal.title, deal.description, deal.category, deal.location, deal.sellerName, deal.dealCode]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const start = (page - 1) * perPage;
  const pageDeals = await attachSellerNamesToDeals(matches.slice(start, start + perPage));
  return { deals: pageDeals, found: matches.length };
}

// Buyer marketplace-wide search (apps/buyer/src/screens/SearchScreen.js).
// Seller's own-deals search stays on its existing client-side filtering
// over useSellerLiveDeals() - that list is already scoped to one seller's
// deals (a small, already real-time dataset), so it doesn't have the
// marketplace-wide scale problem this endpoint exists to solve, and moving
// it here would trade away real-time freshness for no real benefit.
router.get("/api/deals/search", async (req, res) => {
  const q = String(req.query.q || "").trim() || "*";
  const category = String(req.query.category || "").trim();
  const city = String(req.query.city || "").trim();
  const minPrice = Number(req.query.minPrice);
  const maxPrice = Number(req.query.maxPrice);
  const limitRaw = Number(req.query.limit);
  const perPage = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
  const pageRaw = Number(req.query.page);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  try {
    // Forced server-side regardless of client input - search must never
    // surface unapproved/inactive deals no matter what the client sends.
    const filters = ["status:=active", "approvalStatus:=approved"];
    if (category) filters.push(`category:=${escapeFilterValue(category)}`);
    if (city) filters.push(`city:=${escapeFilterValue(city)}`);
    if (Number.isFinite(minPrice)) filters.push(`discountPrice:>=${minPrice}`);
    if (Number.isFinite(maxPrice)) filters.push(`discountPrice:<=${maxPrice}`);

    await ensureDealsCollectionOnce();
    const searchResult = await client
      .collections(DEALS_INDEX_NAME)
      .documents()
      .search({
        q,
        query_by: SEARCH_QUERY_BY,
        filter_by: filters.join(" && "),
        page,
        per_page: perPage,
      });

    const deals = (searchResult.hits || [])
      .map((hit) => {
        try {
          return JSON.parse(hit.document.dealJson);
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean);

    return res.json({
      deals: await localizeDeals(deals, req.query.lang),
      found: searchResult.found || 0,
      page,
    });
  } catch (error) {
    console.warn("Typesense search failed, falling back to Firestore:", error.message || error);
    try {
      const { deals, found } = await searchDealsViaFirestore({ q, category, city, minPrice, maxPrice, page, perPage });
      return res.json({ deals: await localizeDeals(deals, req.query.lang), found, page });
    } catch (fallbackError) {
      console.warn("Firestore search fallback also failed:", fallbackError.message || fallbackError);
      return res.status(503).json({ error: "Search is temporarily unavailable" });
    }
  }
});

module.exports = router;
