#!/usr/bin/env bash
# TriSeal local dev launcher (macOS / Linux / Git Bash).
# Usage:  ./scripts/dev.sh [--no-api] [--build]
set -euo pipefail
cd "$(dirname "$0")/.."

NO_API=0
BUILD=0
for arg in "$@"; do
  case "$arg" in
    --no-api) NO_API=1 ;;
    --build) BUILD=1 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

command -v node >/dev/null || { echo "Node.js 20+ is required: https://nodejs.org" >&2; exit 1; }
[ -d site/node_modules ] || { echo "> Installing site dependencies..."; npm --prefix site install; }

PY=$(command -v python3 || command -v python || true)
API_PID=""
if [ "$NO_API" = 0 ] && [ -n "$PY" ]; then
  "$PY" -c "import fastapi, uvicorn" 2>/dev/null || { echo "> Installing API dependencies..."; "$PY" -m pip install -r requirements.txt uvicorn; }
  echo "> Starting API on http://localhost:8000 (docs at /docs)"
  "$PY" -m uvicorn api.index:app --port 8000 &
  API_PID=$!
  trap '[ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null' EXIT
elif [ "$NO_API" = 0 ]; then
  echo "! Python not found - running the site without the API (every tool still works in the browser)."
fi

if [ "$BUILD" = 1 ]; then
  npm --prefix site run build
  npm --prefix site run preview -- --port 5173 --strictPort --open
else
  npm --prefix site run dev -- --port 5173 --strictPort --open
fi
