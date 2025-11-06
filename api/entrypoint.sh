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
cd /app/api || cd api
npx prisma migrate deploy || {
  echo "⚠️ Migration failed, trying to resolve..."
  npx prisma migrate resolve --applied 20220420012853_init || true
  npx prisma migrate deploy
}

echo "✅ Migrations completed! Starting the API..."
exec node dist/index.js
