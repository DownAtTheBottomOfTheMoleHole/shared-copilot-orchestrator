#!/usr/bin/env bash
set -euo pipefail

current_sha="$(git rev-parse HEAD)"
if [[ "${TESTED_SHA}" != "${current_sha}" ]]; then
  echo "publish=false" >> "${GITHUB_OUTPUT}"
  echo "Skipping superseded Quality run for ${TESTED_SHA}; current main is ${current_sha}." >> "${GITHUB_STEP_SUMMARY}"
  exit 0
fi
echo "publish=true" >> "${GITHUB_OUTPUT}"
