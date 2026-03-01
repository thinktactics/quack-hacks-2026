#!/usr/bin/env bash
# Create venv and install Python + Node dependencies.
# To seed the database, run: ./reset.sh
set -euo pipefail

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

.venv/bin/pip install -r backend/requirements.txt
npm --prefix frontend install
