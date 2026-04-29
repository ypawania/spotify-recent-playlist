#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = listFiles(root);

const suspicious = [
  {
    name: "serialized OAuth access token",
    pattern: /"access_token"\s*:\s*"[^"]+"/
  },
  {
    name: "serialized OAuth refresh token",
    pattern: /"refresh_token"\s*:\s*"[^"]+"/
  }
];

const failures = [];
for (const file of files) {
  const relative = path.relative(root, file);
  if (isForbiddenFile(relative)) {
    failures.push(`${relative}: credential or token file should not be in the repo`);
    continue;
  }

  const content = fs.readFileSync(file, "utf8");
  failures.push(...findEnvSecretAssignments(relative, content));

  for (const check of suspicious) {
    if (check.pattern.test(content)) {
      failures.push(`${relative}: ${check.name}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Potential secrets found in tracked files:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("No likely Spotify secrets found in tracked files.");

function listFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const relative = path.relative(root, fullPath);
    if (shouldSkip(relative)) {
      continue;
    }

    if (entry.isDirectory()) {
      results.push(...listFiles(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

function shouldSkip(relative) {
  return relative === ".git" ||
    relative.startsWith(".git/") ||
    relative === "node_modules" ||
    relative.startsWith("node_modules/") ||
    relative === "coverage" ||
    relative.startsWith("coverage/");
}

function isForbiddenFile(relative) {
  const basename = path.basename(relative);
  return basename === ".env" ||
    /^\.env\.(?!example$)/.test(basename) ||
    /token/i.test(basename) ||
    /auth-cache/i.test(basename);
}

function findEnvSecretAssignments(relative, content) {
  const problems = [];
  const allowed = new Map([
    ["SPOTIFY_CLIENT_ID", "your-client-id"],
    ["SPOTIFY_CLIENT_SECRET", "your-client-secret"]
  ]);

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    if (!allowed.has(key)) {
      continue;
    }

    const value = valueParts.join("=").trim().replace(/^['"]|['"]$/g, "");
    if (value && value !== allowed.get(key)) {
      problems.push(`${relative}: real ${key} value in env-style assignment`);
    }
  }

  return problems;
}
