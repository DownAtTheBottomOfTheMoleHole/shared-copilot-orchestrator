# Contributing

Contributions are welcome through GitHub issues and pull requests. For security vulnerabilities, follow [SECURITY.md](.github/SECURITY.md) and do not disclose details publicly.

## Development and tests

The parser and tests use the Node.js built-in test runner; no package installation is required. Use Node.js 22 or newer (CI uses Node.js 24) and run:

```sh
node --test tests/*.test.js
```

Pull requests must pass the tests, the commit-message check, and MegaLinter (actionlint, ESLint, markdownlint and yamllint). Keep changes scoped and update documentation when behavior or caller requirements change.

## Commit conventions

Use [Conventional Commits](https://www.conventionalcommits.org/) for every non-merge commit. CI checks the type, optional scope, and non-empty description. Allowed types match the organisation commitlint configuration: `feat`, `fix`, `perf`, `security`, `docs`, `style`, `refactor`, `test`, `build`, `ci`, `chore` and `revert`.

```text
feat(parser): support review payload arrays
fix: reject invalid target repositories
docs: clarify release pinning
```

Use `feat` for compatible features, `fix`, `perf` or `security` for patches, and `!` or a `BREAKING CHANGE:` footer for breaking changes. `docs`, `style`, `test`, `build`, `ci`, `chore`, `refactor` and `revert` commits do not increment the GitVersion release; a `BREAKING CHANGE:` footer on one of these types is also ignored, so use `type!:` or a releasing type for breaking changes. Make each commit atomic: it should contain one focused, independently understandable change. CI can validate commit format, while reviewers assess atomic scope.

## Pull requests and releases

Use the issue forms for bug reports and feature requests, and complete the pull request template. Maintainers categorize pull requests with the existing release labels (for example, `Semver Major`, `Semver Minor`, `Semver Patch`, `Documentation`, or `Chore`) for generated release notes.

Changes merged to `main` are versioned by GitVersion and published as GitHub releases. Keep full Git history and tags available to the release workflow; version tags follow `vMAJOR.MINOR.PATCH` and are protected by a tag ruleset, so floating major tags such as `v1` are not published.

### Versioning fallbacks

[`GitVersion.yml`](GitVersion.yml) resolves the version using these strategies, highest result wins:

1. **Tagged commit**: the latest `vMAJOR.MINOR.PATCH` tag reachable from the commit. Only lowercase `v`-prefixed tags count; `V1.2.3` and `1.2.3` are ignored.
2. **Merge message**: a version in a merge commit message, such as a merged `release/v2.0.0` branch.
3. **Branch name**: a version in a release branch name, for example `release/v2.0.0`.
4. **Configured next version**: an optional `next-version` in `GitVersion.yml`, written with the prefix, for example `v2.0.0`.
5. **Release branches**: versions from open release branches.
6. **Fallback**: `0.0.0` plus the calculated increment when no tags exist.

To force a version, for example to start a new major line, either merge a `release/vX.Y.Z` branch or temporarily add `next-version: vX.Y.Z` to `GitVersion.yml` and remove it once the release is tagged. Pre-release labels are applied on non-main branches (`alpha` for feature and other branches, `beta` for hotfix, `rc` for release, `pr` for pull requests); only `main` publishes releases. The release workflow refuses to publish a version older than the latest tag, which protects against a Fallback result if tags are missing.

Check a version locally with GitVersion 6.8:

```sh
gitversion /nocache /config GitVersion.yml /showvariable MajorMinorPatch
```

Workflow, script and versioning changes require maintainer review as specified in [CODEOWNERS](.github/CODEOWNERS). Branch protection, required status checks, and release permissions must also be enabled in repository settings; these cannot be enforced by files in this repository alone.
