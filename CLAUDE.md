# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Notebook" is a personal signed-message ledger ("proof ledger"). A user connects an
Ethereum wallet (WalletConnect via Reown AppKit, or a Ledger Nano X over WebHID), signs
a personal message, and the signed message becomes an immutable, hash-linked block in a
JSON-file blockchain kept on the backend. Every block is independently re-verifiable:
anyone with the block JSON can recompute its Keccak-256 hash and check the ECDSA
signature without trusting the server.

The frontend also has fully client-side ECIES encrypt/decrypt tools (for sending
secrets to a holder of a known secp256k1 public key) that never touch the backend.

## Commands

Run from the repo root (`~/Notebook`):

- `npm install` — installs root deps and, via `postinstall`, both `backend/` and `frontend/` deps.
- `npm run all` — runs backend (`node server.js`, port 3001) and frontend (`vite --host`, port 8080) concurrently. This is the normal way to develop.

Backend only (from `backend/`):
- `npm start` — `node server.js`
- `npm run dev` — `nodemon server.js` (auto-restart)

Frontend only (from `frontend/`):
- `npm run dev` — Vite dev server on port 8080, proxies `/api/*` to `http://localhost:3001`
- `npm run build` — production build
- `npm run lint` — ESLint (flat config, `eslint.config.js`)
- `npm run preview` — preview a production build

There is no test suite in this repo.

Standalone hash-verification script (independent of the running app, verifies a block's
hash offline against `hash/hashverify.py`'s own Keccak-256 canonicalization):
```
python3 hash/hashverify.py
```
Requires `pycryptodome`.

## Architecture

### Backend (`backend/`, Express, port 3001)

- `server.js` — app setup, CORS, JSON body limit (1mb), mounts routes at `/api`, generic 404/error handlers.
- `routes/blockchain.js` — the only route file. Endpoints:
  - `GET /api/status` — liveness check
  - `GET /api/chain` — returns the full verified chain (throws/500s if integrity check fails)
  - `POST /api/add-block` — body `{ message, signature }`; recovers the signer address from the signature, appends a new block
  - `POST /api/verify-signature` — body `{ message, signature }`; recovers and returns the signing address + public key
- `services/blockchainService.js` — the core chain logic:
  - Canonicalizes a block to JSON for hashing: recursively sort object keys, compact `JSON.stringify`, escape all non-ASCII to `\uXXXX`, then `keccak256`. This exact canonicalization is duplicated in two other places and **must stay byte-for-byte identical** across all three:
    - `frontend/src/chainVerify.js` (client-side re-verification)
    - `hash/hashverify.py` (offline Python verification)
  - Each block: `{ index, previous_hash, message, eth_address, signature, timestamp, hash }`. `previous_hash` of block 0 is 64 zeros. `hash` is `keccak256(canonicalJson(block without .hash))`.
  - `validateChain()` re-derives every block's hash, previous-hash linkage, and ECDSA signature (via `ethers.verifyMessage`, recovered address must equal stored `eth_address`) — run on every read and after every append.
  - A separate **fingerprint** file (`data/chain_fingerprint.txt`) stores the latest block's hash outside of `blockchain.json`. On load, if the chain's latest hash doesn't match the stored fingerprint, the chain is rejected as tampered/rolled-back — this catches an attacker replacing `blockchain.json` wholesale with a self-consistent but different chain.
- `utils/blockchainStore.js` — plain-file persistence (`data/blockchain.json`, `data/chain_fingerprint.txt`) using write-to-`.tmp`-then-`rename` for atomic writes.

The backend never sees a private key — only a `(message, signature)` pair — and the
Express layer contains no auth; anyone who can reach `POST /api/add-block` can append a
block signed by whatever address the signature recovers to.

### Frontend (`frontend/`, React 19 + Vite)

- `src/App.jsx` — tab shell (`notebook`, `sign`, `encrypt`, `decrypt`, `verify-signature`), holds the active tab in `sessionStorage`, wires a mobile drawer and a desktop tab bar with an animated sliding indicator.
- `src/api.js` — thin `fetch` wrapper (`apiUrl()`, `fetchJson()`) around `VITE_API_URL`. Note: several components (`Notebook.jsx`, `SignMessage.jsx`, `VerifySignature.jsx`) build their own fetch calls against `VITE_API_URL` directly instead of using this helper — that inconsistency is pre-existing, not a convention to follow for new code.
- `src/appkit.js` — Reown AppKit (`@reown/appkit`) singleton config for WalletConnect; requires `VITE_REOWN_PROJECT_ID` in `frontend/.env` (throws at import time if missing).
- `src/chainVerify.js` — client-side mirror of the backend's `calculateBlockHash`/`validateChain` logic, used by `Notebook.jsx` to badge each entry "✓ Verified" / "⚠ Broken" independent of what the backend claims.
- `src/components/SignMessage.jsx` — the signing flow: connect via AppKit (WalletConnect) or directly via Ledger WebHID (`@ledgerhq/hw-transport-webhid` + `@ledgerhq/hw-app-eth`), sign, locally re-verify the recovered address, then optionally POST to `/api/add-block`. Ledger WebHID only works on desktop Chrome/Edge.
- `src/components/EncryptMessage.jsx` / `DecryptMessage.jsx` — ECIES (`eciesjs`) over secp256k1, entirely client-side; explicitly never call the backend. Keep it that way if touching these files — it's a stated security property, not an oversight.
- `src/components/Notebook.jsx` — fetches `/api/chain`, renders entries newest-first with search/pagination, per-entry chain-link visualization (valid/broken), QR reveal and copy actions for address/signature/hash, and "notebook.json" export.
- `src/components/VerifySignature.jsx` — standalone signature verification against `/api/verify-signature`; can be prefilled by clicking "Verify Signature" on a `Notebook` entry.
- `src/theme.jsx` — theme context (dark/light mode + accent color), persisted via `useLocalStorage` (from `src/hooks.js`), applied as `data-theme`/`data-accent` attributes on `<html>`.
- `src/blockies.js` — deterministic per-address/per-block dot-matrix avatar generator (canvas-based, seeded PRNG).

### `hash/`

Offline artifacts, separate from the running app: per-block hash `.txt` files and their
OpenTimestamps proofs (`.ots`), plus `hashverify.py` for recomputing a block hash from
pasted/loaded JSON to confirm it matches the stored `hash` field.

## Env vars

- `backend/.env` — `PORT` (default 3001)
- `frontend/.env` — `VITE_API_URL` (backend base URL), `VITE_REOWN_PROJECT_ID` (required, no default)
