const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  minimize: () => ipcRenderer.send('minimize-window'),
  close: () => ipcRenderer.send('close-window'),
  showNativeNotification: (text) => ipcRenderer.send('show-native-notification', text),
  showHaikuNotification: (payload) => ipcRenderer.send('haiku:notify', payload),
  updateInterval: (min) => ipcRenderer.send('update-interval', min),
  resetTimer: () => ipcRenderer.send('reset-timer'),
  getSchedulerSnapshot: () => ipcRenderer.invoke('scheduler:get-snapshot'),
  updateSchedulerInterval: (intervalMs) => ipcRenderer.invoke('scheduler:update-interval', intervalMs),
  resetScheduler: () => ipcRenderer.invoke('scheduler:reset'),
  setSchedulerIdleThreshold: (thresholdMs) => ipcRenderer.invoke('scheduler:set-idle-threshold', thresholdMs),
  getScheduleSettings: () => ipcRenderer.invoke('schedule:get-settings'),
  updateScheduleSettings: (settings) => ipcRenderer.invoke('schedule:update-settings', settings),
  toggleAutolaunch: (on) => ipcRenderer.send('toggle-autolaunch', on),
  getAutolaunch: () => ipcRenderer.invoke('get-autolaunch'),
  getHaikus: () => ipcRenderer.invoke('haikus:get-all'),
  onTriggerPopup: (cb) => {
    const listener = () => cb();
    ipcRenderer.on('trigger-popup', listener);
    return () => ipcRenderer.removeListener('trigger-popup', listener);
  },
  onOpenSettings: (cb) => {
    const listener = () => cb();
    ipcRenderer.on('open-settings', listener);
    return () => ipcRenderer.removeListener('open-settings', listener);
  },
  onSchedulerSnapshot: (cb) => {
    const listener = (_event, snapshot) => cb(snapshot);
    ipcRenderer.on('scheduler:snapshot', listener);
    return () => ipcRenderer.removeListener('scheduler:snapshot', listener);
  },
  onFloatingHaikuSave: (cb) => {
    const listener = (_event, haiku) => cb(haiku);
    ipcRenderer.on('floating-haiku:save', listener);
    return () => ipcRenderer.removeListener('floating-haiku:save', listener);
  }
});
