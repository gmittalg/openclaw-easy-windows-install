#!/usr/bin/env node
// makensis-wrapper.js
// Runs the real makensis.exe but with /V1 (errors only) to prevent Node.js
// child_process output buffer overflow when NSIS processes many files.
const { spawnSync } = require("child_process");
const path = require("path");

const realMakensis = path.join(__dirname, "..", "..", "..", "..", "..", "AppData", "Local", "electron-builder", "Cache", "nsis", "nsis-3.0.4.1", "Bin", "makensis.exe");

// Replace any /V[0-9] verbosity flag with /V1 (errors only)
const args = process.argv.slice(2).map(a => /^\/V\d$/i.test(a) ? "/V1" : a);
// If no verbosity flag was given, add /V1
if (!args.some(a => /^\/V\d$/i.test(a))) {
  args.unshift("/V1");
}

const result = spawnSync(realMakensis, args, {
  stdio: "inherit",
  windowsHide: false,
});

process.exit(result.status ?? 1);
