import { ipcMain, app, BrowserWindow, shell } from "electron";
import path from "path";
import os from "os";
import type { GatewayManager } from "./gateway-manager";
import type { ConfigManager } from "./config-manager";

export function registerIpcHandlers(
  gatewayManager: GatewayManager,
  getWindow: () => BrowserWindow | null,
  configManager: ConfigManager,
): void {
  ipcMain.handle("gateway:status", () => {
    return gatewayManager.getStatus();
  });

  ipcMain.handle("gateway:restart", async () => {
    await gatewayManager.restart();
  });

  ipcMain.handle("app:version", () => {
    return app.getVersion();
  });

  ipcMain.handle("config:read", () => {
    return configManager.readConfig();
  });

  ipcMain.handle("config:write", (_event, config: unknown) => {
    configManager.writeConfig(config as Parameters<ConfigManager["writeConfig"]>[0]);
  });

  ipcMain.handle("shell:openItem", (_event, itemPath: string) => {
    // Resolve %APPDATA% if present (renderer cannot do this directly)
    const resolved = itemPath.replace(
      /%APPDATA%/gi,
      process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"),
    );
    return shell.openPath(resolved);
  });

  ipcMain.handle("gateway:get-logs", () => {
    return gatewayManager.getLogs();
  });

  // Forward gateway status changes to renderer
  gatewayManager.onStatusChange((status) => {
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("gateway:status-changed", status);
    }
  });

  // Forward gateway log lines to renderer
  gatewayManager.onLog((entry) => {
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send("gateway:log", entry);
    }
  });
}
