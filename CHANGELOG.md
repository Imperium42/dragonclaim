# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Changes before this file existed are recorded in the git history only.

## [Unreleased]

### Changed

- **License**: relicensed to the [Mozilla Public License 2.0](LICENSE). The previous
  Xsolla USA, Inc. BSD-3-Clause grant remains in effect (see README § License). Source
  files now carry an SPDX header.
- **Tooling**: replaced Yarn 3 with **Bun** as package manager and script runner
  (`bun.lock`). Node stays the runtime. Removed `.yarn/` (incl. the committed cache),
  `.yarnrc.yml`, and `yarn.lock`.
- **Runtime**: Node.js 20 (EOL) → Node 24+ (`engines`). The Docker image now uses Node 26 LTS.
- **Dependencies** (major bumps): Express 4 → 5, MongoDB driver 4 → 7, TypeScript 4 → 6,
  ESLint 8 → 10, Mocha 10 → 12, Chai 4 → 6, `@types/node` 18 → 24, pm2 5 → 7, nodemon 2 → 3.
  `discord-oauth2` is pinned to `^2.12.1` instead of `latest`.
- Replaced `async-redis` (unmaintained) with `redis` v6 (node-redis).
- Replaced `request-promise` with native `fetch`, and the `steam-api` / `steamapi`
  wrappers with direct Steam Web API calls through the existing axios helper.
  `steamGetUserSummary` now returns Steam's raw player object (lowercase keys).
- `body-parser` replaced by Express 5's built-in `express.json()` / `express.urlencoded()`.
- ESLint moved to flat config (`eslint.config.js`). Formatting rules are delegated to
  Prettier. All 95 legacy warnings are fixed (unused code removed, `any` replaced, error
  `cause` preserved), and `no-unused-vars`, `no-explicit-any` and `preserve-caught-error` are
  enforced as errors again. `_`-prefixed names are exempt.
- TypeScript now uses `module`/`moduleResolution: nodenext`. Type-only imports gained `.js`
  extensions.
- `bun run test` builds first and tests the compiled `dist/` output.
- **Prod image 456 MB → 260 MB (−43%)**:
  - The runtime is bare Alpine plus the Node binary (no npm, corepack or yarn).
  - The `chown -R /app` layer that duplicated `node_modules` is gone, and so is the
    unused `gettext`.
  - Source maps, type declarations, markdown and `@types` are stripped from production
    deps.
  - App code is now root-owned and read-only; only `data/` is writable by the app user.
- `GET /discord/v1/portal/auth` answers `503` with `Retry-After` when Redis is down,
  instead of redirecting to Discord with a state that was never saved.
- Docker Compose services use `restart: unless-stopped`. Images are pinned to `redis:8-alpine`
  and `mongo:8` instead of `latest`.

### Removed

- Unused dependencies: `callsite-record`, `debug`, `eslint-plugin-import`, `request`,
  `settings`, `source-map-loader`, `type-of`, `eslint-config-standard`,
  `eslint-plugin-prettier`, `forever`, `gulp` (+ plugins), `ts-loader`, `ts-node`, `tslib`,
  `webpack` / `webpack-cli` / `copy-webpack-plugin`, `yaml-validator`.
- Unused `webpack.config.js`, `.eslintrc.cjs`, and the empty `.eslintignore`.

### Fixed

- Steam "trusted user" check read the axios response object instead of its body, so every
  user was treated as untrusted whenever a Steam dev API key was configured.
- `steamGetNumCurPlayers` called a method that didn't exist on its import.
- DM "thanks" auto-reply only matched the exact string `thx`. It now matches all intended
  phrases, case-insensitively.
- `form.pug` failed to compile (stray top-level `include` in an `extends` template).
- MongoDB connect used a callback API removed in driver v5, along with options that driver v6+
  rejects.
- Broken test suite (wrong import path/shape and a `done` callback that never fired).
- `.gitignore` explicitly un-ignored `data/config.yml` (secrets). It is ignored again.
- `docker-compose.yml` used Node 16, a non-existent `start` script, and no `DOCKER_ENV`.
- Prettier formatting in four giveaway/redis files.
- Redis helpers fail fast when Redis is down (`disableOfflineQueue` plus a 5 s ready guard)
  instead of hanging. Values and TTLs are now set atomically (`SET … EX`), and non-string
  values are JSON-stringified.
- A failed MongoDB connection exits the process so the container gets restarted, instead of
  stalling while `/health` reports 200.
- HTTP error logs no longer dump full axios errors (which included the Steam API key and OAuth
  request bodies). `GET` rethrows the original error.
- `tsc --incremental` kept its build info outside `dist/`, so `clean-build` (`rm -rf dist` + build)
  silently skipped emitting TypeScript output. The build info now lives in `dist/`.

- `init-mongo.js`: the seed guild never matched the schema (it used an ObjectId `_id`), so
  init exited with "Document failed validation" on every fresh DB.

### Breaking

- **Portal config API:** the secret key now goes in the `x-portal-secret-key` header. The
  `?portalSecretKey=` query param and the body field no longer authenticate. The API is
  **disabled** until `selfHosted.portalSecretKey` is a real value of 32+ characters (not the
  template placeholder).
- **Portal CORS:** `portal.portalCorsWhitelist` is now actually applied. It used to be read
  from the wrong path, and a global `Access-Control-Allow-Origin: *` overrode it anyway. Origins
  not on the list get no CORS access.
- Behind a reverse proxy, set **`TRUST_PROXY=1`**, or rate limiting sees every request as
  coming from the proxy.

### Security

- `init-mongo.js` no longer seeds fake test users and guilds into **production** databases.
- The error page no longer shows stack traces in production (it used to render them for
  any 5xx).
- Portal OAuth `state` keys in Redis now expire after 5 minutes. Before, every hit on the
  unauthenticated `/discord/v1/portal/auth` route left a key behind permanently.
- Prod image: `SUBMODULE_URL_WITH_ACCESS_TOKEN` is now a **BuildKit secret**
  (`RUN --mount=type=secret`) instead of a build ARG, so it no longer appears in
  `docker history` or image metadata. In Coolify, enable "Use Docker Build Secrets".
  The clone is shallow and its `.git` (which held the tokenized remote URL) is deleted. The
  build no longer fails when the secret is unset; the clone is simply skipped.
- Portal OAuth error handlers no longer log raw axios errors, which included the Discord
  client secret from the token-exchange request body.
- Local Docker builds no longer send `data/dc-prod-secrets/` in the build context.
- **Portal config API** (`GET`/`POST /discord/v1/portal/config`, which can read and overwrite
  the whole config):
  - It used to accept the template's default key, and a missing key skipped the check
    entirely. It now fails closed.
  - Keys are compared in constant time and re-read on every request, so a rotation applies
    without a restart.
  - The POST body is validated (only known top-level sections, plus a usable new key) before
    it's written, and the file is written `0600`.
- **OAuth state and nonces** are generated with `crypto.randomUUID()` instead of the
  predictable `Math.random()`.
  - Portal login `state` is bound to an `HttpOnly`, `SameSite=Lax` cookie (login-CSRF
    protection), checked against its origin, and consumed atomically (`GETDEL`).
  - Nonces live 5 minutes (was 1 hour) and are also single-use.
- **Redis keys** reached from user input are namespaced (`oauth:portal:state:`,
  `oauth:giveaway:state:`, `portal:nonce:`) and must be UUIDs. Before, unauthenticated
  callers could read or delete any key, such as reaction lockouts.
- **Reflected XSS:** Discord's `?error=` (and other untrusted text) is HTML-escaped on the
  giveaway error page. Only operator-configured locale messages pass through.
- **Logs:** credentials are redacted from the Redis/Mongo URIs (`redis.js`, `init-mongo.js`,
  `startup.sh`) and from the opt-in `printThisJsonOnInit`/`printThisYamlOnInit` config dumps.
- **Error responses** no longer include raw axios responses, which could carry the user's
  Bearer token. Auth failures return 4xx instead of 500.
- **New protections:**
  - `helmet` security headers (CSP, HSTS, nosniff; `X-Powered-By` removed).
  - Rate limits on the portal and giveaway routes (60 requests per 15 minutes; 20 for the
    config API).
- Removed two dead, commented-out ad-tracking scripts that contained real pixel IDs.
- Example schemas now use mock Discord/Steam IDs instead of real ones.
- `.gitignore` covers `.env*`.
- `bun audit` is clean: dev-only `glob`/`minimatch` are forced past known advisories via
  `overrides`.

### Docs

- `README-PROD.md` and `DEPLOY_COOLIFY.md` were rewritten to match the code:
  - The "recommended" per-setting env vars (`MONGODB_URI`, `DISCORD_BOT_TOKEN`, ...) never
    existed.
  - `CONFIG_YML` is a file **path**, not YAML contents.
  - `PORT` is not honored.
  - The compose example mounted a file production mode never reads.
