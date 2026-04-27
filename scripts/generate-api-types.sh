#!/usr/bin/env bash
# Generate TypeScript types from the backend OpenAPI spec.
#
# Prerequisites:
#   npm install -D openapi-typescript
#
# Usage:
#   ./scripts/generate-api-types.sh                          # uses default localhost
#   LEO_API_URL=http://prod:11211 ./scripts/generate-api-types.sh

set -euo pipefail

API_URL="${LEO_API_URL:-http://localhost:11211}"
SPEC_URL="${API_URL}/api/v3/api-docs"
OUTPUT_DIR="$(dirname "$0")/../src/types"

echo "Fetching OpenAPI spec from ${SPEC_URL} ..."
curl -sSf "${SPEC_URL}" -o /tmp/leo-openapi.json

echo "Generating TypeScript types ..."
npx openapi-typescript /tmp/leo-openapi.json -o "${OUTPUT_DIR}/api-schema.ts"

echo "Done. Types written to ${OUTPUT_DIR}/api-schema.ts"
