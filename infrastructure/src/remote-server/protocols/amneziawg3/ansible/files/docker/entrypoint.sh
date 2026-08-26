#!/bin/sh
set -eu

: "${CONFIGURATION_FILE:?}" "${SERVER_PUBLIC_KEY_FILE:?}" "${SERVER_PUBLIC_KEY:?}"

[ "$(cat "$SERVER_PUBLIC_KEY_FILE" 2>/dev/null || true)" = "$SERVER_PUBLIC_KEY" ] \
  || { echo "state directory does not belong to this endpoint" >&2; exit 1; }

awg-quick up "$CONFIGURATION_FILE"

trap 'awg-quick down "$CONFIGURATION_FILE" || true; exit 0' TERM INT
sleep infinity &
wait $!
