#!/bin/bash

# Usage:
# ./run.sh [dev|prod] [up|down] [--detached]

MODE="${1:-dev}"
ACTION="${2:-up}"
DETACHED="$3"

COMPOSE_FILE="docker-compose.dev.yml"
if [ "$MODE" = "prod" ]; then
  COMPOSE_FILE="docker-compose.yml"
fi

echo "🛠 Mode: $MODE"
echo "📦 Action: $ACTION"
echo "📄 Using: $COMPOSE_FILE"

if [ "$ACTION" = "up" ]; then
  if [ "$MODE" = "dev" ]; then
    echo "🔁 Running in watch mode for development..."
    docker compose -f "$COMPOSE_FILE" watch
  else
    echo "🚀 Bringing up production containers..."
    docker compose -f "$COMPOSE_FILE" up --build $DETACHED
  fi
elif [ "$ACTION" = "down" ]; then
  echo "🧹 Stopping and removing containers..."
  docker compose -f "$COMPOSE_FILE" down
else
  echo "❌ Invalid action: $ACTION"
  echo "Usage: ./run.sh [dev|prod] [up|down] [--detached]"
  exit 1
fi
