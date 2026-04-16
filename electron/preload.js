const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
    getStatus: () => ipcRenderer.invoke('updater:get-status'),
    getSettings: () => ipcRenderer.invoke('updater:get-settings'),
    setAutoUpdateEnabled: (enabled) =>
      ipcRenderer.invoke('updater:set-auto-update-enabled', enabled),
    onStatus: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('updater:status', listener);
      return () => ipcRenderer.removeListener('updater:status', listener);
    },
  },
});
