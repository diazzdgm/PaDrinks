#!/usr/bin/env bash

set -euo pipefail

echo "🔧 Removing package-lock.json to force npm install instead of npm ci"
rm -f package-lock.json
