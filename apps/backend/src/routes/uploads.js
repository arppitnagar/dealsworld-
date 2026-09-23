const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");
const { requireAuth, requireRole } = require("../lib");

const router = express.Router();

const UPLOADS_ROOT = path.join(__dirname, "..", "..", "uploads");
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const THUMBNAIL_WIDTH = 480;

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dealsDir = path.join(UPLOADS_ROOT, "deals", req.user.uid);
    fs.mkdirSync(dealsDir, { recursive: true });
    cb(null, dealsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "") || ".jpg";
    cb(null, `${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, or WEBP images are allowed"));
    }
    cb(null, true);
  },
});

const MAX_DEAL_IMAGES = 6;

// Seller/admin uploads one or more deal images (a deal can carry a gallery
// of up to MAX_DEAL_IMAGES). Stored on the backend's own disk under
// uploads/deals/{sellerUid}/ and served back via the static /uploads route
// registered in src/app.js - avoids needing Firebase Storage's Blaze plan.
router.post(
  "/api/uploads/deal-images",
  requireAuth,
  requireRole("seller", "admin"),
  (req, res) => {
    upload.array("images", MAX_DEAL_IMAGES)(req, res, async (error) => {
      if (error) {
        return res.status(400).json({ error: error.message || "Upload failed" });
      }
      if (!req.files?.length) {
        return res.status(400).json({ error: "No image files provided" });
      }
      try {
        const images = await Promise.all(
          req.files.map(async (file) => {
            const relativePath = `deals/${req.user.uid}/${file.filename}`;
            const url = `${req.protocol}://${req.get("host")}/uploads/${relativePath}`;

            // Best-effort - a card in a list view has no business loading a
            // full-res original, but a failed thumbnail shouldn't fail the
            // whole upload, so fall back to the original URL.
            let thumbUrl = url;
            try {
              const thumbFilename = `${path.parse(file.filename).name}-thumb.webp`;
              const thumbPath = path.join(path.dirname(file.path), thumbFilename);
              await sharp(file.path)
                .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
                .webp({ quality: 75 })
                .toFile(thumbPath);
              thumbUrl = `${req.protocol}://${req.get("host")}/uploads/deals/${req.user.uid}/${thumbFilename}`;
            } catch (thumbError) {
              console.warn(
                "Failed to generate thumbnail for",
                file.filename,
                thumbError.message || thumbError,
              );
            }
            return { url, thumbUrl };
          }),
        );
        return res.json({
          urls: images.map((image) => image.url),
          thumbUrls: images.map((image) => image.thumbUrl),
        });
      } catch (processingError) {
        return res
          .status(500)
          .json({ error: processingError.message || "Failed to process images" });
      }
    });
  },
);

module.exports = router;
