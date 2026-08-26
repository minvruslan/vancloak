#!/bin/sh
set -eu

: "${INTERFACE:?}"

awg show "$INTERFACE" allowed-ips
