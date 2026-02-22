#!/usr/bin/env node
/**
 * stage-resources.mjs
 * Validates that all required build artifacts exist before electron-builder packages them.
 * Exits with code 1 if any required files are missing.
 */

import { existsSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(PROJECT_ROOT, "../openclaw");

const checks = [
  // Gateway entry point
  {
    path: resolve(REPO_ROOT, "openclaw.mjs"),
    description: "Gateway entry point (openclaw.mjs)",
  },
  // TypeScript build output
  {
    path: resolve(REPO_ROOT, "dist", "entry.js"),
    description: "Gateway TypeScript build (dist/entry.js)",
  },
  // Web UI
  {
    path: resolve(REPO_ROOT, "dist", "control-ui", "index.html"),
    description: "Control UI build (dist/control-ui/index.html)",
  },
  // Native modules — spot-check a few critical ones
  {
    path: resolve(REPO_ROOT, "node_modules", "sqlite-vec"),
    description: "sqlite-vec native module",
  },
  {
    path: resolve(REPO_ROOT, "node_modules", "sharp"),
    description: "sharp native module",
  },
  // node.exe
  {
    path: resolve(PROJECT_ROOT, "node-dist", "win-x64", "node.exe"),
    description: "Portable Node.js (node-dist/win-x64/node.exe)",
  },
];

// Optional: check for .node binary files in key native modules
const nativeModuleChecks = [
  {
    glob: resolve(REPO_ROOT, "node_modules", "sharp", "build", "Release", "sharp-win32-x64.node"),
    description: "sharp compiled binary",
  },
];

let hasErrors = false;

console.log("[stage-resources] Checking required build artifacts...\n");

for (const check of checks) {
  if (existsSync(check.path)) {
    const stat = statSync(check.path);
    const sizeInfo = stat.isFile() ? ` (${(stat.size / 1024).toFixed(0)} KB)` : " (dir)";
    console.log(`  ✓ ${check.description}${sizeInfo}`);
  } else {
    console.error(`  ✗ MISSING: ${check.description}`);
    console.error(`    Expected at: ${check.path}`);
    hasErrors = true;
  }
}

for (const check of nativeModuleChecks) {
  if (existsSync(check.glob)) {
    const stat = statSync(check.glob);
    console.log(`  ✓ ${check.description} (${(stat.size / 1024).toFixed(0)} KB)`);
  } else {
    console.warn(`  ! WARNING: ${check.description} not found at expected path`);
    console.warn(`    Path: ${check.glob}`);
    console.warn(`    This may indicate native modules were not compiled for Windows.`);
    // Don't fail — the module might be in a different build location
  }
}

console.log("");

if (hasErrors) {
  console.error("[stage-resources] FAILED — missing required artifacts.");
  console.error("Run the following to build:");
  console.error("  cd ../openclaw && pnpm install && pnpm build && pnpm ui:build");
  console.error("  cd openclaw-windows && node scripts/fetch-node.mjs");
  process.exit(1);
}

console.log("[stage-resources] All required artifacts present. Ready to package.");
