#!/data/data/com.termux/files/usr/bin/sh
set -eu
cd "$(dirname "$0")"
PORT="${DAYBREAK_PORT:-4186}"
URL="http://127.0.0.1:${PORT}/"
if curl -fsSI --max-time 5 "$URL" >/dev/null 2>&1; then
  printf 'Daybreak Row already running: %s\n' "$URL"
  exit 0
fi
nohup npm run dev -- --port "$PORT" > .daybreak-local.log 2>&1 < /dev/null &
printf '%s\n' "$!" > .daybreak-local.pid
sleep 5
if curl -fsSI --max-time 8 "$URL" >/dev/null 2>&1; then
  printf 'Daybreak Row ready: %s\n' "$URL"
else
  echo 'Daybreak Row failed to start. Review .daybreak-local.log' >&2
  exit 1
fi
