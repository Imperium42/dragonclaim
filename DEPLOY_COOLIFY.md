# Deploying Dragonclaim to Coolify

This guide explains how to deploy the Dragonclaim Discord bot to Coolify.

## Prerequisites

1. A Coolify instance (v4.x recommended)
2. MongoDB database (Atlas or self-hosted)
3. Redis instance (can be deployed in Coolify)
4. Discord Bot Token and credentials
5. GitHub repository access

## Deployment Steps

### 1. Prepare Configuration

Config is a YAML file. The bot does **not** read individual settings such as `MONGODB_URI` or
`DISCORD_BOT_TOKEN` from environment variables. Start from `data/config.template.yml`, then
use one of these:

- **Private secrets repo (built in):** keep `config.prod.yml` in a private repo. In Coolify, add
  `SUBMODULE_URL_WITH_ACCESS_TOKEN` (the repo URL with a read-only, fine-grained token) and
  enable **Use Docker Build Secrets**. The build clones it via a BuildKit secret, so the token
  never lands in the image.
- **File mount:** in Coolify use **Storages → File Mount** for your config, and set
  `CONFIG_YML=/path/inside/container/config.prod.yml`. `CONFIG_YML` is a **path**, not the YAML
  contents.

See [README-PROD.md](README-PROD.md) for the full lookup order and required values.

### 2. Set Up Redis in Coolify

1. Go to your Coolify project
2. Click "New Resource" → "Database"
3. Select "Redis"
4. Configure:
   - Name: `dragonclaim-redis`
   - Password: Generate a secure password
   - Port: 6379 (default)
5. Deploy Redis
6. Note the internal connection URL (usually `redis://redis:6379`)

### 3. Deploy the Bot Application

1. In Coolify, click "New Resource" → "Application"

2. Choose deployment source:
   - **GitHub App**: Connect your repository
   - **Docker Image**: Use `ghcr.io/yourusername/dragonclaim:latest` if you publish to GitHub Container Registry
   - **Git Repository**: Direct Git URL

3. Configure Build Settings:
   - **Build Pack**: Docker
   - **Dockerfile Location**: `/prod.Dockerfile`
   - **Port**: 55554

4. Configure Environment Variables:
   - `NODE_ENV=production`
   - `TRUST_PROXY=1` (Coolify's Traefik is one proxy hop; this lets rate limiting see real client IPs)
   - `DOCKER_ENV=true` if your Redis URI uses the `redis_db` hostname
   - `CONFIG_YML=<path>` if you use a file mount (Step 1)

5. Configure Resources:
   - **Memory**: Minimum 512MB, recommended 1GB
   - **CPU**: 0.5-1 CPU

6. Configure Health Check:
   - **Path**: `/health`
   - **Port**: 55554
   - **Interval**: 30 seconds
   - **Timeout**: 10 seconds
   - **Retries**: 3

7. Configure Networking:
   - Enable "Expose to Internet" if you need OAuth callbacks
   - Set custom domain if needed
   - Configure SSL (Coolify handles Let's Encrypt automatically)

### 4. MongoDB Setup

#### Using MongoDB Atlas (Recommended)
1. Create a cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Whitelist Coolify server IP(s)
3. Create database user and note credentials
4. Get connection string

#### Using Coolify MongoDB
1. Deploy MongoDB in Coolify similar to Redis
2. Note internal connection URL
3. Initialize with schemas (see below)

### 5. Post-Deployment

1. **Initialize MongoDB**:
   - SSH into your Coolify server
   - Run the initialization script:
   ```bash
   docker exec -it <container-id> node scripts/init-mongo.js
   ```

2. **Verify Deployment**:
   - Check application logs in Coolify
   - Visit `https://your-domain.com/health`
   - Verify bot appears online in Discord

3. **Configure Discord OAuth2** (if using portal):
   - In Discord Developer Portal
   - Add OAuth2 Redirect URL: `https://your-domain.com/discord/v1/giveaway/authed`

## Docker Compose Alternative

If Coolify supports docker-compose.yml, you can use this configuration:

```yaml
services:
  dragonclaim:
    build: .
    ports:
      - "55554:55554"
    environment:
      NODE_ENV: production
      DOCKER_ENV: "true"
      CONFIG_YML: /config/config.prod.yml # a path; production mode never reads data/config.yml
    volumes:
      - ./data/config.prod.yml:/config/config.prod.yml:ro
    depends_on:
      - redis
    restart: unless-stopped
    networks:
      - dragonclaim-network

  redis:
    image: redis:8-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    # No host port: only the bot needs Redis (keep it off the public interface)
    restart: unless-stopped
    networks:
      - dragonclaim-network

networks:
  dragonclaim-network:
    driver: bridge
```

## Troubleshooting

### Bot Won't Start
- Check Discord token is valid
- Verify MongoDB connection string
- Ensure Redis is accessible
- Check application logs in Coolify

### MongoDB Connection Issues
- Verify IP whitelist in Atlas
- Check credentials
- Test connection string with `mongosh`

### Redis Connection Failed
- Verify Redis is running
- Check password if set
- Use internal Docker network URL

### OAuth2 Not Working
- Verify redirect URIs match exactly
- Check client ID and secret
- Ensure public URL is accessible

## Security Considerations

1. **Never commit** `data/config.yml` to public repositories
2. Use Coolify's **secret management** for sensitive environment variables
3. Enable **SSL/TLS** for all public endpoints
4. Regularly **rotate** Discord bot tokens and API keys
5. Use **strong passwords** for MongoDB and Redis
6. Configure **firewall rules** to restrict database access

## Monitoring

1. Set up **Coolify notifications** for deployment failures
2. Monitor **application logs** regularly
3. Configure **uptime monitoring** for the health endpoint
4. Set **Discord alerts** for bot offline status

## Backup Strategy

1. **MongoDB**: Use Atlas automated backups or regular mongodump
2. **Configuration**: Keep encrypted backup of config.yml
3. **Keys Storage**: Store Discord keys separately from database

## Updating

To update the deployed application:

1. Push changes to your repository
2. In Coolify, trigger a rebuild/redeploy
3. Monitor logs during deployment
4. Verify bot functionality after update

## Performance Tuning

For production workloads:
- Increase polling intervals in config
- Enable MongoDB connection pooling
- Use Redis for session caching
- Consider horizontal scaling with multiple bot instances (requires sharding)