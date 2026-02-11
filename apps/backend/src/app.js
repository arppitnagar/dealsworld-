const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health");
const dealsRoutes = require("./routes/deals");
const usersRoutes = require("./routes/users");
const adminRoutes = require("./routes/admin");
const paymentsRoutes = require("./routes/payments");

const app = express();
app.use(cors());
app.use(express.json());

app.use(healthRoutes);
app.use(dealsRoutes);
app.use(usersRoutes);
app.use(adminRoutes);
app.use(paymentsRoutes);

module.exports = app;
