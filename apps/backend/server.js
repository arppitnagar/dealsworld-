require("dotenv").config();

const app = require("./src/app");
const { runExpirySweep } = require("./src/expirySweep");

const PORT = process.env.PORT || 5000;
const EXPIRY_SWEEP_INTERVAL_MS = Number(process.env.EXPIRY_SWEEP_INTERVAL_MS) || 120000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  runExpirySweep().catch((error) => console.warn("Initial expiry sweep failed:", error.message || error));
  setInterval(() => {
    runExpirySweep().catch((error) => console.warn("Expiry sweep failed:", error.message || error));
  }, EXPIRY_SWEEP_INTERVAL_MS);
});
