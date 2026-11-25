# Production Deployment Guide

This guide covers deploying the Dragonclaim bot to production with Coolify or any other
Docker-based platform. The image is built from `prod.Dockerfile`.

## How the container finds its config

Config is YAML only. The bot does not read individual settings from environment variables.
`scripts/startup.sh` picks the config **file** like this:

| `NODE_ENV`   | Condition                                       | Config file used                              |
| ------------ | ----------------------------------------------- | --------------------------------------------- |
| `production` | `CONFIG_YML` is set (a **path**)                | `$CONFIG_YML`                                 |
| `production` | the secrets repo was cloned at build time       | `/app/data/dc-prod-secrets/config.prod.yml`   |
| `production` | otherwise                                       | `/app/data/config.prod.yml`                   |
| anything else | always                                         | `/app/data/config.yml`                        |

If the chosen file doesn't exist, the container exits with a clear error. Start from
[`data/config.template.yml`](data/config.template.yml).

## Getting the config into the container

### Option 1: Private secrets repo, cloned at build time (what this repo is set up for)

Keep `config.prod.yml` in a separate **private** repo. The build clones it into
`/app/data/dc-prod-secrets/`.

- The repo URL, including an access token, is passed as a BuildKit **secret** named
  `SUBMODULE_URL_WITH_ACCESS_TOKEN`, so it never appears in image history or metadata.
  - **Coolify:** add `SUBMODULE_URL_WITH_ACCESS_TOKEN` as an environment variable and enable
    **Use Docker Build Secrets**.
  - **Manually:** run `SUBMODULE_URL_WITH_ACCESS_TOKEN=... ./test-docker-build.sh`.
- Use a fine-grained token: **read-only Contents** on that one repo.
- The config is baked into the image, so keep the image private.

### Option 2: Mount the config file at runtime

Mount your file anywhere and point `CONFIG_YML` at it:

```bash
docker run -e NODE_ENV=production -e CONFIG_YML=/config/config.prod.yml \
  -v /secure/path/config.prod.yml:/config/config.prod.yml:ro ... <image>
```

In Coolify, use **Storages → File Mount** and set the same `CONFIG_YML` path.

## Environment variables

| Variable          | Required        | Purpose                                                                                   |
| ----------------- | --------------- | ----------------------------------------------------------------------------------------- |
| `NODE_ENV`        | yes             | `production` (selects the config file and runs `init-mongo.js` on boot)                   |
| `DOCKER_ENV`      | if Redis is `redis_db` | `true` keeps the `redis_db` hostname. Otherwise it is rewritten to `localhost` for host runs |
| `CONFIG_YML`      | Option 2        | **Path** to the config file inside the container                                          |
| `TRUST_PROXY`     | behind a proxy  | Number of reverse-proxy hops (Coolify/Traefik: `1`), so rate limiting sees real client IPs. Leave unset when the container is exposed directly |

The listen port comes from the config (`selfHosted.localServers.port`, default `55554`). There
is no `PORT` override.

## Coolify quick start

1. Create an **Application** from this repo, Build Pack **Dockerfile**, file `/prod.Dockerfile`.
2. Provide the config using Option 1 or Option 2 above.
3. Set `NODE_ENV=production`, `TRUST_PROXY=1` and, if needed, `DOCKER_ENV=true`.
4. Set **Ports Exposes** to `55554` (or your configured port) and the health check path to
   `/health`.
5. Set your domain and enable HTTPS.
6. Deploy and watch the logs.

## Required configuration values

These live in your YAML (see the template for everything else):

```yaml
selfHosted:
  portalSecretKey: "<64 hex chars>" # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  mongodb:
    dbName: "dragonclaim"
    uri: "mongodb+srv://user:pass@cluster.mongodb.net/dragonclaim"
  redis:
    uri: "redis://default:<password>@redis-host:6379" # put the password in the URI
  discordBot:
    clientSecret: "xxx"
    token: "xxx"
    clientId: "xxx"
portal:
  portalCorsWhitelist: ["https://your-portal.example"] # origins allowed to call the portal API
platforms:
  discord:
    guildId: "xxx"
    modChatChannelId: "xxx"
    modBotSpamChannelIds: ["xxx"]
    modLogsChannelId: "xxx"
    authedModRoleId: "xxx"
    verifiedEndUserRoleId: "xxx"
```

The portal config API (`/discord/v1/portal/config`) stays **disabled** until `portalSecretKey`
is a real value of at least 32 characters. Clients send the key in the `x-portal-secret-key`
header.

## Discord setup

1. Create the bot at the [Discord Developer Portal](https://discord.com/developers/applications).
2. Enable the **Message Content** intent.
3. Add these OAuth2 redirects:
   - `https://api.yourdomain.com/discord/v1/giveaway/authed`
   - `https://api.yourdomain.com/discord/v1/portal/authed`
4. Invite the bot to your server.

## MongoDB

- **Atlas:** create a cluster, allow your server's IP, and create a DB user.
- **Self-hosted:** run MongoDB 4.4+ (driver v7 requires it) and use the internal URI.

In production the container runs `scripts/init-mongo.js` on boot. It creates the collections
and validators, and never seeds test data in production.

## Monitoring

- Health: `GET /health` returns `{"status":"healthy","timestamp":"..."}`.
- If MongoDB is unreachable at boot, the process exits (code 1) so the orchestrator restarts it.
- If Redis drops, the bot keeps running, fails fast on cache calls (login answers `503`), and
  reconnects automatically.

## Troubleshooting

- **"Config file not found":** check `NODE_ENV` and `CONFIG_YML` (a path, not YAML contents).
- **Mongo connection fails:** check the IP allowlist and the URI, and test with `mongosh`.
- **Redis connection fails:** check the host, `DOCKER_ENV`, and the password in the URI.
- **Portal config API returns 503:** set a real `portalSecretKey` (32+ characters).
- **Everything is rate-limited at once behind a proxy:** set `TRUST_PROXY=1`.

## Security notes

- Never commit a real config. `data/config*.yml` is gitignored.
- Use strong, unique passwords and rotate tokens if they're ever exposed.
- Restrict network access to MongoDB and Redis.
