const DEALS_COLLECTION = "deals";
const USERS_COLLECTION = "users";
const DEAL_JOINS_COLLECTION = "dealJoins";
const PAYMENTS_COLLECTION = "payments";
const PAYMENT_EVENTS_COLLECTION = "paymentEvents";
const REVIEWS_COLLECTION = "reviews";
const NOTIFICATIONS_COLLECTION = "notifications";
const ADDRESS_COLLECTION = "addresses";
const COUNTERS_COLLECTION = "counters";
const APP_CONFIG_COLLECTION = "appConfig";

const DEFAULT_DEAL_LIMIT = 200;
const MAX_DEAL_LIMIT = 1000;
const DEFAULT_ADDRESS_COUNTRY = "India";

// Doc id inside APP_CONFIG_COLLECTION that stores, per client app, the
// oldest app version still allowed to sign in (see routes/appConfig.js).
const VERSION_GATE_DOC_ID = "versionGate";
const VERSION_GATE_APPS = ["buyer", "seller"];
const DEFAULT_MIN_APP_VERSIONS = {
  buyer: "1.0.0",
  seller: "1.0.0",
};

module.exports = {
  DEALS_COLLECTION,
  USERS_COLLECTION,
  DEAL_JOINS_COLLECTION,
  PAYMENTS_COLLECTION,
  PAYMENT_EVENTS_COLLECTION,
  REVIEWS_COLLECTION,
  NOTIFICATIONS_COLLECTION,
  ADDRESS_COLLECTION,
  COUNTERS_COLLECTION,
  APP_CONFIG_COLLECTION,
  DEFAULT_DEAL_LIMIT,
  MAX_DEAL_LIMIT,
  DEFAULT_ADDRESS_COUNTRY,
  VERSION_GATE_DOC_ID,
  VERSION_GATE_APPS,
  DEFAULT_MIN_APP_VERSIONS,
};
