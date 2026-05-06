const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('popupAPI', {
  getData: () => ipcRenderer.invoke('floating-haiku:get-data'),
  save: () => ipcRenderer.invoke('floating-haiku:save'),
  copy: () => ipcRenderer.invoke('floating-haiku:copy'),
  close: () => ipcRenderer.send('floating-haiku:close'),
  onData: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('floating-haiku:data', listener);
    return () => ipcRenderer.removeListener('floating-haiku:data', listener);
  },
  onDismiss: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('floating-haiku:dismiss', listener);
    return () => ipcRenderer.removeListener('floating-haiku:dismiss', listener);
  }
});
