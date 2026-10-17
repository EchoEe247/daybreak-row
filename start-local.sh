#!/data/data/com.termux/files/usr/bin/sh
set -eu
cd "$(dirname "$0")"
PORT="${DAYBREAK_PORT:-4186}"
HOST="${DAYBREAK_HOST:-127.0.0.1}"
URL="http://127.0.0.1:${PORT}/"
IDENTITY="${URL}__daybreak/identity.txt"
# Do not accept unrelated HTTP services as the actual game.
probe() { [ "$(curl -fsS --max-time 4 "$IDENTITY" 2>/dev/null || true)" = "daybreak-row-instance-v1" ]; }
if probe; then
  printf 'Daybreak Row already running: %s\n' "$URL"
  exit 0
fi
if curl -fsS --max-time 4 "$URL" >/dev/null 2>&1; then
  echo "Port ${PORT} is occupied by a different service. Cannot safely launch Daybreak Row." >&2
  exit 1
fi
# Local/offline by default. For explicit LAN access: DAYBREAK_HOST=0.0.0.0
export VITE_GROK_EXTENSIONS="${VITE_GROK_EXTENSIONS:-0}"
nohup npm run dev -- --host "$HOST" --port "$PORT" > .daybreak-local.log 2>&1 < /dev/null &
printf '%s\n' "$!" > .daybreak-local.pid
sleep 5
if probe; then
  printf 'Daybreak Row ready: %s\n' "$URL"
else
  echo 'Daybreak Row failed to start or identity mismatch. Review .daybreak-local.log' >&2
  exit 1
fi
