import { app, dialog, BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";

export function initAutoUpdater(getWindow: () => BrowserWindow | null): void {
  // Auto-updater only works in packaged builds
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    console.log("[updater] Checking for update...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log(`[updater] Update available: ${info.version}`);
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[updater] App is up to date.");
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log(`[updater] Update downloaded: ${info.version}`);

    const win = getWindow();
    const dialogOptions: Electron.MessageBoxOptions = {
      type: "info",
      title: "Update Ready — OpenClaw",
      message: `OpenClaw ${info.version} has been downloaded and is ready to install.`,
      detail: "Restart now to apply the update, or it will install automatically next time you quit.",
      buttons: ["Restart Now", "Later"],
      defaultId: 0,
      cancelId: 1,
    };

    const showDialog = win && !win.isDestroyed()
      ? dialog.showMessageBox(win, dialogOptions)
      : dialog.showMessageBox(dialogOptions);

    showDialog.then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on("error", (err) => {
    console.error("[updater] Error:", err?.message ?? err);
  });

  // Delay the first check so it doesn't compete with gateway startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error("[updater] checkForUpdates failed:", err?.message ?? err);
    });
  }, 10_000);
}
