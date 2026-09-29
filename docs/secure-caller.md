# Secure caller for Copilot review handoffs

Do not pass a user token from a `pull_request_review` workflow. That event runs
against the pull request merge ref, so a contributor with access to a branch in
the same repository could change the caller workflow before it runs. Use an
unprivileged collector and a separate, trusted `workflow_run` workflow instead.
The trusted workflow must validate the artifact against GitHub's API; the
artifact itself is untrusted data.

The example below requests changes **on the reviewed pull request branch** by
posting a PR comment through the SHA-pinned composite action. The action's
default `issue` mode remains available for tasks intentionally started from the
repository default branch.

1. Add `.github/workflows/collect-copilot-review.yml` to the caller repository:

   ```yaml
   name: Collect Copilot review

   on:
     pull_request_review:
       types: [submitted]

   permissions: {}

   jobs:
     collect:
       if: github.event.review.user.login == 'copilot-pull-request-reviewer[bot]' && github.event.pull_request.head.repo.full_name == github.repository && github.event.pull_request.user.login != 'dependabot[bot]'
       runs-on: ubuntu-latest
       steps:
         - name: Save review identifiers
           env:
             PR_NUMBER: ${{ github.event.pull_request.number }}
             REVIEW_ID: ${{ github.event.review.id }}
           run: |
             set -euo pipefail
             printf '{"pr_number":%s,"review_id":%s}\n' "${PR_NUMBER}" "${REVIEW_ID}" > "${RUNNER_TEMP}/review.json"
         - name: Upload identifiers
           uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
           with:
             name: review-event
             path: ${{ runner.temp }}/review.json
             retention-days: 1
   ```

2. Add `.github/workflows/handle-copilot-review.yml` on the protected default
   branch. Replace `<RELEASE_COMMIT_SHA>` with the full SHA of a reviewed release
   of this orchestrator. Do not use a pull request branch or floating ref there.

   ```yaml
   name: Handle Copilot review

   on:
     workflow_run:
       workflows: [Collect Copilot review]
       types: [completed]

   permissions: {}

   jobs:
     validate:
       if: github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.event == 'pull_request_review' && github.event.workflow_run.head_repository.full_name == github.repository
       runs-on: ubuntu-latest
       permissions:
         actions: read
         pull-requests: read
       outputs:
         valid: ${{ steps.review.outputs.valid }}
         pr_number: ${{ steps.review.outputs.pr_number }}
         review_sha: ${{ steps.review.outputs.review_sha }}
         review_payload: ${{ steps.review.outputs.review_payload }}
       steps:
         - name: Check whether the collector uploaded a review
           id: artifact
           env:
             GH_TOKEN: ${{ github.token }}
             RUN_ID: ${{ github.event.workflow_run.id }}
           run: |
             set -euo pipefail
             count="$(gh api "repos/${GITHUB_REPOSITORY}/actions/runs/${RUN_ID}/artifacts" \
               --jq '[.artifacts[] | select(.name == "review-event" and .expired == false)] | length')"
             if [[ "${count}" == '1' ]]; then
               echo 'present=true' >> "${GITHUB_OUTPUT}"
             else
               echo 'No review artifact; skipping.'
             fi
         - name: Download untrusted identifiers outside the workspace
           if: steps.artifact.outputs.present == 'true'
           uses: actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093 # v4.3.0
           with:
             name: review-event
             path: ${{ runner.temp }}/review-event
             run-id: ${{ github.event.workflow_run.id }}
             github-token: ${{ github.token }}
         - name: Verify the PR and review against GitHub
           id: review
           if: steps.artifact.outputs.present == 'true'
           env:
             GH_TOKEN: ${{ github.token }}
             TARGET_REPOSITORY: ${{ github.repository }}
             RUN_HEAD_BRANCH: ${{ github.event.workflow_run.head_branch }}
             RUN_HEAD_SHA: ${{ github.event.workflow_run.head_sha }}
           run: |
             set -euo pipefail
             artifact="${RUNNER_TEMP}/review-event/review.json"
             pr_number="$(jq -er '.pr_number | select(type == "number" and . > 0 and floor == .)' "${artifact}")"
             review_id="$(jq -er '.review_id | select(type == "number" and . > 0 and floor == .)' "${artifact}")"
             pr="$(gh api "repos/${TARGET_REPOSITORY}/pulls/${pr_number}")"
             review="$(gh api "repos/${TARGET_REPOSITORY}/pulls/${pr_number}/reviews/${review_id}")"
             if ! jq -e --arg repo "${TARGET_REPOSITORY}" \
               --arg branch "${RUN_HEAD_BRANCH}" --arg sha "${RUN_HEAD_SHA}" \
               '.state == "open" and .head.repo.full_name == $repo and .head.ref == $branch and .head.sha == $sha' <<< "${pr}" >/dev/null; then
               echo 'PR is closed, outside this repository, or unrelated to the collector run; skipping.'
               exit 0
             fi
             if ! jq -e --arg sha "$(jq -r '.head.sha' <<< "${pr}")" \
               '.user.login == "copilot-pull-request-reviewer[bot]" and (.state == "COMMENTED" or .state == "APPROVED") and .commit_id == $sha' <<< "${review}" >/dev/null; then
               echo 'Review identity, state, or commit does not match the current PR; skipping.'
               exit 0
             fi
             echo "valid=true" >> "${GITHUB_OUTPUT}"
             echo "pr_number=${pr_number}" >> "${GITHUB_OUTPUT}"
             echo "review_sha=$(jq -r '.commit_id' <<< "${review}")" >> "${GITHUB_OUTPUT}"
             echo "review_payload={\"id\":${review_id}}" >> "${GITHUB_OUTPUT}"

     handoff:
       needs: validate
       if: needs.validate.outputs.valid == 'true'
       runs-on: ubuntu-latest
       environment: copilot-orchestrator
       permissions:
         contents: read
       steps:
         - uses: DownAtTheBottomOfTheMoleHole/shared-copilot-orchestrator@<RELEASE_COMMIT_SHA>
           with:
             target_repository: ${{ github.repository }}
             target_pr_number: ${{ needs.validate.outputs.pr_number }}
             target_sha: ${{ needs.validate.outputs.review_sha }}
             review_payload: ${{ needs.validate.outputs.review_payload }}
             handoff_mode: pull_request_comment
             assign_copilot: 'true'
             target_repo_token: ${{ secrets.COPILOT_ORCHESTRATOR_ENV_TOKEN }}
   ```

Create a `copilot-orchestrator` environment in the caller repository before
enabling the handoff. Restrict it to the protected default branch and store the
short-lived, repository-scoped user token only as
`COPILOT_ORCHESTRATOR_ENV_TOKEN` in that environment. The token owner needs
write access and Copilot cloud agent access. Do not keep a repository or
organisation copy of this token.

Only the trusted `handoff` job receives the environment token. The composite
action uses it for reading review comments and posting the request. A
fine-grained token needs **pull requests: write** or **issues: write** to post a
PR comment. A PR comment with `@copilot` asks the agent to work on the existing
PR; the action does not prove that a cloud-agent session started. Check the
comment and agent session in an integration test before enabling automatic
handoffs.

The validation binds the artifact to the collector run's PR branch and SHA, and
intentionally skips stale reviews when the PR head has advanced. If GitHub does
not populate those workflow-run fields as expected for a review event, it fails
closed; verify them in an integration test rather than weakening the check.
Do not check out PR code, execute artifact contents, or substitute artifact
values directly into a shell script in the privileged workflow. Markdown/HTML
escaping in the orchestrator prevents formatting side effects, but cannot make
natural-language review text safe instructions; keep human review and required
checks on agent changes.
