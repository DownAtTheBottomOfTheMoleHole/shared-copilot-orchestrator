# shared-copilot-orchestrator

[![Down At The Bottom Of The Mole Hole banner](https://raw.githubusercontent.com/DownAtTheBottomOfTheMoleHole/.github/main/assets/banners/repositories/shared-copilot-orchestrator.png)](https://github.com/DownAtTheBottomOfTheMoleHole)
[![Workflow](https://github.com/DownAtTheBottomOfTheMoleHole/shared-copilot-orchestrator/actions/workflows/copilot-orchestrator.yml/badge.svg)](https://github.com/DownAtTheBottomOfTheMoleHole/shared-copilot-orchestrator/actions/workflows/copilot-orchestrator.yml)
[![Latest release](https://img.shields.io/github/v/release/DownAtTheBottomOfTheMoleHole/shared-copilot-orchestrator)](https://github.com/DownAtTheBottomOfTheMoleHole/shared-copilot-orchestrator/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Copilot Compatible](https://img.shields.io/badge/Copilot-Compatible-8A2BE2.svg)](https://github.com/features/copilot)
[![Security](https://img.shields.io/badge/Security-Policy-green.svg)](./.github/SECURITY.md)

Enterprise reusable GitHub Actions workflow for converting Copilot code review findings into actionable issues in the source repository and triggering a Copilot coding handoff.

## Architecture

```mermaid
flowchart TD
    A[Caller Repo PR Comment/Review Payload] --> B[shared-copilot-orchestrator<br />(.github/workflows/workflow_call)]
    B --> C[Issue Created in Caller Repo]
    C --> D[@copilot Mentioned -> Copilot Coding Agent Fix]
```

## What this workflow does

- Accepts PR metadata and review payload via `workflow_call`.
- Sanitizes untrusted review text with `scripts/parse-review.js`.
- Creates a GitHub Issue in the caller repository with a direct `@copilot` handoff request.
- Runs with explicit least-privilege permissions only.

## Releases

Releases are versioned with GitVersion and published automatically when changes reach `main`. The release workflow creates a `vMAJOR.MINOR.PATCH` tag and generates categorized notes using [`.github/release.yml`](.github/release.yml). Conventional commit messages drive version increments: `feat` for minor, `fix` and `perf` for patch, and `!` or `BREAKING CHANGE:` for major. Documentation, tests, and maintenance commits do not increment the version.

Use a published version tag when calling the reusable workflow:

```yaml
jobs:
  orchestrate:
    uses: DownAtTheBottomOfTheMoleHole/shared-copilot-orchestrator/.github/workflows/copilot-orchestrator.yml@v1.0.0
```

Replace `v1.0.0` with the release tag you have reviewed. CI and release automation run as separate workflows.

## Development

Run the parser tests locally with Node.js 20 or newer:

```sh
node --test tests/*.test.js
```

Pull requests targeting a branch with the Quality workflow are checked for conventional commit subjects and linted with MegaLinter. Keep commits atomic: each commit should represent one focused, independently understandable change. CI checks conventional formatting; reviewers assess whether commits are atomic. See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution and release conventions.

## Usage (copy/paste)

```yaml
jobs:
  orchestrate:
    uses: DownAtTheBottomOfTheMoleHole/shared-copilot-orchestrator/.github/workflows/copilot-orchestrator.yml@v1.0.0
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
