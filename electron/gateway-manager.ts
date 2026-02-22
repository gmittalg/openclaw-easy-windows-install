import { spawn, ChildProcess } from "child_process";
import path from "path";
import http from "http";
import fs from "fs";
import os from "os";

const GATEWAY_PORT = 18789;
const HEALTH_CHECK_URL = `http://127.0.0.1:${GATEWAY_PORT}/`;
const HEALTH_CHECK_TIMEOUT_MS = 60_000;
const HEALTH_CHECK_INTERVAL_MS = 500;

const MIN_RESTART_DELAY_MS = 1_000;
const MAX_RESTART_DELAY_MS = 30_000;

export type GatewayStatus = "stopped" | "starting" | "running" | "error";

export class GatewayManager {
  private process: ChildProcess | null = null;
  private shuttingDown = false;
  private restartDelay = MIN_RESTART_DELAY_MS;
  private status: GatewayStatus = "stopped";
  private statusListeners: Array<(s: GatewayStatus) => void> = [];

  constructor(private readonly resourcesPath: string) {}

  private get nodeBin(): string {
    return path.join(this.resourcesPath, "node", "node.exe");
  }

  private get gatewayScript(): string {
    return path.join(this.resourcesPath, "gateway", "openclaw.mjs");
  }

  private get stateDir(): string {
    return path.join(process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"), "openclaw");
  }

  private setStatus(s: GatewayStatus): void {
    this.status = s;
    for (const listener of this.statusListeners) {
      listener(s);
    }
  }

  onStatusChange(listener: (s: GatewayStatus) => void): void {
    this.statusListeners.push(listener);
  }

  getStatus(): GatewayStatus {
    return this.status;
  }

  isRunning(): boolean {
    return this.status === "running";
  }

  /** Read the gateway auth token from openclaw.json (if auth mode is "token"). */
  getToken(): string | null {
    try {
      const configPath = path.join(this.stateDir, "openclaw.json");
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const auth = config?.gateway?.auth;
      if (auth?.mode === "token" && typeof auth.token === "string") {
        return auth.token;
      }
    } catch {
      // config not yet written or unreadable — no token
    }
    return null;
  }

  start(): void {
    if (this.process) return;
    this.shuttingDown = false;
    this.spawnGateway();
  }

  private spawnGateway(): void {
    if (this.shuttingDown) return;

    this.setStatus("starting");

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      OPENCLAW_STATE_DIR: this.stateDir,
      NODE_DISABLE_COMPILE_CACHE: "1",
    };

    console.log(`[GatewayManager] Spawning: ${this.nodeBin} ${this.gatewayScript} gateway`);

    this.process = spawn(this.nodeBin, [this.gatewayScript, "gateway"], {
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.process.stdout?.on("data", (chunk: Buffer) => {
      process.stdout.write(`[gateway] ${chunk}`);
    });

    this.process.stderr?.on("data", (chunk: Buffer) => {
      process.stderr.write(`[gateway] ${chunk}`);
    });

    this.process.on("exit", (code, signal) => {
      console.log(`[GatewayManager] Process exited: code=${code} signal=${signal}`);
      this.process = null;

      if (this.shuttingDown) {
        this.setStatus("stopped");
        return;
      }

      this.setStatus("error");
      const delay = this.restartDelay;
      this.restartDelay = Math.min(this.restartDelay * 2, MAX_RESTART_DELAY_MS);
      console.log(`[GatewayManager] Restarting in ${delay}ms...`);
      setTimeout(() => this.spawnGateway(), delay);
    });

    this.process.on("error", (err) => {
      console.error(`[GatewayManager] Spawn error:`, err);
      this.process = null;
      if (!this.shuttingDown) {
        this.setStatus("error");
      }
    });
  }

  async waitForReady(): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < HEALTH_CHECK_TIMEOUT_MS) {
      const ok = await this.checkHealth();
      if (ok) {
        this.restartDelay = MIN_RESTART_DELAY_MS;
        this.setStatus("running");
        return;
      }
      await sleep(HEALTH_CHECK_INTERVAL_MS);
    }
    throw new Error(`Gateway did not become healthy within ${HEALTH_CHECK_TIMEOUT_MS}ms`);
  }

  private checkHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(HEALTH_CHECK_URL, { timeout: 2000 }, (res) => {
        resolve(res.statusCode === 200);
        res.resume();
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  async restart(): Promise<void> {
    console.log("[GatewayManager] Restarting gateway...");
    await this.stop();
    await sleep(500);
    this.start();
    await this.waitForReady();
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.shuttingDown = true;
      if (!this.process) {
        this.setStatus("stopped");
        resolve();
        return;
      }

      const proc = this.process;
      const timeout = setTimeout(() => {
        proc.kill("SIGKILL");
      }, 5000);

      proc.once("exit", () => {
        clearTimeout(timeout);
        this.process = null;
        this.setStatus("stopped");
        resolve();
      });

      proc.kill("SIGTERM");
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
