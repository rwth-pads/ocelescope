#!/bin/bash

set -e # Exit immediately on error

echo "🔄 Syncing project dependencies..."

### FRONTEND SETUP
echo "📦 Installing frontend (npm) packages..."
cd src/frontend
npm install
cd ..

### BACKEND SETUP
echo "🐍 Installing backend (uv) dependencies..."
cd backend

# Activate venv and sync dependencies
uv sync

cd ../..

echo "✅ Dependency sync complete!"
