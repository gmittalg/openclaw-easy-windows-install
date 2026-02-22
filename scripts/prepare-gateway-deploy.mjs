#!/usr/bin/env node
/**
 * prepare-gateway-deploy.mjs
 *
 * Creates a clean npm-style flat deployment of the gateway's production dependencies.
 * Uses `npm install --omit=dev --omit=optional` which produces a flat node_modules
 * without pnpm's .pnpm virtual store (which causes ~1.6GB duplication when bundled).
 *
 * Output: openclaw-windows/gateway-deploy/node_modules/
 * electron-builder then bundles from gateway-deploy/ instead of the pnpm node_modules.
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, copyFileSync, rmSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(PROJECT_ROOT, "../openclaw");
const DEPLOY_DIR = resolve(PROJECT_ROOT, "gateway-deploy");

console.log("[prepare-gateway-deploy] Starting clean production deployment...");

// Remove old deploy dir
if (existsSync(DEPLOY_DIR)) {
  console.log("[prepare-gateway-deploy] Removing old gateway-deploy/...");
  rmSync(DEPLOY_DIR, { recursive: true, force: true });
}
mkdirSync(DEPLOY_DIR, { recursive: true });

// Read the repo's package.json and create a stripped version with only production deps
const repoPkg = JSON.parse(readFileSync(resolve(REPO_ROOT, "package.json"), "utf8"));
const deployPkg = {
  name: repoPkg.name,
  version: repoPkg.version,
  dependencies: repoPkg.dependencies || {},
};

// Remove optional/dev tools that are large and not needed at runtime
const excludeDeps = new Set([
  "node-llama-cpp",      // optional local LLM, requires cmake to build
  "playwright-core",     // testing tool
  "@vitest/coverage-v8", // testing
  "vitest",              // testing
  "typescript",          // build tool
  "tsdown",              // build tool
  "tsx",                 // build tool
  "rolldown",            // build tool
  "oxfmt",               // lint tool
  "oxlint",              // lint tool
  "oxlint-tsgolint",     // lint tool
]);

for (const dep of excludeDeps) {
  if (deployPkg.dependencies[dep]) {
    console.log(`[prepare-gateway-deploy]   Excluding dev/optional dep: ${dep}`);
    delete deployPkg.dependencies[dep];
  }
}

// Also remove @types/* packages if any leaked into dependencies
for (const key of Object.keys(deployPkg.dependencies)) {
  if (key.startsWith("@types/")) {
    console.log(`[prepare-gateway-deploy]   Excluding @types: ${key}`);
    delete deployPkg.dependencies[key];
  }
}

writeFileSync(resolve(DEPLOY_DIR, "package.json"), JSON.stringify(deployPkg, null, 2), "utf8");
console.log(`[prepare-gateway-deploy] Production package.json written (${Object.keys(deployPkg.dependencies).length} deps)`);

// Run npm install
console.log("[prepare-gateway-deploy] Running npm install --omit=dev --omit=optional...");
execSync("npm install --omit=dev --omit=optional --no-audit --no-fund --legacy-peer-deps", {
  cwd: DEPLOY_DIR,
  stdio: "inherit",
  timeout: 300_000,
});

console.log("[prepare-gateway-deploy] Done! gateway-deploy/node_modules/ is ready.");
