require("dotenv").config();

const app = require("./src/app");
const { runExpirySweep } = require("./src/expirySweep");
const { runTypesenseSync } = require("./src/typesenseSync");

const PORT = process.env.PORT || 5000;
const EXPIRY_SWEEP_INTERVAL_MS = Number(process.env.EXPIRY_SWEEP_INTERVAL_MS) || 120000;
const TYPESENSE_SYNC_INTERVAL_MS = Number(process.env.TYPESENSE_SYNC_INTERVAL_MS) || 20000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  runExpirySweep().catch((error) => console.warn("Initial expiry sweep failed:", error.message || error));
  setInterval(() => {
    runExpirySweep().catch((error) => console.warn("Expiry sweep failed:", error.message || error));
  }, EXPIRY_SWEEP_INTERVAL_MS);

  // Best-effort - if Typesense isn't reachable (e.g. not yet installed on
  // this host), this just keeps failing quietly and search stays
  // unavailable (see routes/search.js's 503) until it is.
  runTypesenseSync().catch((error) => console.warn("Initial Typesense sync failed:", error.message || error));
  setInterval(() => {
    runTypesenseSync().catch((error) => console.warn("Typesense sync failed:", error.message || error));
  }, TYPESENSE_SYNC_INTERVAL_MS);
});
