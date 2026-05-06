const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('minimize-window'),
  close: () => ipcRenderer.send('close-window'),
  showNativeNotification: (text) => ipcRenderer.send('show-native-notification', text),
  updateInterval: (min) => ipcRenderer.send('update-interval', min),
  toggleAutolaunch: (on) => ipcRenderer.send('toggle-autolaunch', on),
  getAutolaunch: () => ipcRenderer.invoke('get-autolaunch'),
  onTriggerPopup: (cb) => ipcRenderer.on('trigger-popup', (_e) => cb()),
  onOpenSettings: (cb) => ipcRenderer.on('open-settings', (_e) => cb())
});