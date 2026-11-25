# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

### Initial Setup
```bash
# Install dependencies (Bun = package manager/script runner; Node = runtime)
bun install

# Copy and configure the bot
cp data/config.template.yml data/config.yml
# Edit data/config.yml with your Discord bot credentials and MongoDB settings
```

### Development
```bash
# Start Docker services (Redis + Mongo), init Mongo, build, then start the bot
bun run dev

# Individual services
bun run docker-redis-up    # Start Redis via Docker
bun run docker-mongo-up    # Start MongoDB via Docker
bun run mongo-init         # Initialize MongoDB collections and schemas
bun run build              # Build TypeScript to dist/
bun run start-standalone   # Start bot without Docker
```

### Code Quality
```bash
# Format code using Prettier (tabs, trailing commas, 100 char width)
bun run format

# Check formatting without changes
bun run format:check

# ESLint 10 flat config (eslint.config.js): `lint` checks, `clean` auto-fixes
bun run lint
bun run clean

# Typecheck only
bun run typecheck

# Run tests (builds first: tests import from dist/)
bun run test
```

### Docker Management
```bash
bun run docker-up      # Start all services via Docker Compose
bun run docker-down    # Stop all Docker services
bun run docker-list    # List running Docker containers
```

## Architecture Overview

### Technology Stack
- **Runtime**: Node.js 24+ with ESM modules (Docker image: Node 26 LTS)
- **Package manager**: Bun (`bun.lock`). Don't reintroduce Yarn/npm lockfiles
- **Language**: Mixed JavaScript and TypeScript (migrating to TS)
- **Discord**: discord.js v14 for bot functionality
- **Database**: MongoDB (local or Atlas) for persistent storage
- **Cache**: Redis for rate limiting and temporary state
- **Web Server**: Express 5 on port 55554 for OAuth callbacks

### Project Structure
```
src/
├── server.js                 # Entry point, HTTP/HTTPS server setup
├── components/
│   ├── controllers/         # Business logic
│   │   ├── discord/        # Discord bot commands and interactions
│   │   │   ├── cmds/      # Individual command handlers (.Cmd.js pattern)
│   │   │   ├── giveaway/  # Giveaway-specific logic
│   │   │   └── portal/    # Web portal integration
│   │   ├── steam/         # Steam API integrations
│   │   └── api.js        # Express app configuration
│   ├── models/            # TypeScript data models
│   ├── routes/            # HTTP endpoints
│   ├── services/          # External service integrations
│   └── views/            # Pug templates for web pages
data/
├── config.yml            # Runtime configuration (gitignored)
├── config.template.yml   # Configuration template
└── schemas/             # MongoDB schemas
```

### Key Components

**Discord Bot Core** (`src/components/controllers/discord/`)
- `discordMain.js`: Bot initialization, event watchers, slash command routing
- `discordCmds.js`: Command handler that routes prefix commands to individual handlers
- `discordClient.js`: Discord.js client instance configuration
- Commands follow `.{commandName}Cmd.js` pattern in `cmds/` directory

**Configuration System**
- YAML-based configuration loaded from `data/config.yml`
- Cached via `getCachedConfigJson()` from `i42Common.js`
- Supports MongoDB (local/Atlas), Redis, Discord bot tokens, Steam API keys

**Database Layer**
- MongoDB collections: guilds, users, giveaways, blacklists
- Schemas defined in `data/schemas/` as JSON Schema
- Initialization script at `scripts/init-mongo.js`

**OAuth2 Flow**
- Discord OAuth2 for user authentication
- Redirect URIs configured in `selfHosted.discordBot` config
- Portal integration for web-based management

## Code Conventions

### TypeScript/JavaScript
- **File Extensions**: Import TypeScript files with `.js` extension (ESM requirement)
- **Indentation**: Tabs (not spaces)
- **Quotes**: Double quotes for strings (Prettier `singleQuote: false`)
- **Semicolons**: Always use semicolons
- **Formatting**: Prettier with 100-char line width, trailing commas
- **Naming**: camelCase for variables/functions, PascalCase for classes/types
- **License header**: New source files start with the SPDX header (`// SPDX-License-Identifier: MPL-2.0` + `// Copyright (c) Imperium42®, LLC.`; use `//-` in .pug, `/* */` in .css)

### Discord Commands
- Prefix commands: Default prefix is `.` (configurable)
- Command files: `{commandName}Cmd.js` pattern
- Slash commands: Being migrated, see `slashPing.js` as template

### Error Handling
- Consistent error logging: `console.error('[module]**ERR @ function: ${e}')`
- MongoDB connection issues logged to console
- Redis failures handled gracefully with fallbacks

## MongoDB Collections

- **guilds**: Discord server configurations
- **users**: User data including Steam IDs and verification status
- **giveaways**: Active and past giveaway events with keys
- **blacklists**: Global blacklist for unverified users

## Environment Variables

The bot uses YAML configuration instead of .env files. Key configurations:
- Discord bot token and client ID
- MongoDB connection URI
- Redis connection details
- Steam API keys (optional)
- Portal secret key for web interface

## Discord Bot Permissions

Required Gateway Intents:
- MessageContent (for reading command messages)

OAuth2 Scopes needed:
- bot
- applications.commands (for slash commands)

## Testing

- Test files in `test/` directory
- Mocha test runner configured in `.mocharc.yml`
- Run single test: Use Mocha's grep flag or specify test file directly