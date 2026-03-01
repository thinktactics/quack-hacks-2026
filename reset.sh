#!/usr/bin/env bash
# Clean build artifacts and reseed the database.
set -euo pipefail

echo "Removing __pycache__ directories..."
find . -type d -name '__pycache__' \
  -not -path './.venv/*' \
  -not -path './node_modules/*' \
  -exec rm -rf {} + 2>/dev/null || true

echo "Reseeding..."
.venv/bin/python seed.py
