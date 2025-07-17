#!/bin/bash

set -e

echo "🔧 Running OpenAPI and union generation..."

# Run OpenAPI generation, skip frontend
bash ./scripts/generate/api.sh --skip-frontend

# Run both union scripts
bash ./scripts/generate/pythonUnions.sh filters
bash ./scripts/generate/pythonUnions.sh resources

echo "✅ All generated content is up to date."
