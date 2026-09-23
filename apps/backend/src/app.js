const express = require("express");
const path = require("path");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const healthRoutes = require("./routes/health");
const appConfigRoutes = require("./routes/appConfig");
const deliveryRoutes = require("./routes/delivery");
const searchRoutes = require("./routes/search");
const dealsRoutes = require("./routes/deals");
const usersRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const paymentsRoutes = require("./routes/payments");
const uploadsRoutes = require("./routes/uploads");
const chatRoutes = require("./routes/chat");

const app = express();
app.use(cors());
app.use(express.json());

// In-memory store, so this only rate-limits per process - fine for a single
// instance today, but running multiple backend instances behind a load
// balancer would need a shared store (e.g. rate-limit-redis) for these
// limits to apply across all of them instead of per-instance.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Every join/leave races against the same deal document (see the
// runTransaction calls in routes/deals.js), so a much tighter limit here
// caps how much a single client can contribute to that contention, on top
// of the general abuse protection above.
const joinLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiLimiter);
app.use("/api/deals/:dealId/join", joinLimiter);
app.use("/api/deals/:dealId/leave", joinLimiter);

// Uploaded deal images (see routes/uploads.js) - served back over HTTP so
// buyer/seller/admin clients can load them like any other image URL.
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use(healthRoutes);
app.use(appConfigRoutes);
app.use(deliveryRoutes);
// Registered ahead of dealsRoutes so this literal /api/deals/search path
// wins the match instead of falling through to deals.js's generic
// GET /api/deals/:dealId (which would otherwise treat "search" as a dealId).
app.use(searchRoutes);
app.use(dealsRoutes);
app.use(usersRoutes);
app.use(adminRoutes);
app.use(paymentsRoutes);
app.use(uploadsRoutes);
app.use(chatRoutes);

module.exports = app;
