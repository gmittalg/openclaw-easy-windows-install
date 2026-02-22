#!/usr/bin/env node
/**
 * update-release-notes.mjs
 * PATCHes the GitHub release body for v2026.2.20.
 * Usage: node scripts/update-release-notes.mjs <github-token>
 */
import https from "https";

const token = process.argv[2];
if (!token) { console.error("Usage: node update-release-notes.mjs <token>"); process.exit(1); }

const RELEASE_ID = 289184302;

const releaseBody = `## OpenClaw for Windows — First Public Release

> Run your own local AI gateway on Windows. No terminal. No prerequisites. Just a .exe.

---

### What is OpenClaw?

OpenClaw is a self-hosted AI gateway that connects large language models — Anthropic Claude, OpenAI, Google Gemini, OpenRouter — to the chat apps you already use every day: Telegram, Discord, and Slack. You pay API rates directly, keep your conversations private, and switch models with a single config change.

This installer brings OpenClaw to **everyone on Windows** — not just developers.

---

### What's in this release

- **One-click NSIS installer** (~160 MB) — includes a bundled portable Node.js v22 runtime and all pre-compiled native modules. Nothing needs to be installed on the user's machine first.
- **Guided setup wizard** — four pages walk you through provider selection, API key entry, channel selection (Telegram / Discord / Slack), and bot token configuration. No file editing required.
- **Live API key validation** — your key is tested against the provider's API before the installer advances. Bad keys are caught immediately with a plain-language error message.
- **Electron shell with system tray** — the app runs silently in the background. A tray icon shows gateway status and provides Restart / Settings / Quit controls.
- **In-app Settings window** — change API keys, toggle channels, update bot tokens, and adjust the gateway port through a UI at any time after install. No touching config files manually.
- **Auto-update via GitHub Releases** — future releases are downloaded and applied silently. One dialog, one click.
- **Per-user install, no admin rights required** — installs to %LOCALAPPDATA%\\Programs\\OpenClaw and registers auto-start under the user's own registry hive.

---

### How to install

1. Download **\`OpenClaw-Setup-2026.2.20.exe\`** below
2. Run it — Windows may show a SmartScreen warning (click *More info → Run anyway*; the app is unsigned pending code-signing setup)
3. Follow the four-page wizard
4. OpenClaw opens automatically on completion

---

### Supported providers

| Provider | Notes |
|----------|-------|
| Anthropic Claude | Recommended — $5 free credit on new accounts |
| OpenAI | Pay-as-you-go, fractions of a cent per message |
| Google Gemini | Free tier with generous quota |
| OpenRouter | Aggregates many models; free credits on signup |

---

### Supported channels

- **Telegram** — create a bot via @BotFather, paste the token
- **Discord** — create an application + bot at discord.com/developers
- **Slack** — create a Slack app with bot + socket mode tokens

---

### System requirements

- Windows 10 or 11, 64-bit
- ~500 MB free disk space
- Internet connection (for AI API calls)

---

### Why we built this

The people who benefit most from AI — non-technical professionals, students, small business owners, researchers — are precisely the people locked out by developer-centric tooling. Getting OpenClaw onto a non-developer Windows machine means solving five hard constraints at once:

- **Zero prerequisites** — the installer ships its own Node.js runtime and pre-compiled native modules; nothing is built on the user's machine
- **No admin rights** — per-user NSIS install, HKCU registry auto-start, APPDATA config; no UAC prompt at any stage
- **The configuration cliff** — .env files are opaque to non-technical users; a guided wizard with real-time validation replaces manual file editing
- **Staying current** — auto-update via electron-updater means users never need to re-download manually
- **Post-install changes** — the Settings window surfaces every config option through UI, no file manager required

See [README.md](https://github.com/gmittalg/openclaw-easy-windows-install#the-accessibility-problem-we-spent-a-long-time-solving) for the full design rationale.

---

### Known limitations

- **Unsigned binary** — Windows SmartScreen will warn on first run. Code signing is planned for a future release.
- **x64 only** — ARM64 Windows is not yet supported.

---

*Accessibility, privacy, and simplicity — AI for everyone.*`;

const payload = JSON.stringify({
  name: "OpenClaw for Windows — v2026.2.20",
  body: releaseBody,
});

const options = {
  hostname: "api.github.com",
  path: `/repos/gmittalg/openclaw-easy-windows-install/releases/${RELEASE_ID}`,
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "openclaw-release-script",
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  },
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    const result = JSON.parse(data);
    if (result.html_url) {
      console.log("Release updated:", result.html_url);
    } else {
      console.error("Error:", JSON.stringify(result, null, 2));
      process.exit(1);
    }
  });
});

req.on("error", (err) => { console.error("Request failed:", err); process.exit(1); });
req.write(payload);
req.end();
