#!/usr/bin/env bash
set -euo pipefail

: "${TESTED_SHA:?TESTED_SHA is required}"
: "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"
: "${GITHUB_STEP_SUMMARY:?GITHUB_STEP_SUMMARY is required}"

current_sha="$(git rev-parse HEAD)"
if [[ "${TESTED_SHA}" != "${current_sha}" ]]; then
  echo "publish=false" >> "${GITHUB_OUTPUT}"
  echo "Skipping Quality run for ${TESTED_SHA}; checked-out commit is ${current_sha}." >> "${GITHUB_STEP_SUMMARY}"
  exit 0
fi

if ! remote_main_sha="$(git ls-remote --exit-code origin refs/heads/main | awk 'NR == 1 { print $1 }')"; then
  echo "::error::Unable to resolve origin/main while validating release candidate."
  exit 1
fi
if [[ -z "${remote_main_sha}" ]]; then
  echo "::error::origin/main did not resolve to a commit."
  exit 1
fi
if [[ "${TESTED_SHA}" != "${remote_main_sha}" ]]; then
  echo "publish=false" >> "${GITHUB_OUTPUT}"
  echo "Skipping superseded Quality run for ${TESTED_SHA}; current main is ${remote_main_sha}." >> "${GITHUB_STEP_SUMMARY}"
  exit 0
fi

echo "publish=true" >> "${GITHUB_OUTPUT}"
