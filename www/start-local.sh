#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")"
: "${GPIAN_ADMIN_SECRET:=CHANGE-ME-LOCAL}"
export GPIAN_ADMIN_SECRET
if [ -z "${GPIAN_ADMIN_USER:-}" ] || [ -z "${GPIAN_ADMIN_PASSWORD:-}" ]; then echo "Définis les variables GPIAN_ADMIN_USER/GPIAN_ADMIN_PASSWORD et les 4 couples de zones avant de lancer."; exit 1; fi
( npx netlify functions:serve --port 9999 ) &
FUN_PID=$!
trap 'kill $FUN_PID 2>/dev/null || true' EXIT
sleep 3
npx http-server . -p 3999 -c-1
