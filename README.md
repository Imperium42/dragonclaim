# Dragonclaim

A smart Discord promo giveaway dispenser bot that delivers keys directly via DM.

## Key Features

- 🚀 **One-Click Claims**: Players claim keys in 3 clicks - no keyboard needed
- 🔒 **Secure Delivery**: Keys sent directly via DM, not in public channels
- 🤖 **Bot Protection**: Bots cannot claim keys
- ⚙️ **Flexible Setup**: Configure via Discord commands or web portal
- 📊 **Verification**: Built-in user verification system
- ⏱️ **Auto-Timed**: Giveaways auto-end when time runs out or keys are depleted
- [Learn More (+Video)!](https://www.imperium42.com/project/dragonclaim-discord-bot)

## Production Deployment

**🚀 [See Production Deployment Guide](README-PROD.md)** for deploying to Coolify, Docker, or other platforms.

## Quick Start

Prerequisites: [Node.js](https://nodejs.org) 24+ (runtime) and [Bun](https://bun.com) 1.4+ (package manager / script runner).

1. Install dependencies:
   ```bash
   bun install
   ```

2. Configure the bot:
   ```bash
   cp data/config.template.yml data/config.yml
   # Edit data/config.yml with your settings
   ```

3. Start the bot:
   ```bash
   bun run dev
   ```

## Configuration

### Discord Bot Setup

1. [Create a Discord bot account](https://discord.com/developers/applications)
2. Enable these Privileged Gateway Intents:
   - MessageContent
3. Configure OAuth2 URIs:
   - Development: `http://localhost:55554/v1/discord/giveaway/authed`
   - Production: `https://api.yoursite.com/v1/discord/giveaway/authed`

### Required Configuration

In `data/config.yml`:

```yaml
selfHosted:
  mongodb:
    dbName: "your_db_name"
    uri: "your_mongodb_uri"
  discordBot:
    clientSecret: "your_client_secret"
    token: "your_bot_token"
    clientId: "your_client_id"

platforms:
  discord:
    guildId: "your_guild_id"
    modChatChannelId: "your_channel_id"
    modBotSpamChannelIds:
      - "your_channel_id"
    modLogsChannelId: "your_channel_id"
    authedModRoleId: "your_role_id"
    verifiedEndUserRoleId: "your_role_id"
```

## Commands

### Command Prefix

- Default prefix: `.` (configurable in `data/config.yml`)
- Example: `.startgiveaway`

### Giveaway Commands

1. Start a giveaway:
   ```
   .startgiveaway
   ```
   ![Start Giveaway Command](https://i.imgur.com/5zXuE7A.png)

2. Setup giveaway with keys:
   ```
   .setupgiveaway myEvent 7d
   ```
   (Attach a `.txt` or `.csv` file with one key per line)
   ![Setup Giveaway Command](https://i.imgur.com/tTuvQNI.png)

### Help Commands

- `.help` - List all commands
- `.giveawayCmds` - List giveaway-specific commands
  ![Giveaway Commands](https://i.imgur.com/Z4NMxLD.png)

## Features

### For Players

- **Effortless Claims**: 3-click process, no keyboard needed
- **Minimal Data**: Only collects Discord and Steam IDs
- **Direct Delivery**: Keys sent via DM
- **Verification**: Simple verification process

### For Moderators

- **Customizable**: Full YAML configuration with localization
- **Admin Portal**: GUI configuration interface ([separate repo](#web-portal-separate-repo))
- **Event Management**: Natural language timer support
- **Pre-scheduling**: Create and schedule events ahead of time
- **Verification Tools**: Bot detection and duplicate claim prevention
- **Blacklisting**: Global blacklist for unverified users
- **Scalable**: Middleware support for direct IAP/promo application
- **Auto-Timing**: Automatic event ending
- **Pause Support**: Pause events with key count tracking
- **Self-Hosted Features**: Auto-restart live events

## Development

### MongoDB Setup

The bot uses MongoDB for data storage. On first run, it will:
- Initialize collections with schemas
- Create necessary indexes
- Add test data if collections are empty

### Redis Setup

Redis is used for caching and rate limiting. The bot includes Docker support for easy Redis setup.

## Troubleshooting

### Redis Issues

If running Redis without Docker:
```bash
sudo journalctl -u redis-server.service -n 50  # Debug logs
sudo systemctl start redis-server  # Start service
```

### MongoDB Atlas

If you see "connection < monitor > to {someIp} closed":
- Whitelist IP in Atlas Network Access
- Or disable IP whitelisting in Atlas settings

## Technical Notes

- ESM module: Import TypeScript files with `.js` extension
- Schema initialization: `data/schemas` → `scripts/init-mongo.js`

## Web Portal (separate repo)

The admin portal (the GUI config frontend) lives in a **separate, private repository** and is
not part of this release. This repo only contains the bot and the API the portal talks to:

| Endpoint                                 | Purpose                                         |
| ---------------------------------------- | ----------------------------------------------- |
| `GET /discord/v1/portal/auth`            | Starts Discord OAuth2 (sets a state cookie)     |
| `GET /discord/v1/portal/authed`          | OAuth2 callback; issues a one-time nonce        |
| `GET /discord/v1/portal/user`            | Redeems the nonce (`?discordNonce=`)            |
| `GET`/`POST /discord/v1/portal/config`   | Reads/overwrites the bot config (key required)  |

If you build or revive a portal against this API:

- Send the key in the **`x-portal-secret-key` header**. The old `?portalSecretKey=` query param
  and body field no longer authenticate (see [CHANGELOG](CHANGELOG.md) → Breaking).
- The config API stays disabled (`503`) until `selfHosted.portalSecretKey` is a real value of
  32+ characters.
- Add the portal's origin to `portal.portalCorsWhitelist`, or the browser gets no CORS access.

## Roadmap

- [x] MongoDB/Atlas initialization script
- [⌛] Local MongoDB container testing (Docker setup done, testing pending)
- [ ] Test for !keys when restarting giveaway without keys on startup
- [⌛] Multi-bot instance support (Portal designed for this)
- [x] Make redis easier to setup and start (Docker)
- [ ] Cloud YAML config storage
- [⌛] Web portal for config setup (MVP complete, pending connection)
- [ ] Setup detection when no `data/config.yml` file detected
- [⌛] Slash commands:
  - [x] Get /ping working as initial template
  - [ ] Port other commands
- [ ] Legal documentation:
  - [ ] Terms of Service
  - [ ] Privacy Policy
- [⌛] Portal development:
  - [x] MVP (private)
  - [ ] Polish
- [⌛] Multi-server sharding support (Portal designed for this)
- [x] Prettify entire codebase with a normalizer

## License

Copyright (c) 2017–2026 [Imperium42®, LLC.](https://www.imperium42.com)

Licensed under the [Mozilla Public License 2.0](https://mozilla.org/MPL/2.0/). See [LICENSE](LICENSE).

> **Historical note:** Before this relicense, the only license granted for this software was a perpetual, lifetime BSD-3-Clause grant to Xsolla USA, Inc. That grant is unaffected by this relicense. Its original text is kept in [docs/legacy-xsolla-bsd3-grant.txt](docs/legacy-xsolla-bsd3-grant.txt).
>
> The names "Imperium42" and "Dragonclaim" are trademarks of Imperium42®, LLC. The MPL grants no trademark rights (MPL-2.0 §2.3).
