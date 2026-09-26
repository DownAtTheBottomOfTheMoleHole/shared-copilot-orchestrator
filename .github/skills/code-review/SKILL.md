---
name: code-review
description: Review the reusable Copilot issue-orchestration workflow, its review-payload parser, and related documentation for actionable defects.
---

# Code review

Review changes against the repository's purpose: the reusable workflow accepts review findings from a caller and creates an issue in that same repository for a Copilot coding handoff.

- Trace untrusted `workflow_call` inputs through `.github/workflows/copilot-orchestrator.yml` and `scripts/parse-review.js` to `gh issue create`. Check that the destination is the caller repository, even when the supplied token can access other repositories.
- Check malformed and empty review payloads, sanitization of finding text, and safe serialization of `GITHUB_OUTPUT` values so findings cannot become workflow commands or additional outputs.
- Check action pinning and token permissions in the workflow. Distinguish protections declared in `.github/CODEOWNERS` from branch protection settings that must be configured on GitHub.
- Verify that `README.md` usage and security claims match the actual workflow. Report concrete, reproducible issues with file and line references; avoid speculative or unrelated changes.
