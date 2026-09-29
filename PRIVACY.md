# Privacy Notice

_Last updated: 29 September 2026_

This Privacy Notice explains how **shared-copilot-orchestrator** ("Action"),
provided by **Down At The Bottom Of The Mole Hole** ("Developer"), processes
information.

## 1. Information processed

When configured by a user, the Action may process:

- repository and pull-request identifiers;
- commit SHAs;
- review identifiers and inline review comments;
- issue and pull-request content;
- GitHub usernames and related metadata; and
- credentials supplied through the caller's GitHub Actions environment.

This information may include personal data if repository content or review
comments identify an individual.

## 2. How information is used

The Action processes information only to:

- validate a Copilot review;
- identify and sanitise actionable findings;
- create or reuse an issue;
- post a fix request on a reviewed pull request; or
- assign an issue to GitHub Copilot when requested.

The Action does not use this information for advertising or sell it to third
parties.

## 3. Processing location

The Action runs within the GitHub Actions environment selected by the user.
Information is exchanged with GitHub through GitHub's APIs.

The Developer does not operate an external service for the Action and does
not receive or independently store information processed during workflow
runs.

Users should review GitHub's applicable privacy terms to understand how
GitHub processes information.

## 4. Credentials

Tokens are supplied by the user through their GitHub Actions environment.
The Developer does not receive or retain these tokens.

Users are responsible for restricting tokens to the minimum necessary
repositories and permissions, protecting their environments and rotating or
revoking credentials when appropriate.

## 5. Storage and retention

The Action does not maintain its own database or persistent storage.

Issues, comments, workflow logs, artifacts and other records created or
retained by GitHub remain subject to the user's repository configuration,
retention settings and GitHub's policies.

## 6. Sharing

The Action communicates information to GitHub only as required to provide
its documented functionality. The Developer does not sell personal data or
share it with independent advertisers.

Repository administrators control access to information stored in their
repositories and workflows.

## 7. User responsibilities

Users are responsible for:

- having a lawful basis to process information supplied to the Action;
- providing any notices and obtaining any consent required by law;
- avoiding unnecessary personal or sensitive information in review content;
- managing repository access and retention settings; and
- responding to applicable data-access or deletion requests.

## 8. Security

The Action includes controls intended to restrict token use, validate its
execution context and sanitise untrusted review content. No system can
guarantee absolute security.

Security concerns should be reported as described in
./.github/SECURITY.md.

## 9. Changes

This Privacy Notice may be updated when the Action or its data-processing
behaviour changes. The latest version will be published in this repository.

## 10. Contact

For privacy questions, use the support process described in
./.github/SUPPORT.md.