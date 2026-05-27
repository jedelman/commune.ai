# Deploy (run on Jason's laptop)

The wired-in Cloudflare MCP can't deploy Workers or write DNS, so the deploy runs locally with
wrangler. The API token is read from `pass` — unlock it first (`pass show cloudflare/api-key`
prompts for the GPG passphrase).

The token needs: **Workers Scripts:Edit, Workers Routes:Edit, D1:Edit, Account:Read, and
Zone:DNS:Edit on jason-edelman.org**.

## One-time setup

```bash
# 1. Provision the D1 database (or do it via the Cloudflare MCP: d1_database_create)
cd worker
CLOUDFLARE_API_TOKEN=$(pass show cloudflare/api-key) npx wrangler d1 create commune-events
#   → copy the printed database_id into worker/wrangler.jsonc (replace REPLACE_WITH_REAL_ID)

# 2. Apply the schema to the remote DB
npm run migrate:remote
```

## Every deploy

```bash
# build the engine + frontend (Cloudflare's builder has no Rust, so build the artifact locally)
cd model && wasm-pack build --target web --out-dir ../web/src/wasm
cd ../web && npm install && npm run build      # -> web/dist

# ship the Worker (serves web/dist + /ws) and bind commune.jason-edelman.org
cd ../worker && npm install && npm run deploy
```

`npm run deploy` runs `CLOUDFLARE_API_TOKEN=$(pass show cloudflare/api-key) wrangler deploy`. The
`routes` entry in `wrangler.jsonc` attaches the `commune.jason-edelman.org` custom domain (DNS +
cert) automatically on first deploy.

## Local dev (no token needed)

```bash
cd worker && npx wrangler dev      # miniflare emulates the Durable Object, WebSockets, and D1
# serves the built web/dist on http://localhost:8787 ; open two tabs to see the cascade
```
