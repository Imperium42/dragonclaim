#!/bin/bash
# SPDX-License-Identifier: MPL-2.0
# Copyright (c) Imperium42®, LLC.
# Test the production Docker build, optionally cloning the private secrets repo.
# The repo URL (with access token) is passed as a BuildKit secret, never a build arg:
#   SUBMODULE_URL_WITH_ACCESS_TOKEN="https://<token>@github.com/<owner>/<repo>.git" ./test-docker-build.sh
set -euo pipefail
cd "$(dirname "$0")"

secret_args=()
if [ -n "${SUBMODULE_URL_WITH_ACCESS_TOKEN:-}" ]; then
	secret_args=(--secret id=SUBMODULE_URL_WITH_ACCESS_TOKEN)
else
	echo "SUBMODULE_URL_WITH_ACCESS_TOKEN not set: building without the secrets repo."
fi

echo "Starting build at $(date)..."
docker build "${secret_args[@]}" \
	--build-arg CACHE_BUST="$(date +%s)" \
	--progress=plain \
	-f prod.Dockerfile \
	-t dragonclaim-test .

echo ""
echo "Build complete at $(date). To run it:"
echo "  docker run --rm -it -e NODE_ENV=production -e DOCKER_ENV=true \\"
echo "    -e CONFIG_YML=/app/data/dc-prod-secrets/config.prod.yml dragonclaim-test"
