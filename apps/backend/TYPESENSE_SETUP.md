# Typesense setup (self-hosted)

This backend searches deals via a self-hosted Typesense instance
(`src/typesenseClient.js`, `src/typesenseSync.js`, `src/routes/search.js`).
Without it running, `GET /api/deals/search` returns
`503 { "error": "Search is temporarily unavailable" }` - nothing else in the
app depends on Typesense, so the rest of the backend works fine without it.

## 1. Install Typesense on the backend host

The backend runs today as a plain `node server.js` process with no
containers, so this installs Typesense the same way - directly on the host,
as a systemd service, rather than introducing Docker as a new dependency.

```bash
# Pick the latest release for your OS/arch from:
# https://typesense.org/downloads/
curl -O https://dl.typesense.org/releases/<version>/typesense-server-<version>-linux-amd64.tar.gz
tar -xzf typesense-server-<version>-linux-amd64.tar.gz
sudo mv typesense-server /usr/bin/typesense-server

sudo useradd -r -s /bin/false typesense
sudo mkdir -p /var/lib/typesense
sudo chown typesense:typesense /var/lib/typesense
```

## 2. Install the systemd service

```bash
# Edit typesense.service first: set a real --api-key (a long random
# string - this is the same value you'll put in TYPESENSE_API_KEY below).
sudo cp typesense.service /etc/systemd/system/typesense.service
sudo systemctl daemon-reload
sudo systemctl enable --now typesense
sudo systemctl status typesense
```

## 3. Configure the backend

Add to the backend's `.env` (same file `PORT`/`PAYMENT_WEBHOOK_SECRET`
already live in):

```
TYPESENSE_HOST=127.0.0.1
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http
TYPESENSE_API_KEY=<the same key you put in typesense.service>
```

Restart the backend. On boot it automatically creates the `deals` collection
if it doesn't exist yet (`ensureDealsCollection()` in `typesenseSync.js`),
and starts syncing deals from Firestore every ~20s
(`TYPESENSE_SYNC_INTERVAL_MS`, optional env var to change it).

## 4. Verify

```bash
curl "http://127.0.0.1:8108/health"
# then, once the backend has had ~20s to run its first sync pass:
curl "http://localhost:<backend-port>/api/deals/search?q=test"
```

## Rebuilding the index from scratch

If the Typesense data directory is ever lost, or the schema changes, run a
full re-sync from Firestore instead of waiting for the watermark to catch
up naturally:

```js
// From a Node REPL or a one-off script in apps/backend:
require("dotenv").config();
const { rebuildTypesenseIndex } = require("./src/typesenseSync");
rebuildTypesenseIndex().then(() => console.log("done"));
```
