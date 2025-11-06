#!/usr/bin/env bash
set -euo pipefail

echo "📡 Waiting for database to become ready..."
ATTEMPTS=0
until npx prisma db execute --stdin <<<'SELECT 1' >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS+1))
  if [ $ATTEMPTS -ge 30 ]; then
    echo "❌ Database not reachable after $ATTEMPTS attempts. Exiting."
    exit 1
  fi
  echo "⏳ Waiting for database... (attempt $ATTEMPTS/30)"
  sleep 2
done

echo "✅ Database reachable! Running migrations..."
cd /app/api 2>/dev/null || cd api 2>/dev/null || true
pwd
echo "Running Prisma migrations..."
npx prisma migrate deploy 2>&1 || {
  echo "⚠️ First migration attempt failed, trying to resolve initial migration..."
  npx prisma migrate resolve --applied 20220420012853_init 2>&1 || true
  echo "Retrying migrations..."
  npx prisma migrate deploy 2>&1 || {
    echo "❌ Migrations failed! But continuing anyway..."
  }
}
echo "Migration process completed (check logs above for errors)"

echo "✅ Starting the API..."
cd /app/api 2>/dev/null || cd api 2>/dev/null || true
exec node dist/index.js
