const express = require("express");
const path = require("path");
const cors = require("cors");

const healthRoutes = require("./routes/health");
const appConfigRoutes = require("./routes/appConfig");
const deliveryRoutes = require("./routes/delivery");
const dealsRoutes = require("./routes/deals");
const usersRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const paymentsRoutes = require("./routes/payments");
const uploadsRoutes = require("./routes/uploads");
const chatRoutes = require("./routes/chat");

const app = express();
app.use(cors());
app.use(express.json());

// Uploaded deal images (see routes/uploads.js) - served back over HTTP so
// buyer/seller/admin clients can load them like any other image URL.
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use(healthRoutes);
app.use(appConfigRoutes);
app.use(deliveryRoutes);
app.use(dealsRoutes);
app.use(usersRoutes);
app.use(adminRoutes);
app.use(paymentsRoutes);
app.use(uploadsRoutes);
app.use(chatRoutes);

module.exports = app;
