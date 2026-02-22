import fs from "fs";
import path from "path";
import os from "os";

export interface AppConfig {
  env: {
    ANTHROPIC_API_KEY?: string;
    OPENAI_API_KEY?: string;
    GEMINI_API_KEY?: string;
    OPENROUTER_API_KEY?: string;
    TELEGRAM_BOT_TOKEN?: string;
    DISCORD_BOT_TOKEN?: string;
    SLACK_BOT_TOKEN?: string;
    SLACK_APP_TOKEN?: string;
  };
  json: {
    gateway: { mode: string; port: number; bind: string; auth: { mode: string } };
    channels: Record<string, { enabled: boolean }>;
  };
}

const KNOWN_ENV_KEYS: Array<keyof AppConfig["env"]> = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "OPENROUTER_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "DISCORD_BOT_TOKEN",
  "SLACK_BOT_TOKEN",
  "SLACK_APP_TOKEN",
];

export class ConfigManager {
  private get stateDir(): string {
    return path.join(
      process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"),
      "openclaw",
    );
  }

  private get envPath(): string {
    return path.join(this.stateDir, ".env");
  }

  private get jsonPath(): string {
    return path.join(this.stateDir, "openclaw.json");
  }

  readConfig(): AppConfig {
    const env = this.readEnv();
    const json = this.readJson();
    return { env, json };
  }

  private readEnv(): AppConfig["env"] {
    const result: AppConfig["env"] = {};
    try {
      const content = fs.readFileSync(this.envPath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if ((KNOWN_ENV_KEYS as string[]).includes(key)) {
          (result as Record<string, string>)[key] = value;
        }
      }
    } catch {
      // File doesn't exist yet — return empty
    }
    return result;
  }

  private readJson(): AppConfig["json"] {
    const defaults: AppConfig["json"] = {
      gateway: { mode: "local", port: 18789, bind: "127.0.0.1", auth: { mode: "none" } },
      channels: {},
    };
    try {
      const content = fs.readFileSync(this.jsonPath, "utf8");
      const parsed = JSON.parse(content);
      return {
        gateway: { ...defaults.gateway, ...(parsed.gateway ?? {}) },
        channels: parsed.channels ?? {},
      };
    } catch {
      return defaults;
    }
  }

  writeConfig(config: AppConfig): void {
    fs.mkdirSync(this.stateDir, { recursive: true });
    this.writeEnv(config.env);
    this.writeJson(config.json);
  }

  private writeEnv(env: AppConfig["env"]): void {
    // Preserve any unknown keys already in the file
    const existing: Record<string, string> = {};
    try {
      const content = fs.readFileSync(this.envPath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        if (!(KNOWN_ENV_KEYS as string[]).includes(key)) {
          existing[key] = value;
        }
      }
    } catch {
      // File doesn't exist yet
    }

    const lines: string[] = ["# OpenClaw configuration — managed by the Settings UI", ""];

    // Write known keys (non-empty values only)
    for (const key of KNOWN_ENV_KEYS) {
      const value = (env as Record<string, string | undefined>)[key];
      if (value && value.trim()) {
        lines.push(`${key}=${value.trim()}`);
      }
    }

    // Preserve unknown user-added keys
    for (const [key, value] of Object.entries(existing)) {
      lines.push(`${key}=${value}`);
    }

    lines.push("");
    fs.writeFileSync(this.envPath, lines.join("\n"), "utf8");
  }

  private writeJson(json: AppConfig["json"]): void {
    // Read existing to preserve unknown top-level fields
    let existing: Record<string, unknown> = {};
    try {
      existing = JSON.parse(fs.readFileSync(this.jsonPath, "utf8"));
    } catch {
      // No existing file
    }

    const merged = {
      ...existing,
      gateway: { ...(existing.gateway as object | undefined), ...json.gateway },
      channels: json.channels,
    };

    fs.writeFileSync(this.jsonPath, JSON.stringify(merged, null, 2), "utf8");
  }
}
