const express = require("express");
const { client, DEALS_INDEX_NAME } = require("../typesenseClient");

const router = express.Router();

const SEARCH_QUERY_BY = "title,description,category,location,sellerName,dealCode";

function escapeFilterValue(value) {
  // Typesense string filter values are backtick-quoted; strip any backticks
  // from the input rather than trying to escape them - none of the fields
  // filtered here legitimately contain one.
  return "`" + String(value).replace(/`/g, "") + "`";
}

// Buyer marketplace-wide search (apps/buyer/src/screens/SearchScreen.js).
// Seller's own-deals search stays on its existing client-side filtering
// over useSellerLiveDeals() - that list is already scoped to one seller's
// deals (a small, already real-time dataset), so it doesn't have the
// marketplace-wide scale problem this endpoint exists to solve, and moving
// it here would trade away real-time freshness for no real benefit.
router.get("/api/deals/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim() || "*";
    const category = String(req.query.category || "").trim();
    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);
    const limitRaw = Number(req.query.limit);
    const perPage = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
    const pageRaw = Number(req.query.page);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

    // Forced server-side regardless of client input - search must never
    // surface unapproved/inactive deals no matter what the client sends.
    const filters = ["status:=active", "approvalStatus:=approved"];
    if (category) filters.push(`category:=${escapeFilterValue(category)}`);
    if (Number.isFinite(minPrice)) filters.push(`discountPrice:>=${minPrice}`);
    if (Number.isFinite(maxPrice)) filters.push(`discountPrice:<=${maxPrice}`);

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
      deals,
      found: searchResult.found || 0,
      page,
    });
  } catch (error) {
    // Search now depends on a second service with no built-in HA - fail
    // clearly rather than crashing the request or silently returning
    // nothing indistinguishable from "no matches."
    console.warn("Deal search failed:", error.message || error);
    return res.status(503).json({ error: "Search is temporarily unavailable" });
  }
});

module.exports = router;
