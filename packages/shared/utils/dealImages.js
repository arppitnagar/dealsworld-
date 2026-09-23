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

// List/card views should never load full-res originals - see
// apps/backend/src/routes/uploads.js for where thumbUrl/thumbImages get
// generated. Deals saved before thumbnails existed have no thumbImages, so
// this falls back to the full-res gallery for those.
export function getDealThumbnails(deal) {
  if (!deal) return [];
  if (Array.isArray(deal.thumbImages)) {
    const cleaned = deal.thumbImages.filter(
      (url) => typeof url === "string" && url.trim(),
    );
    if (cleaned.length) return cleaned;
  }
  if (deal.thumbUrl) return [deal.thumbUrl];
  return getDealImages(deal);
}
