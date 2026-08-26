#!/bin/sh
set -eu

: "${INTERFACE:?}" "${CONFIGURATION_FILE:?}"

PEERS_FILE=$(mktemp)
trap 'rm -f "$PEERS_FILE"' EXIT
cat > "$PEERS_FILE"
[ -s "$PEERS_FILE" ] || exit 0

exec 9>"${CONFIGURATION_FILE}.lock"
flock -x 9

awk '
  NF == 0 { next }
  NF != 3 {
    print "Malformed peer line (expected PUBLIC_KEY PRESHARED_KEY CLIENT_IP); refusing to apply" > "/dev/stderr"
    exit 1
  }
  $3 in ip_owner && ip_owner[$3] != $1 {
    print "Client IP " $3 " is claimed by two peers in the same batch; refusing to apply" > "/dev/stderr"
    exit 1
  }
  $1 in peer_line && peer_line[$1] != $2 SUBSEP $3 {
    print "Peer " $1 " appears twice in the batch with different settings; refusing to apply" > "/dev/stderr"
    exit 1
  }
  { ip_owner[$3] = $1; peer_line[$1] = $2 SUBSEP $3 }
' "$PEERS_FILE"

awg show "$INTERFACE" allowed-ips | awk -v peers_file="$PEERS_FILE" '
  { for (i = 2; i <= NF; i++) owner[$i] = $1 }
  END {
    while ((getline line < peers_file) > 0) {
      if (split(line, field, " ") != 3) continue
      if (field[3] "/32" in owner && owner[field[3] "/32"] != field[1]) {
        print "Client IP " field[3] " is already registered to another peer; refusing to apply" > "/dev/stderr"
        exit 1
      }
    }
  }
'

awk -v peers_file="$PEERS_FILE" '
  sub(/^PublicKey *= */, "")    { peer = $0; next }
  sub(/^PresharedKey *= */, "") { persisted_preshared_key[peer] = $0; next }
  sub(/^AllowedIPs *= */, "")   { persisted_allowed_ips[peer] = $0; next }
  END {
    while ((getline line < peers_file) > 0) {
      if (split(line, field, " ") != 3) continue
      if (field[1] in persisted_preshared_key && persisted_preshared_key[field[1]] != field[2]) {
        print "Peer " field[1] " is already persisted with a different preshared key; refusing to apply" > "/dev/stderr"
        exit 1
      }
      if (field[1] in persisted_allowed_ips && persisted_allowed_ips[field[1]] != field[3] "/32") {
        print "Peer " field[1] " is already persisted with a different client IP; refusing to apply" > "/dev/stderr"
        exit 1
      }
    }
  }
' "$CONFIGURATION_FILE"

while IFS=' ' read -r PUBLIC_KEY PRESHARED_KEY CLIENT_IP || [ -n "$PUBLIC_KEY" ]; do
  [ -n "$PUBLIC_KEY" ] || continue

  printf '%s' "$PRESHARED_KEY" \
    | awg set "$INTERFACE" peer "$PUBLIC_KEY" preshared-key /dev/stdin allowed-ips "$CLIENT_IP/32"

  grep -qF "PublicKey = $PUBLIC_KEY" "$CONFIGURATION_FILE" && continue

  printf '\n[Peer]\nPublicKey = %s\nPresharedKey = %s\nAllowedIPs = %s/32\n' \
    "$PUBLIC_KEY" "$PRESHARED_KEY" "$CLIENT_IP" >> "$CONFIGURATION_FILE"
done < "$PEERS_FILE"

sync
