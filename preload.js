const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  minimize: () => ipcRenderer.send('minimize-window'),
  close: () => ipcRenderer.send('close-window'),
  showNativeNotification: (text) => ipcRenderer.send('show-native-notification', text),
  updateInterval: (min) => ipcRenderer.send('update-interval', min),
  resetTimer: () => ipcRenderer.send('reset-timer'),
  toggleAutolaunch: (on) => ipcRenderer.send('toggle-autolaunch', on),
  getAutolaunch: () => ipcRenderer.invoke('get-autolaunch'),
  onTriggerPopup: (cb) => {
    const listener = () => cb();
    ipcRenderer.on('trigger-popup', listener);
    return () => ipcRenderer.removeListener('trigger-popup', listener);
  },
  onOpenSettings: (cb) => {
    const listener = () => cb();
    ipcRenderer.on('open-settings', listener);
    return () => ipcRenderer.removeListener('open-settings', listener);
  }
});
