#!/usr/bin/env bash
exec "$(dirname "$0")/production.sh" deploy "$@"
