import { app, BrowserWindow, shell } from "electron";
import path from "path";
import { GatewayManager } from "./gateway-manager";
import { TrayManager } from "./tray-manager";
import { SettingsWindow } from "./settings-window";
import { ConfigManager } from "./config-manager";
import { registerIpcHandlers } from "./ipc-handlers";
import { initAutoUpdater } from "./updater";

const GATEWAY_PORT = 18789;
const GATEWAY_URL = `http://127.0.0.1:${GATEWAY_PORT}/`;

let mainWindow: BrowserWindow | null = null;
let gatewayManager: GatewayManager | null = null;
let trayManager: TrayManager | null = null;
let settingsWindow: SettingsWindow | null = null;
let isQuitting = false;

function getResourcesPath(): string {
  if (app.isPackaged) {
    return process.resourcesPath;
  }
  // Dev fallback: look for resources/ sibling to dist-electron/
  return path.join(__dirname, "..", "resources");
}

function getIconPath(): string {
  return path.join(__dirname, "..", "assets", "icon.ico");
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "OpenClaw",
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    backgroundColor: "#1a1a2e",
  });

  // Open external links in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://127.0.0.1:") || url.startsWith("http://localhost:")) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.once("ready-to-show", () => {
    win.show();
  });

  // Hide to tray on close instead of quitting
  win.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      win.hide();
    }
  });

  return win;
}

async function loadGatewayUI(): Promise<void> {
  if (!mainWindow || !gatewayManager) return;

  mainWindow.loadURL("about:blank");

  try {
    await gatewayManager.waitForReady();
    if (mainWindow && !mainWindow.isDestroyed()) {
      const token = gatewayManager.getToken();
      const url = token
        ? `${GATEWAY_URL}?token=${encodeURIComponent(token)}`
        : GATEWAY_URL;
      mainWindow.loadURL(url);
    }
  } catch (err) {
    console.error("[main] Gateway did not become ready:", err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(
        `data:text/html,<html><body style="font-family:sans-serif;padding:2rem;background:#1a1a2e;color:#fff">` +
          `<h2>OpenClaw Gateway Error</h2>` +
          `<p>The gateway failed to start. Check application logs or use Restart Gateway from the system tray.</p>` +
          `</body></html>`,
      );
    }
  }
}

app.whenReady().then(async () => {
  const resourcesPath = getResourcesPath();

  gatewayManager = new GatewayManager(resourcesPath);
  settingsWindow = new SettingsWindow();
  const configManager = new ConfigManager();
  mainWindow = createWindow();

  registerIpcHandlers(gatewayManager, () => mainWindow, configManager);

  trayManager = new TrayManager(
    getIconPath(),
    gatewayManager,
    () => mainWindow,
    () => settingsWindow!,
  );
  trayManager.create();

  initAutoUpdater(() => mainWindow);

  gatewayManager.start();
  await loadGatewayUI();

  app.on("activate", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      mainWindow = createWindow();
      loadGatewayUI();
    } else {
      mainWindow.show();
    }
  });
});

app.on("before-quit", (event) => {
  if (isQuitting) return;
  isQuitting = true;
  event.preventDefault();

  settingsWindow?.close();
  trayManager?.destroy();

  const cleanup = gatewayManager ? gatewayManager.stop() : Promise.resolve();
  cleanup.finally(() => {
    app.exit(0);
  });
});

app.on("window-all-closed", () => {
  // Keep the app running in tray on Windows/Linux
  if (process.platform === "darwin") {
    app.quit();
  }
});
