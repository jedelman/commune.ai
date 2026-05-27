# commune.ai

A scenario tool for federated commune economics. Each friend enters their real situation —
equity, income, skills — and sees their **own life inside the commune vs. now**, plus whether a
node clears. The point is to be a forcing function: turn "I'd love a solidarity economy" into a
signature by showing each person their actual number.

The full design and build plan lives in
[`power-explained/commune-ai/SETUP.md`](https://github.com/jedelman/power-explained).

## What's here (v1)

- **`model/`** — the financial engine in Rust, compiled to WASM. One validated core, run natively
  under `cargo test` and in the browser via `wasm-pack`. Layers: asset → enterprise → trades →
  tax → per-persona before/after.
- **`web/`** — Vite + React + TypeScript UI. Live node sliders, the node-clears summary, and the
  hero per-persona before/after cards. Scenarios are shareable via a URL hash (no backend yet).

Build order: **v1** single node + per-persona (this) → **v1.5** D1 persistence → **v2** stress
tests → **v3** federation clearing. See `SETUP.md`.

## Run it

```bash
# 1. build the engine into the frontend (regenerates web/src/wasm/, which is gitignored)
cd model
cargo test                                            # fast native correctness check
wasm-pack build --target web --out-dir ../web/src/wasm

# 2. run the UI
cd ../web
npm install
npm run dev
```

Open the printed localhost URL. You should see Node #1: a negative asset layer, the enterprise
layer tipping node-net positive, ~$58k depreciation, and a before/after card per persona.

### Day-to-day

```bash
# terminal 1 — rebuild the engine on Rust changes
cd model && cargo watch -s "wasm-pack build --target web --out-dir ../web/src/wasm"
# terminal 2 — frontend
cd web && npm run dev
```

`cargo test` in `model/` is the fast correctness check; the WASM build ships the same validated
code to the browser.
