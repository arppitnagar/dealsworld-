// Resolves a deal's image gallery. Prefers the `images` array; falls back to
// the legacy single `imageUrl`/`image` field for deals saved before
// multi-image support existed.
export function getDealImages(deal) {
  if (!deal) return [];
  if (Array.isArray(deal.images)) {
    const cleaned = deal.images.filter((url) => typeof url === "string" && url.trim());
    if (cleaned.length) return cleaned;
  }
  const single = deal.imageUrl || deal.image;
  return single ? [single] : [];
}
