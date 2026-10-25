#!/usr/bin/env bash
# Serve the site locally. Usage: ./start.sh [port]  (default 8000)
set -euo pipefail

PORT="${1:-8000}"
cd "$(dirname "$0")"

echo "Serving on http://localhost:${PORT}  (Ctrl+C to stop)"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
