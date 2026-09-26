# Contributing

Contributions are welcome through GitHub issues and pull requests. For security vulnerabilities, follow [SECURITY.md](.github/SECURITY.md) and do not disclose details publicly.

## Development and tests

The parser and tests use the Node.js built-in test runner; no package installation is required. Use Node.js 20 or newer and run:

```sh
node --test tests/*.test.js
```

Pull requests targeting a branch with the Quality workflow must pass the tests, commit-message check, and MegaLinter workflow. Keep changes scoped and update documentation when behavior or caller requirements change.

## Commit conventions

Use [Conventional Commits](https://www.conventionalcommits.org/) for every non-merge commit. CI checks the type, optional scope, and non-empty description:

```text
feat(parser): support review payload arrays
fix: reject invalid target repositories
docs: clarify release pinning
```

Use `feat` for compatible features, `fix` or `perf` for patches, and `!` or a `BREAKING CHANGE:` footer for breaking changes. `docs`, `style`, `test`, `build`, `ci`, and `chore` commits do not increment the GitVersion release. Make each commit atomic: it should contain one focused, independently understandable change. CI can validate commit format, while reviewers assess atomic scope.

## Pull requests and releases

Use the issue forms for bug reports and feature requests, and complete the pull request template. Maintainers categorize pull requests with the existing release labels (for example, `Semver Major`, `Semver Minor`, `Semver Patch`, `Documentation`, or `Chore`) for generated release notes.

Changes merged to `main` are versioned by GitVersion and published as GitHub releases. Keep full Git history and tags available to the release workflow; version tags follow `vMAJOR.MINOR.PATCH`.

Workflow changes require maintainer review as specified in [CODEOWNERS](.github/CODEOWNERS). Branch protection, required status checks, and release permissions must also be enabled in repository settings; these cannot be enforced by files in this repository alone.
