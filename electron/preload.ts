import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("openclaw", {
  getGatewayStatus: (): Promise<string> =>
    ipcRenderer.invoke("gateway:status"),

  restartGateway: (): Promise<void> =>
    ipcRenderer.invoke("gateway:restart"),

  getAppVersion: (): Promise<string> =>
    ipcRenderer.invoke("app:version"),

  onGatewayStatusChange: (callback: (status: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: string): void => {
      callback(status);
    };
    ipcRenderer.on("gateway:status-changed", listener);
    return () => {
      ipcRenderer.removeListener("gateway:status-changed", listener);
    };
  },

  readConfig: (): Promise<unknown> =>
    ipcRenderer.invoke("config:read"),

  writeConfig: (config: unknown): Promise<void> =>
    ipcRenderer.invoke("config:write", config),

  openItem: (itemPath: string): Promise<string> =>
    ipcRenderer.invoke("shell:openItem", itemPath),
});
