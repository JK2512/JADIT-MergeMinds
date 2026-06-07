const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setWindowOpacity: (opacity) => ipcRenderer.send('set-window-opacity', opacity)
});
