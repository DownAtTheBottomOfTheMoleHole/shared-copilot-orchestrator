#!/usr/bin/env bash
set -euo pipefail

pr_details="$(gh api "repos/${TARGET_REPOSITORY}/pulls/${TARGET_PR_NUMBER}" \
  --jq '{state, head_sha: .head.sha, head_repo: .head.repo.full_name}')"
if [[ "$(jq -r '.state' <<< "${pr_details}")" != 'open' || \
      "$(jq -r '.head_repo' <<< "${pr_details}")" != "${TARGET_REPOSITORY}" || \
      "$(jq -r '.head_sha' <<< "${pr_details}")" != "${TARGET_SHA}" ]]; then
  echo "::notice::PR is closed, from a fork, or its head differs from the reviewed commit; skipping the handoff."
  exit 0
fi

TOKEN_OWNER="$(gh api user --jq '.login')"
export TOKEN_OWNER
existing_comment="$(gh api --paginate "repos/${TARGET_REPOSITORY}/issues/${TARGET_PR_NUMBER}/comments?per_page=100" \
  --jq '.[] | select(.user.login == env.TOKEN_OWNER) | select((.body // "") | contains(env.ISSUE_MARKER)) | .html_url' \
  | sed -n '1p')"
if [[ -n "${existing_comment}" ]]; then
  echo "pr_comment_url=${existing_comment}" >> "${GITHUB_OUTPUT}"
  echo "Reused existing PR comment ${existing_comment}" >> "${GITHUB_STEP_SUMMARY}"
  exit 0
fi

body_file="$(mktemp)"
trap 'rm -f "${body_file}"' EXIT
printf '@copilot Please address these findings on this pull request branch.\n\n%s\n' "${ISSUE_BODY}" > "${body_file}"
comment_url="$(gh api -X POST "repos/${TARGET_REPOSITORY}/issues/${TARGET_PR_NUMBER}/comments" \
  -F "body=@${body_file}" --jq '.html_url')"
echo "pr_comment_url=${comment_url}" >> "${GITHUB_OUTPUT}"
echo "Requested changes on the reviewed PR: ${comment_url}" >> "${GITHUB_STEP_SUMMARY}"
