#!/usr/bin/env bash
# Start Flask backend + Vite frontend in parallel.
# Kill both when this script exits (Ctrl-C or otherwise).
set -euo pipefail
trap 'kill 0' EXIT

PORT=8000 .venv/bin/python run.py &
npm --prefix frontend install --silent && npm --prefix frontend run dev &

wait
