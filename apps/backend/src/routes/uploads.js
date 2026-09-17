const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { requireAuth, requireRole } = require("../lib");

const router = express.Router();

const UPLOADS_ROOT = path.join(__dirname, "..", "..", "uploads");
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
    upload.array("images", MAX_DEAL_IMAGES)(req, res, (error) => {
      if (error) {
        return res.status(400).json({ error: error.message || "Upload failed" });
      }
      if (!req.files?.length) {
        return res.status(400).json({ error: "No image files provided" });
      }
      const urls = req.files.map((file) => {
        const relativePath = `deals/${req.user.uid}/${file.filename}`;
        return `${req.protocol}://${req.get("host")}/uploads/${relativePath}`;
      });
      return res.json({ urls });
    });
  },
);

module.exports = router;
