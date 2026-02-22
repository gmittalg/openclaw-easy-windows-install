import { BrowserWindow } from "electron";
import path from "path";

export class SettingsWindow {
  private win: BrowserWindow | null = null;

  open(parentWindow: BrowserWindow | null): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.focus();
      return;
    }

    this.win = new BrowserWindow({
      width: 620,
      height: 680,
      resizable: false,
      title: "OpenClaw Settings",
      parent: parentWindow ?? undefined,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
      backgroundColor: "#1a1a2e",
      autoHideMenuBar: true,
    });

    this.win.loadFile(path.join(__dirname, "..", "assets", "settings.html"));

    this.win.on("closed", () => {
      this.win = null;
    });
  }

  close(): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.close();
    }
    this.win = null;
  }
}
