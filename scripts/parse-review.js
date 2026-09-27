#!/usr/bin/env node

const fs = require("node:fs");
const { createHash, randomUUID } = require("node:crypto");

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function validateRepository(repository) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    throw new Error("TARGET_REPOSITORY must match owner/repo format");
  }
  return repository;
}

function validatePrNumber(prNumber) {
  if (!/^[1-9]\d*$/.test(prNumber)) {
    throw new Error("TARGET_PR_NUMBER must be a positive integer");
  }
  return prNumber;
}

function validateSha(sha) {
  if (!/^[0-9a-fA-F]{7,40}$/.test(sha)) {
    throw new Error("TARGET_SHA must be a valid git SHA");
  }
  return sha;
}

function sanitizeText(input, maxLength = 1000, options = {}) {
  if (typeof input !== "string") {
    return "";
  }
  const { neutralizeMentions = false } = options;

  const withoutControlChars = input
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n");

  const escapedHtmlChars = withoutControlChars
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const withoutMentions = neutralizeMentions
    ? escapedHtmlChars.replace(/@/g, "@\u200B")
    : escapedHtmlChars;
  const escapedMarkdown = withoutMentions.replace(
    /([\\`*_{}\[\]()#+\-.!|>])/g,
    "\\$1",
  );

  return escapedMarkdown.trim().slice(0, maxLength);
}

function parseReviewPayload(rawPayload) {
  if (!rawPayload || !rawPayload.trim()) {
    return [];
  }

  let payload;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  if (Array.isArray(payload.findings)) {
    return payload.findings;
  }

  if (typeof payload.body === "string") {
    return [payload];
  }

  return [];
}

function toFindingLine(finding, index) {
  const path = sanitizeText(String(finding.path || "unknown"), 200, {
    neutralizeMentions: true,
  });
  const line = sanitizeText(String(finding.line || "n/a"), 20, {
    neutralizeMentions: true,
  });
  const severity = sanitizeText(String(finding.severity || "unspecified"), 20, {
    neutralizeMentions: true,
  });
  const body = sanitizeText(String(finding.body || finding.comment || ""), 700, {
    neutralizeMentions: true,
  });

  if (!body) {
    return null;
  }

  return {
    actionable: true,
    fingerprintText: `${severity}\n${path}\n${line}\n${body}`,
    text: `${index + 1}. **${severity}** (${path}:${line}) - ${body}`,
  };
}

function writeOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) {
    throw new Error("GITHUB_OUTPUT is not set");
  }
  let delimiter;
  do {
    delimiter = `EOF_${name.toUpperCase()}_${randomUUID()}`;
  } while (value.includes(delimiter));
  fs.appendFileSync(outputPath, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
}

function main() {
  const targetRepository = validateRepository(
    getRequiredEnv("TARGET_REPOSITORY"),
  );
  const targetPrNumber = validatePrNumber(getRequiredEnv("TARGET_PR_NUMBER"));
  const targetSha = validateSha(getRequiredEnv("TARGET_SHA"));
  const findings = parseReviewPayload(process.env.REVIEW_PAYLOAD || "");

  const renderedFindings = findings
    .slice(0, 50)
    .map((finding, index) => toFindingLine(finding || {}, index))
    .filter(Boolean);
  const actionableFindings = renderedFindings.filter(
    (finding) => finding.actionable,
  );
  // Sort only for the fingerprint; keep the original order for issue display.
  const issueMarker = `Review fingerprint: ${createHash("sha256")
    .update(
      JSON.stringify({
        targetRepository,
        targetPrNumber,
        targetSha,
        findings: renderedFindings
          .map((finding) => finding.fingerprintText)
          .sort(),
      }),
    )
    .digest("hex")}`;
  const findingLines =
    renderedFindings.length > 0
      ? renderedFindings.map((finding) => finding.text).join("\n")
      : "No structured findings were provided in the payload.";
  // Copilot is started by assigning the issue in the workflow; a mention in an
  // issue body does not trigger it, so this line is the task instruction only.
  const handoffLine =
    actionableFindings.length > 0
      ? "Copilot: please propose and implement a fix for the findings above."
      : "No actionable findings were parsed. Verify caller payload mapping before requesting an automated fix.";

  const issueTitle = `Copilot review findings for PR #${targetPrNumber}`;
  const issueBody = [
    "## Copilot Review Findings",
    "",
    `Repository: \`${sanitizeText(targetRepository, 120)}\``,
    `PR: #${sanitizeText(targetPrNumber, 20)}`,
    `Commit: \`${sanitizeText(targetSha, 40)}\``,
    "",
    "### Findings",
    findingLines,
    "",
    handoffLine,
    "",
    issueMarker,
  ].join("\n");

  writeOutput("issue_title", issueTitle);
  writeOutput("issue_body", issueBody);
  writeOutput("actionable_count", String(actionableFindings.length));
  writeOutput("issue_marker", issueMarker);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
