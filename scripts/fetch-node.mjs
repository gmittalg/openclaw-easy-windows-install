#!/usr/bin/env node
/**
 * fetch-node.mjs
 * Downloads the official Node.js 22.x LTS Windows x64 portable binary
 * and extracts node.exe to node-dist/win-x64/node.exe
 *
 * Node.js distributes a "node.exe" inside win-x64 zip archives.
 * We download the zip, extract just node.exe, and place it in node-dist/win-x64/.
 */

import { createWriteStream, existsSync, mkdirSync, unlinkSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import https from "https";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

// Node 22 LTS (Iron) — update version here for upgrades
const NODE_VERSION = "22.14.0";
const NODE_DIST_URL = `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`;
const OUTPUT_DIR = resolve(PROJECT_ROOT, "node-dist", "win-x64");
const OUTPUT_EXE = resolve(OUTPUT_DIR, "node.exe");
const TEMP_ZIP = resolve(PROJECT_ROOT, "node-dist", `node-${NODE_VERSION}-win-x64.zip`);

if (existsSync(OUTPUT_EXE)) {
  console.log(`[fetch-node] node.exe already exists at ${OUTPUT_EXE} — skipping download.`);
  process.exit(0);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(dirname(TEMP_ZIP), { recursive: true });

console.log(`[fetch-node] Downloading Node.js ${NODE_VERSION} from:`);
console.log(`  ${NODE_DIST_URL}`);

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    let downloaded = 0;
    let total = 0;

    function get(url) {
      https.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        total = parseInt(res.headers["content-length"] ?? "0", 10);
        res.on("data", (chunk) => {
          downloaded += chunk.length;
          if (total > 0) {
            const pct = ((downloaded / total) * 100).toFixed(1);
            process.stdout.write(`\r  ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)} MB)`);
          }
        });
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          process.stdout.write("\n");
          resolve();
        });
      }).on("error", reject);
    }

    get(url);
  });
}

async function extractNodeExe(zipPath, nodeVersion, outputExe) {
  // Write a temp PowerShell script to avoid inline escaping issues
  const innerPath = `node-v${nodeVersion}-win-x64/node.exe`;
  const tmpScript = resolve(PROJECT_ROOT, "node-dist", "_extract.ps1");

  const psContent = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/\\/g, "/")}')
$entry = $zip.Entries | Where-Object { $_.FullName -eq '${innerPath}' }
if ($null -eq $entry) {
  $zip.Dispose()
  Write-Error "node.exe not found in zip (looked for: ${innerPath})"
  exit 1
}
$stream = $entry.Open()
$output = [System.IO.File]::Create('${outputExe.replace(/\\/g, "/")}')
$stream.CopyTo($output)
$output.Close()
$stream.Close()
$zip.Dispose()
Write-Host "Extracted node.exe ($($entry.Length) bytes)"
`.trim();

  (await import("fs")).writeFileSync(tmpScript, psContent, "utf8");

  try {
    const { stdout, stderr } = await execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpScript}"`,
      { maxBuffer: 10 * 1024 * 1024 },
    );
    if (stdout) console.log("[fetch-node]", stdout.trim());
    if (stderr) console.error("[fetch-node] stderr:", stderr.trim());
  } finally {
    try { (await import("fs")).unlinkSync(tmpScript); } catch { /* ignore */ }
  }
}

try {
  await download(NODE_DIST_URL, TEMP_ZIP);
  console.log(`[fetch-node] Extracting node.exe...`);
  await extractNodeExe(TEMP_ZIP, NODE_VERSION, OUTPUT_EXE);

  // Clean up zip
  try { unlinkSync(TEMP_ZIP); } catch { /* ignore */ }

  if (!existsSync(OUTPUT_EXE)) {
    throw new Error("node.exe was not created after extraction");
  }

  const { size } = (await import("fs")).statSync(OUTPUT_EXE);
  console.log(`[fetch-node] node.exe ready: ${OUTPUT_EXE} (${(size / 1024 / 1024).toFixed(1)} MB)`);
} catch (err) {
  console.error("[fetch-node] ERROR:", err.message);
  process.exit(1);
}
