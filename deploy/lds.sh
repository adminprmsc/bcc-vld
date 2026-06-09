#!/usr/bin/env bash
# Backward-compatible alias for production.sh
exec "$(dirname "$0")/production.sh" "$@"
