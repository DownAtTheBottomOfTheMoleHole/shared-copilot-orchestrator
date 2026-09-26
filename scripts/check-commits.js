#!/usr/bin/env node

const { execFileSync } = require("node:child_process");

const CONVENTIONAL_COMMIT =
  /^[a-z][a-z0-9-]*(?:\([^)]+\))?!?: \S.*$/;

function isConventionalCommit(subject) {
  return CONVENTIONAL_COMMIT.test(subject);
}

function main() {
  const [baseSha, headSha] = process.argv.slice(2);
  if (
    !baseSha ||
    !headSha ||
    !/^[0-9a-f]{7,64}$/i.test(baseSha) ||
    !/^[0-9a-f]{7,64}$/i.test(headSha)
  ) {
    throw new Error("Usage: check-commits.js <base-sha> <head-sha>");
  }

  const subjects = execFileSync(
    "git",
    ["log", "--format=%s", "--no-merges", `${baseSha}..${headSha}`],
    { encoding: "utf8" },
  )
    .split("\n")
    .filter(Boolean);

  if (subjects.length === 0) {
    throw new Error("No non-merge commits found in the pull request.");
  }

  const invalidSubjects = subjects.filter(
    (subject) => !isConventionalCommit(subject),
  );
  if (invalidSubjects.length > 0) {
    throw new Error(
      `Use Conventional Commit subjects for every commit:\n${invalidSubjects
        .map((subject) => `- ${subject}`)
        .join("\n")}`,
    );
  }

  console.log(`Validated ${subjects.length} Conventional Commit subject(s).`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

module.exports = { isConventionalCommit };
