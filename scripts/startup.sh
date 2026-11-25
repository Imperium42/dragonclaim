#!/bin/sh
# SPDX-License-Identifier: MPL-2.0
# Copyright (c) Imperium42®, LLC.
set -e

echo "Starting Dragonclaim Bot..."
echo "Environment: NODE_ENV=${NODE_ENV}"

# Determine which config file to use
# In production, CONFIG_YML can override the path
if [ "$NODE_ENV" = "production" ] && [ ! -z "$CONFIG_YML" ]; then
    CONFIG_FILE="$CONFIG_YML"
    echo "🔐 Production override - using CONFIG_YML path: $CONFIG_FILE"
elif [ "$NODE_ENV" = "production" ]; then
    # Check for dc-prod-secrets submodule first
    if [ -f "/app/data/dc-prod-secrets/config.prod.yml" ]; then
        CONFIG_FILE="/app/data/dc-prod-secrets/config.prod.yml"
        echo "🔐 Production mode - using data/dc-prod-secrets/config.prod.yml"
    else
        CONFIG_FILE="/app/data/config.prod.yml"
        echo "🚀 Production mode - using data/config.prod.yml"
    fi
else
    # Development mode
    CONFIG_FILE="/app/data/config.yml"
    echo "🔧 Development mode - using data/config.yml"
fi

# Check if config exists
if [ -f "$CONFIG_FILE" ]; then
    echo "✅ Found config at: $CONFIG_FILE"
else
    echo "❌ ERROR: Config file not found at: $CONFIG_FILE"
    echo "Options:"
    echo "  1. Set CONFIG_PATH env var to point to your config"
    echo "  2. Add private-config submodule with config.prod.yml"
    echo "  3. Place config.prod.yml in data/ directory"
    exit 1
fi

# If PORT env var is set and we want to use it, override the port in config
# For now, ignore PORT since we want to use 55554
# if [ ! -z "$PORT" ]; then
#     echo "🔄 Overriding port with PORT=$PORT"
#     sed -i "s/port: \"[0-9]*\"/port: \"$PORT\"/" "$CONFIG_FILE"
# fi

# Show the port we're using
CONFIGURED_PORT=$(grep -o 'port: "[0-9]*"' "$CONFIG_FILE" | grep -o '[0-9]*' || echo "55554")
echo "📡 Starting server on port $CONFIGURED_PORT..."

# Auto-detect if MongoDB needs initialization
if [ "$NODE_ENV" = "production" ]; then
    echo "🔍 Checking if MongoDB needs initialization..."
    # Extract MongoDB URI and DB name from config file using grep/sed
    MONGO_URI=$(grep "uri:" "$CONFIG_FILE" | head -1 | sed 's/.*uri: "\(.*\)"/\1/' | tr -d '"')
    MONGO_DB=$(grep "dbName:" "$CONFIG_FILE" | head -1 | sed 's/.*dbName: "\(.*\)"/\1/' | tr -d '"')

    if [ ! -z "$MONGO_URI" ]; then
        export MONGO_URI="$MONGO_URI"
        export MONGO_DB_NAME="$MONGO_DB"
        echo "📦 Using MongoDB: $MONGO_DB_NAME at ${MONGO_URI##*@} (credentials hidden)"
    fi

    # Run init-mongo.js - it should check internally if schemas exist
    node scripts/init-mongo.js || echo "⚠️  MongoDB init failed or already initialized"
fi

# Start the application with the appropriate config
export DRAGONCLAIM_CONFIG_FILE="$CONFIG_FILE"
exec node dist/server.js