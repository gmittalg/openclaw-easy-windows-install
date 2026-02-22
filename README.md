# OpenClaw — Windows Desktop Installer

> **One-click Windows installer for [OpenClaw](https://github.com/openclaw/openclaw)** — a local AI gateway that connects large language models (Anthropic Claude, OpenAI, Google Gemini, OpenRouter) to your favourite chat clients (Telegram, Discord, Slack).

[![Release](https://img.shields.io/github/v/release/gmittalg/openclaw-easy-windows-install?style=flat-square)](https://github.com/gmittalg/openclaw-easy-windows-install/releases/latest)
[![License](https://img.shields.io/badge/license-Shared--Profit%20v1.0-blue?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11%20x64-lightgrey?style=flat-square)](https://github.com/gmittalg/openclaw-easy-windows-install/releases/latest)

---

## The bigger picture — democratising AI

The most powerful AI models in the world are available to anyone with an API key and a few dollars. Yet the people who benefit most from AI — non-technical professionals, small business owners, students, researchers in developing economies — are precisely the people locked out by the complexity of the tooling.

**OpenClaw** was built to close that gap. It is a self-hosted AI gateway that lets you:

- Chat with state-of-the-art LLMs through apps you already use every day — Telegram, Discord, Slack
- Run entirely on your own machine, keeping conversations private
- Switch providers instantly — move from Claude to GPT-4o to Gemini with a single config change
- Pay only for what you use, at API rates, with no middleman subscription

OpenClaw is already doing that for developers who are comfortable with a terminal, pnpm, and YAML files.

**This installer extends that reach to everyone else.**

A teenager in Lagos, a nurse in Manila, a freelancer in Warsaw — none of them should need to understand Node.js module resolution to talk to an AI. They should be able to download a `.exe`, answer three questions, and be done. That is exactly what this project delivers.

---

## Why does this exist?

OpenClaw is a powerful Node.js TypeScript project managed with **pnpm workspaces** and native add-ons (SQLite vector search, image processing). Setting it up manually on Windows means:

- Installing pnpm, Node.js ≥ 22, and build tools
- Running `pnpm install` (downloads ~800 MB of dependencies)
- Compiling native modules for the right platform
- Configuring `.env` and `openclaw.json` by hand
- Figuring out how to keep the gateway running in the background

**That is a 30-minute process with plenty of ways to go wrong.**

This project wraps everything into a **single 160 MB NSIS installer** that:

1. Walks users through provider selection and API key entry
2. Validates the key live against the provider's API before proceeding
3. Asks which chat channels to enable (Telegram, Discord, Slack) and collects tokens
4. Installs a self-contained Electron app with a bundled portable Node.js
5. Writes all config to `%APPDATA%\openclaw\` and starts the gateway automatically
6. Adds a system-tray icon for status, restart, and settings access
7. Ships with **auto-update** via GitHub Releases — users always stay current

---

## Architecture overview

```
openclaw-easy-windows-install/
│
├── electron/                   # Electron main-process TypeScript
│   ├── main.ts                 # App entry: creates window, tray, starts gateway
│   ├── gateway-manager.ts      # Spawns & supervises portable node.exe subprocess
│   ├── tray-manager.ts         # System-tray icon + context menu
│   ├── settings-window.ts      # Secondary BrowserWindow for in-app settings
│   ├── config-manager.ts       # Read/write %APPDATA%\openclaw\.env + openclaw.json
│   ├── ipc-handlers.ts         # IPC bridge: gateway control, config R/W, shell ops
│   ├── preload.ts              # contextBridge — exposes safe API to renderer
│   └── updater.ts              # electron-updater auto-update watcher
│
├── assets/
│   ├── icon.ico                # App icon
│   └── settings.html           # Vanilla HTML/CSS/JS settings UI (no framework)
│
├── nsis/
│   ├── installer.nsi           # Root NSIS script (hooked into electron-builder)
│   ├── WriteDotEnv.nsh         # Writes .env + openclaw.json after install
│   └── pages/
│       ├── ApiKeysPage.nsh     # Provider dropdown + password field + live validation
│       ├── ChannelsPage.nsh    # Enable/disable Telegram, Discord, Slack
│       ├── TokensPage.nsh      # Bot token inputs for enabled channels
│       └── InstallOptionsPage.nsh  # Launch on startup, start after install
│
└── scripts/
    ├── fetch-node.mjs           # Downloads portable Node.js v22 (~30 MB)
    ├── prepare-gateway-deploy.mjs  # Flat npm install → avoids pnpm virtual store bloat
    ├── build-gateway.mjs        # Runs pnpm build + ui:build in the OpenClaw repo
    └── stage-resources.mjs      # Pre-build validation: ensures all artifacts exist
```

---

## How it works

### The installer wizard (NSIS)

electron-builder produces an NSIS installer. We hook into its lifecycle with a custom `installer.nsi` that injects four wizard pages **before** the standard license and directory pages:

| Page | What it does |
|------|-------------|
| **API Keys** | User picks a provider (Anthropic, OpenAI, Gemini, OpenRouter) from a dropdown. Pastes their key. Before advancing, a PowerShell script calls the provider's health/models endpoint and returns exit code 0 (valid), 1 (bad key), or 2 (network error). |
| **Channels** | Checkboxes for Telegram, Discord, Slack. Unchecked = disabled in config. |
| **Tokens** | Shows bot-token input fields only for the channels enabled on the previous page. |
| **Install Options** | "Launch on Windows startup" and "Start OpenClaw after install" toggles. |

After installation, `customInstall` calls `WriteOpenClawConfig` which writes:
- `%APPDATA%\openclaw\.env` — API key variables
- `%APPDATA%\openclaw\openclaw.json` — gateway port, channel enable flags, bot tokens, auth mode

### The Electron shell

The Electron app is a thin shell whose only job is to **own the window and manage the gateway process**:

```
Electron main process
    │
    ├─ GatewayManager
    │      Spawns:  <resources>/node/node.exe <resources>/gateway/openclaw.mjs gateway
    │      Env:     OPENCLAW_STATE_DIR=%APPDATA%\openclaw
    │      Health:  HTTP GET http://127.0.0.1:18789/ every 500 ms (60 s timeout)
    │      Restart: exponential back-off 1 s → 30 s on unexpected exit
    │
    ├─ BrowserWindow  →  loads http://127.0.0.1:18789/?token=<auth-token>
    ├─ TrayManager    →  status indicator, Restart, Settings, Quit
    └─ SettingsWindow →  reads/writes config live, restart-gateway banner on save
```

The gateway process is the **real OpenClaw** — the Electron layer never reimplements gateway logic.

### Portable Node.js

To avoid requiring users to have Node.js installed, `scripts/fetch-node.mjs` downloads the official **Node.js v22 Windows x64** binary and places it at `node-dist/win-x64/node.exe`. electron-builder copies it into `resources/node/node.exe` inside the NSIS payload. This is the only Node runtime the gateway ever uses.

### Flat gateway node_modules

OpenClaw uses **pnpm** with a virtual store (`.pnpm/`) that produces symlinks and junctions. When electron-builder tries to copy that tree it either loops infinitely or blows past its 1 GB I/O buffer. `scripts/prepare-gateway-deploy.mjs` solves this by:

1. Extracting only production `dependencies` from OpenClaw's `package.json` (stripping dev/test/lint tools)
2. Running a plain `npm install --omit=dev` in `gateway-deploy/`
3. This produces a **flat, junction-free node_modules** that electron-builder can copy cleanly

The installer therefore ships a self-contained, runtime-ready dependency tree with no pnpm tooling required on the end user's machine.

### Auto-update

`electron/updater.ts` uses **electron-updater** pointed at this GitHub repository. On startup (after a 10-second delay to let the gateway settle), it silently checks for a newer release. When one is found the user sees a dialog offering to restart and apply the update. The update is fully differential thanks to the `.blockmap` file published alongside each release.

---

## Tech stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Desktop shell | **Electron 33** | Cross-version Chromium + Node IPC; ships its own V8 so no runtime dependency on the user's system |
| Installer | **NSIS** (Nullsoft Scriptable Install System) | Mature, small footprint, supports custom wizard pages and per-user installation without elevation |
| Packaging | **electron-builder 25** | Handles ASAR packing, NSIS generation, code-signing hooks, blockmap generation, and GitHub publish in one command |
| Main-process language | **TypeScript 5** | Type-safe IPC contracts between main, preload, and renderer |
| Node runtime (bundled) | **Node.js v22.14.0 (win-x64 portable)** | No install requirement on end-user machine; exact version pinned for ABI compatibility with native modules |
| Gateway process | **OpenClaw** (pnpm / ESM) | The actual AI gateway — not reimplemented, just supervised |
| Native modules | **sharp** (image processing), **sqlite-vec** (vector search) | Pre-compiled for win32-x64 by the gateway's own pnpm install |
| Settings UI | **Vanilla HTML/CSS/JS** | Zero bundler footprint; loaded as a local `file://` page; dark theme matching the gateway UI |
| Auto-update | **electron-updater 6** | Differential updates via GitHub Releases + blockmap; works without an update server |
| API key validation | **PowerShell + nsExec** | Written to `$PLUGINSDIR` at install time; calls provider REST endpoints; NSIS reads exit code |

---

## Requirements (to run the installer)

- Windows 10 or 11, 64-bit
- ~500 MB free disk space
- Internet connection (for API calls; the gateway can optionally run fully offline with a local model)
- An API key for at least one supported provider

---

## Get started in under 2 minutes

### Step 1 — Get an API key (free tiers available)

| Provider | Free tier | Sign up |
|----------|-----------|---------|
| Anthropic Claude | $5 free credit on new accounts | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI | Pay-as-you-go, starts at fractions of a cent | [platform.openai.com](https://platform.openai.com) |
| Google Gemini | Free tier with generous quota | [aistudio.google.com](https://aistudio.google.com) |
| OpenRouter | Aggregates many models, free credits on signup | [openrouter.ai](https://openrouter.ai) |

You only need **one** key to get started.

### Step 2 — Download and install

1. Go to **[Releases → Latest](https://github.com/gmittalg/openclaw-easy-windows-install/releases/latest)**
2. Download `OpenClaw-Setup-<version>.exe` (~160 MB — includes Node.js runtime and all dependencies, no install required)
3. Run the installer — **no administrator rights needed** (installs per-user by default)

### Step 3 — Follow the wizard

The installer asks you four simple questions:

```
┌─────────────────────────────────────────────────────┐
│  Which AI provider?                                 │
│  ● Anthropic Claude  ○ OpenAI  ○ Gemini  ○ OpenRouter│
│                                                     │
│  Paste your API key:  ••••••••••••••••••••  [Show]  │
│                                                     │
│  Validating key...  ✓ Valid                         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Which channels do you want to connect?             │
│  ☑ Telegram   ☐ Discord   ☐ Slack                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Telegram Bot Token:  ••••••••••••••••••••••••      │
│  (Create a bot via @BotFather and paste the token)  │
└─────────────────────────────────────────────────────┘
```

The installer **validates your API key in real-time** before proceeding — no more finding out your key was wrong after a 10-minute setup.

### Step 4 — Start chatting

OpenClaw launches automatically when setup completes. A tray icon appears in the system notification area. Open your Telegram / Discord / Slack and message your bot. You are now talking to a state-of-the-art AI model running entirely under your control.

---

## Post-install: changing settings

Right-click the **OpenClaw tray icon** → **Settings** to open the in-app settings panel. You can change API keys, toggle channels on/off, update bot tokens, and adjust the gateway port without editing any files. After saving, click **Restart Now** to apply the new configuration.

Alternatively, edit the files directly:

| File | Purpose |
|------|---------|
| `%APPDATA%\openclaw\.env` | API keys and bot tokens |
| `%APPDATA%\openclaw\openclaw.json` | Gateway port, channel flags, auth mode |

---

## Building from source

### Prerequisites

- Windows 10/11 x64
- Node.js ≥ 22 and npm (for this repo)
- pnpm (for the OpenClaw repo)
- The [OpenClaw](https://github.com/openclaw/openclaw) repo cloned as a sibling: `../openclaw/`

### Steps

```bash
# 1. Build the OpenClaw gateway and UI
cd ../openclaw
pnpm install
pnpm build
pnpm ui:build

# 2. From this repo
cd ../openclaw-easy-windows-install
npm install

# 3. Download portable Node.js (~30 MB)
node scripts/fetch-node.mjs

# 4. Create flat production node_modules for the gateway (~200 MB)
node scripts/prepare-gateway-deploy.mjs

# 5. Validate all artifacts are in place
node scripts/stage-resources.mjs

# 6. Compile Electron main-process TypeScript
npx tsc -p tsconfig.json

# 7. Build the NSIS installer
npx electron-builder --win
# → dist/OpenClaw Setup <version>.exe
```

To build **and publish** a new GitHub Release:

```bash
GH_TOKEN=<your_token> npx electron-builder --win --publish always
```

---

## Project layout decisions

**Why not bundle the OpenClaw source and run `pnpm install` during setup?**
Native modules (sharp, sqlite-vec) must be compiled for the exact Node.js ABI version. Pre-compiling on the build machine and shipping the binaries is the only reliable way to guarantee users never hit a build-tools error.

**Why Electron instead of just a Windows Service?**
A Windows Service requires elevation to install and is invisible. Electron gives users a visible window into what the gateway is doing, a tray icon for control, and a native-feeling app — all without admin rights.

**Why NSIS instead of WiX / Inno Setup?**
electron-builder has built-in NSIS support with a clean hook system (`customWelcomePage`, `customInstall`). NSIS scripts compile in milliseconds and the resulting installer is ~300 KB overhead on top of the payload.

---

## License

This software is released under the **[Shared-Profit License v1.0](LICENSE)**.

- **Free** for personal, educational, research, and non-commercial use
- **Commercial use** requires sharing 10% of gross revenue with the author, payable quarterly
- See [LICENSE](LICENSE) for full terms

---

## Contributing

Pull requests are welcome for bug fixes and improvements to the installer experience. For significant feature changes, please open an issue first to discuss the approach.

---

*Built with care so that anyone on Windows can run their own local AI gateway in under two minutes.*
