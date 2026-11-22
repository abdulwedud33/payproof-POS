#!/usr/bin/env bash
# ==============================================================================
# PayProof POS - 1-Click Production VPS Deployment Script
# Usage: ./scripts/deploy.sh
# ==============================================================================

set -euo pipefail

echo "=================================================="
echo "    PayProof POS - Production Deployment         "
echo "=================================================="

# 1. Check for .env.production file
if [ ! -f ".env.production" ]; then
    echo "ERROR: .env.production file not found!"
    echo "Please copy .env.production.example to .env.production and configure your passwords."
    exit 1
fi

# 2. Check Docker and Compose availability
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed. Please install Docker."
    exit 1
fi

echo "[1/4] Building static owner web dashboard..."
pnpm --filter @payproof/owner-web build

echo "[2/4] Pulling & building production containers..."
docker compose --env-file .env.production -f docker-compose.prod.yml build

echo "[3/4] Launching production stack daemon..."
docker compose --env-file .env.production -f docker-compose.prod.yml up -d

echo "[4/4] Verifying health check..."
sleep 5
HEALTH_RESPONSE=$(curl -s http://localhost/health || echo "error")

if [[ "$HEALTH_RESPONSE" == *"healthy"* ]]; then
    echo "SUCCESS: PayProof POS is live and healthy!"
    echo "Caddy reverse proxy is handling HTTPS on ports 80/443."
else
    echo "WARNING: Health endpoint returned unexpected response: $HEALTH_RESPONSE"
    echo "Check container logs with: docker compose -f docker-compose.prod.yml logs"
fi
