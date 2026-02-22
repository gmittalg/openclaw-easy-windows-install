# CLAUDE.md — OpenClaw Easy Windows Install

This file gives Claude Code the context it needs to work effectively in this repository.

---

## What this repo is

A Windows desktop installer for [OpenClaw](https://github.com/openclaw/openclaw), an AI gateway that proxies LLM API calls (Anthropic, OpenAI, Gemini, OpenRouter) and exposes them through chat channels (Telegram, Discord, Slack).

The repo lives at `C:\Users\vboxuser\openclaw-easy-windows-install\` and the main OpenClaw gateway repo lives as a sibling at `C:\Users\vboxuser\openclaw\`.

---

## Architecture in one paragraph

An **Electron 33** app acts as a thin shell around the OpenClaw gateway process. At runtime, Electron spawns a **portable Node.js v22** binary (`resources/node/node.exe`) to run `resources/gateway/openclaw.mjs`. The Electron main process supervises the gateway (health-check, exponential-backoff restart), serves the gateway UI in a `BrowserWindow`, and provides a system-tray icon. A secondary `SettingsWindow` lets users edit config after install. The **NSIS** installer runs a guided wizard (provider selection → key validation → channel selection → tokens → install options) and writes `%APPDATA%\openclaw\.env` and `openclaw.json` before handing off to the standard electron-builder install flow.

---

## Key file map

```
electron/
  main.ts              App entry. Creates BrowserWindow, GatewayManager, TrayManager,
                       SettingsWindow, ConfigManager. Calls initAutoUpdater.
  gateway-manager.ts   Spawns node.exe subprocess. Health-checks port 18789.
                       Exponential back-off restart (1 s → 30 s).
  tray-manager.ts      System-tray icon + context menu (Open, Restart, Settings, Quit).
  settings-window.ts   620×680 BrowserWindow loading assets/settings.html.
  config-manager.ts    Reads/writes %APPDATA%\openclaw\.env and openclaw.json.
                       Preserves unknown keys already in the files.
  ipc-handlers.ts      ipcMain handlers for gateway:restart, config:read/write,
                       shell:openItem. Takes GatewayManager + ConfigManager.
  preload.ts           contextBridge. Exposes window.openclaw API to renderer.
  updater.ts           electron-updater. 10 s delay on startup, then silent check.
                       Shows dialog on update-downloaded.

assets/
  icon.ico             App icon (used by Electron and NSIS).
  settings.html        Vanilla JS/CSS settings UI. Dark theme #1a1a2e.
                       Tabs: API Keys | Channels & Tokens | General.

nsis/
  installer.nsi        Root NSIS script hooked by electron-builder.
                       Defines customWelcomePage, customInstall, customUninstall.
  WriteDotEnv.nsh      WriteOpenClawConfig function. Writes .env + openclaw.json.
  pages/
    ApiKeysPage.nsh    Provider dropdown (Anthropic/OpenAI/Google Gemini/OpenRouter).
                       Password input. PowerShell key validation via nsExec.
                       Exit 0=valid, 1=bad key (4xx), 2=network error.
    ChannelsPage.nsh   Checkboxes for Telegram, Discord, Slack.
    TokensPage.nsh     Token inputs, only shown for enabled channels.
    InstallOptionsPage.nsh  Auto-start + start-after-install toggles.

scripts/
  fetch-node.mjs             Downloads node.exe v22 win-x64 → node-dist/win-x64/
  prepare-gateway-deploy.mjs Flat npm install of gateway production deps → gateway-deploy/node_modules/
  build-gateway.mjs          Runs pnpm build + pnpm ui:build in ../openclaw/
  stage-resources.mjs        Validates all build artifacts exist before electron-builder.
  update-release-notes.mjs   PATCHes GitHub release body via API. Usage: node scripts/update-release-notes.mjs <token>
```

---

## Build pipeline (must run on Windows x64)

Run these in order from `C:\Users\vboxuser\openclaw-easy-windows-install\`:

```bash
# 0. Ensure gateway is built (run once or when openclaw source changes)
cd ../openclaw && pnpm install && pnpm build && pnpm ui:build && cd ../openclaw-easy-windows-install

# 1. Install this repo's npm dependencies
npm install

# 2. Download portable Node.js ~30 MB (skip if node-dist/win-x64/node.exe already exists)
node scripts/fetch-node.mjs

# 3. Create flat production node_modules for the gateway (~200 MB)
#    IMPORTANT: must re-run whenever openclaw/package.json dependencies change
node scripts/prepare-gateway-deploy.mjs

# 4. Validate all artifacts are present
node scripts/stage-resources.mjs

# 5. Compile Electron TypeScript
npx tsc -p tsconfig.json

# 6a. Build installer only
npx electron-builder --win

# 6b. Build AND publish to GitHub Releases
GH_TOKEN=<token> npx electron-builder --win --publish always
```

Step 3 (`prepare-gateway-deploy.mjs`) is the most commonly skipped step and causes the "file source doesn't exist" warning in electron-builder output. Always run it before a build if `gateway-deploy/node_modules/` is missing.

---

## Config locations (end-user machine)

| Path | Content |
|------|---------|
| `%APPDATA%\openclaw\.env` | API keys and bot tokens (KEY=VALUE format) |
| `%APPDATA%\openclaw\openclaw.json` | Gateway port, channel enable/disable flags, auth mode |

Both files are written by the NSIS installer (`WriteDotEnv.nsh`) and can be updated at runtime by the Settings UI.

---

## Gateway process

- Binary: `<install>/resources/node/node.exe`
- Script: `<install>/resources/gateway/openclaw.mjs`
- Args: `gateway`
- Env: `OPENCLAW_STATE_DIR=%APPDATA%\openclaw`, `NODE_DISABLE_COMPILE_CACHE=1`
- Port: `18789` (hardcoded in `electron/main.ts` and `electron/gateway-manager.ts`)
- Health check: `GET http://127.0.0.1:18789/` every 500 ms, 60 s timeout

---

## NSIS escaping rules (important)

NSIS expands `$Name` as a variable in `FileWrite` strings. To write a literal `$` in a PowerShell script via FileWrite, use `$$`:

```nsis
; Writes:  $headers = @{...}  in the .ps1 file
FileWrite $0 "$$headers = @{'Content-Type'='application/json'}"
```

**Never use `"transparent"` for `SetCtlColors` background** — on repaints, Windows does not erase old text first, causing ghosting. Use `"f0f0f0"` (the default dialog background colour) instead.

---

## GitHub release

- Repo: `https://github.com/gmittalg/openclaw-easy-windows-install`
- Latest release: `v2026.2.20` (ID `289184302`)
- To update release notes after the fact: `node scripts/update-release-notes.mjs <GH_TOKEN>`

---

## Known issues and fixes applied

### electron-builder patched files
After `npm install` these two patches must be verified/re-applied:

1. **`node_modules/builder-util/out/util.js`** — `exec()` maxBuffer patched from 1 GB to 100 MB to avoid a `RangeError: Array join too long` crash on large output.
2. **`node_modules/builder-util/out/log.js`** — logger patched to truncate huge error messages that crash the builder.

These patches are lost every time `npm install` is run. Consider recording them in a `patches/` directory and applying with `patch` or `patch-package` if they keep causing pain.

### pnpm circular junctions
OpenClaw's `node_modules/.pnpm` virtual store uses directory junctions that form circular references. electron-builder's file copy recurses infinitely into them. **Never point `extraResources` `from` at anything inside the OpenClaw pnpm workspace `node_modules/`.** Always use `gateway-deploy/node_modules/` (flat npm install).

### extensions symlink loop
`openclaw/extensions/*/node_modules` contains a pnpm workspace symlink back to the root. The `extraResources` config uses `"!**/node_modules/**"` to exclude it.

### EBUSY on default_app.asar during npm install
Caused by a running Electron process. Kill it: `powershell.exe -NonInteractive -Command "Stop-Process -Name 'electron' -Force -ErrorAction SilentlyContinue"`

---

## Electron IPC contract

```
ipcMain handler       ipcRenderer invoke        Preload exposure
─────────────────     ─────────────────────     ──────────────────────────
gateway:status        gateway:status            window.openclaw.getStatus()
gateway:restart       gateway:restart           window.openclaw.restartGateway()
config:read           config:read               window.openclaw.readConfig()
config:write          config:write              window.openclaw.writeConfig(config)
shell:openItem        shell:openItem            window.openclaw.openItem(path)
```

---

## Versioning convention

Versions follow `YYYY.M.D` (e.g. `2026.2.20`). Update in `package.json` → `"version"` before each release. electron-builder uses this as the installer file name and GitHub release tag.
