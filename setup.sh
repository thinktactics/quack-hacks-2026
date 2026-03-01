#!/usr/bin/env bash
# Create venv, install Python + Node dependencies, and seed the database.
set -euo pipefail

# Create venv if it doesn't exist
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

.venv/bin/pip install -r backend/requirements.txt
npm --prefix frontend install

# Seed the database
.venv/bin/python seed.py
