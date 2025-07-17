#!/bin/bash

set -e

BACKEND_DIR="src/backend"
FRONTEND_DIR="src/frontend"
VENV="$BACKEND_DIR/.venv"
SCRIPT_DIR="$BACKEND_DIR/scripts"

# Get the target argument (e.g., "filters" or "resources")
TARGET=$1

if [[ -z "$TARGET" ]]; then
  echo "❌ Usage: ./generate_openapi.sh [filters|resources]"
  exit 1
fi

# Determine which script to run
if [[ "$TARGET" == "filters" ]]; then
  PYTHON_SCRIPT="generateFilterUnion.py"
elif [[ "$TARGET" == "resources" ]]; then
  PYTHON_SCRIPT="generateResourceUnion.py"
else
  echo "❌ Unknown target: $TARGET"
  echo "   Use: filters or resources"
  exit 1
fi

echo "⚙️ Starting OpenAPI generation for '$TARGET'..."
echo "🐍 Running: $PYTHON_SCRIPT"

# Run the Python script using venv
$VENV/bin/python "$SCRIPT_DIR/$PYTHON_SCRIPT"

echo "✅ Script $PYTHON_SCRIPT completed."
