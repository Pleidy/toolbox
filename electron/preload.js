const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
    getStatus: () => ipcRenderer.invoke('updater:get-status'),
    onStatus: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('updater:status', listener);
      return () => ipcRenderer.removeListener('updater:status', listener);
    },
  },
});
