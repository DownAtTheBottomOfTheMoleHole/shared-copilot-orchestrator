# shared-copilot-orchestrator

[![Build Status](https://github.com/DownAtTheBottomOfTheMoleHole/shared-copilot-orchestrator/actions/workflows/copilot-orchestrator.yml/badge.svg)](https://github.com/DownAtTheBottomOfTheMoleHole/shared-copilot-orchestrator/actions/workflows/copilot-orchestrator.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Security Rating](https://img.shields.io/badge/Security-Hardened-brightgreen.svg)](./.github/SECURITY.md)
[![Copilot Compatible](https://img.shields.io/badge/Copilot-Compatible-8A2BE2.svg)](https://github.com/features/copilot)

Enterprise reusable GitHub Actions workflow for converting Copilot code review findings into actionable issues in the source repository and triggering a Copilot coding handoff.

## Architecture

```text
[Caller Repo PR Comment/Review Payload]
                  |
                  v
     [shared-copilot-orchestrator]
     (.github/workflows/workflow_call)
                  |
                  v
        [Issue Created in Caller Repo]
                  |
                  v
 [@copilot Mentioned -> Copilot Coding Agent Fix]
```

## What this workflow does

- Accepts PR metadata and review payload via `workflow_call`.
- Sanitizes untrusted review text with `scripts/parse-review.js`.
- Creates a GitHub Issue in the caller repository with a direct `@copilot` handoff request.
- Runs with explicit least-privilege permissions only.

## Usage (copy/paste)

```yaml
jobs:
  orchestrate:
    uses: DownAtTheBottomOfTheMoleHole/shared-copilot-orchestrator/.github/workflows/copilot-orchestrator.yml@main
    with:
      target_repository: ${{ github.repository }}
      target_pr_number: ${{ github.event.pull_request.number }}
      target_sha: ${{ github.sha }}
      review_payload: ${{ toJson(github.event.review) }}
    secrets: { target_repo_token: ${{ secrets.COPILOT_ORCHESTRATOR_TOKEN }} }
```

## Security posture

- Minimal token permissions are enforced in the workflow.
- Untrusted review text is sanitized before issue rendering.
- Security disclosures are handled privately per [SECURITY.md](./.github/SECURITY.md).

## License

This project is licensed under the [MIT License](./LICENSE).
