#!/usr/bin/env bash
# Lint and test everything. Must exit 0 before every commit.
set -euo pipefail
cd "$(dirname "$0")/.."

for f in *.php lib/*.php tests/php/*.php; do
  [ -e "$f" ] || continue
  php -l "$f" > /dev/null
done

for f in assets/js/*.js; do
  node --check "$f"
done

node --test 'tests/js/*.test.js'
php tests/php/run.php
