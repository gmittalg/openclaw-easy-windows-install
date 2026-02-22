#!/usr/bin/env node
/**
 * build-gateway.mjs
 * Builds the OpenClaw gateway TypeScript and web UI in the parent repo.
 * Run from openclaw-windows/ directory.
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../openclaw");

console.log(`[build-gateway] Repo root: ${repoRoot}`);

if (!existsSync(resolve(repoRoot, "package.json"))) {
  console.error("[build-gateway] ERROR: Could not find parent repo package.json");
  process.exit(1);
}

const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function run(cmd, cwd = repoRoot) {
  console.log(`[build-gateway] $ ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit", shell: true });
}

// Build TypeScript
run(`${pnpmCmd} build`);

// Build web UI
run(`${pnpmCmd} ui:build`);

console.log("[build-gateway] Gateway build complete.");
