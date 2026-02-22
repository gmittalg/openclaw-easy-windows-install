import { Tray, Menu, nativeImage, BrowserWindow, app } from "electron";
import path from "path";
import type { GatewayManager } from "./gateway-manager";
import type { SettingsWindow } from "./settings-window";

export class TrayManager {
  private tray: Tray | null = null;

  constructor(
    private readonly iconPath: string,
    private readonly gatewayManager: GatewayManager,
    private readonly getWindow: () => BrowserWindow | null,
    private readonly getSettingsWindow: () => SettingsWindow,
  ) {}

  create(): void {
    const icon = nativeImage.createFromPath(this.iconPath);
    this.tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    this.tray.setToolTip("OpenClaw");
    this.updateMenu();

    this.tray.on("double-click", () => {
      this.showWindow();
    });

    this.gatewayManager.onStatusChange(() => {
      this.updateMenu();
    });
  }

  private updateMenu(): void {
    if (!this.tray) return;

    const status = this.gatewayManager.getStatus();
    const statusLabel = {
      stopped: "Gateway: Stopped",
      starting: "Gateway: Starting…",
      running: "Gateway: Running",
      error: "Gateway: Error",
    }[status];

    const menu = Menu.buildFromTemplate([
      {
        label: "Open OpenClaw",
        click: () => this.showWindow(),
      },
      { type: "separator" },
      {
        label: statusLabel,
        enabled: false,
      },
      {
        label: "Restart Gateway",
        click: () => {
          this.gatewayManager.restart().catch((err) => {
            console.error("[TrayManager] Gateway restart failed:", err);
          });
        },
      },
      {
        label: "Settings",
        click: () => {
          this.getSettingsWindow().open(this.getWindow());
        },
      },
      { type: "separator" },
      {
        label: "Quit OpenClaw",
        click: () => {
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(menu);
  }

  private showWindow(): void {
    const win = this.getWindow();
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }

  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}
