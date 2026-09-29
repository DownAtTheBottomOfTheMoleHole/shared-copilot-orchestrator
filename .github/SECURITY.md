# Security Policy

Security reports are taken seriously. Please follow this policy when reporting
a suspected vulnerability in **shared-copilot-orchestrator**.

## Supported versions

Security fixes are generally provided for the latest release.

Users should pin the Action to a reviewed full commit SHA, preferably one
associated with the latest published release. Older releases may not receive
security updates.

## Reporting a vulnerability

Please **do not** report suspected vulnerabilities in public GitHub issues,
discussions, pull requests or workflow logs.

Submit a private vulnerability report through GitHub Security Advisories for
this repository.

Include as much of the following information as possible:

- a clear description of the vulnerability;
- the affected version or commit SHA;
- the potential impact;
- reproducible steps or a minimal proof of concept;
- relevant configuration with all secrets removed;
- any known mitigations; and
- whether the vulnerability has been disclosed elsewhere.

Never include active access tokens, passwords, private keys, personal data or
unnecessary private repository content.

## What to expect

After receiving a report, the maintainers will make reasonable efforts to:

1. acknowledge and assess the report;
2. confirm whether the issue can be reproduced;
3. determine its impact and affected versions;
4. develop and test an appropriate fix or mitigation; and
5. coordinate disclosure with the reporter.

Response and remediation times depend on the severity and complexity of the
issue. No specific response time is guaranteed.

## Coordinated disclosure

Please keep vulnerability details confidential until a fix or mitigation is
available and disclosure has been coordinated with the maintainers.

After remediation, the maintainers may publish a GitHub Security Advisory
describing the affected versions, impact, fixes and available mitigations.

Please do not access, modify or delete data belonging to other users, disrupt
services, use social engineering or perform testing that violates applicable
law or GitHub's policies.

## Scope

Security reports may include vulnerabilities involving:

- unsafe handling or exposure of credentials;
- privilege-boundary or workflow-trigger bypasses;
- execution of untrusted pull-request or artifact content;
- command, workflow-output or content injection;
- unauthorised issue or pull-request modification;
- repository-target validation bypasses;
- sensitive information written to logs or outputs; and
- vulnerable dependencies used directly by the Action.

General usage questions, configuration problems and ordinary bugs should be
reported through the process described in `SUPPORT.md`.

Vulnerabilities affecting GitHub or GitHub Copilot rather than this Action
should be reported directly to GitHub through its appropriate security
reporting process.

## Security considerations for users

Users are responsible for:

- pinning the Action to a reviewed full commit SHA;
- granting the minimum required token permissions;
- storing tokens only in appropriately protected environments;
- restricting environment deployment branches and tags;
- reviewing workflow changes before merging them;
- applying security updates; and
- reviewing all AI-generated changes before relying on or merging them.

See `README.md` for the required secure caller architecture and token
configuration.

## Safe harbour

The maintainers will not pursue action against good-faith security research
that follows this policy, avoids privacy violations and service disruption,
and complies with applicable law.

This statement does not authorise testing against GitHub's infrastructure,
other users, or repositories you do not own or have explicit permission to
test.
