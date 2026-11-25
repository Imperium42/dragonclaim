# SPDX-License-Identifier: MPL-2.0
# Copyright (c) Imperium42®, LLC.
# Test the production Docker build, optionally cloning the private secrets repo.
# The repo URL (with access token) is passed as a BuildKit secret, never a build arg:
#   $env:SUBMODULE_URL_WITH_ACCESS_TOKEN = "https://<token>@github.com/<owner>/<repo>.git"; ./test-docker-build.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$secretArgs = @()
if ($env:SUBMODULE_URL_WITH_ACCESS_TOKEN) {
    $secretArgs = @("--secret", "id=SUBMODULE_URL_WITH_ACCESS_TOKEN")
} else {
    Write-Host "SUBMODULE_URL_WITH_ACCESS_TOKEN not set: building without the secrets repo." -ForegroundColor Yellow
}

docker build @secretArgs `
  --build-arg CACHE_BUST="$(Get-Date -Format 'yyyyMMddHHmmss')" `
  --progress=plain `
  -f prod.Dockerfile `
  -t dragonclaim-test .

Write-Host "Build complete! To run it:" -ForegroundColor Green
Write-Host 'docker run --rm -it -e NODE_ENV=production -e DOCKER_ENV=true -e CONFIG_YML=/app/data/dc-prod-secrets/config.prod.yml dragonclaim-test'
