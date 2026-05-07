const { app, BrowserWindow, nativeImage, ipcMain, screen, powerMonitor, clipboard, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { createActiveTimeScheduler } = require('../scheduler/activeTimeScheduler');
const {
  DEFAULT_TIME_WINDOW_SETTINGS,
  isWithinQuietHours,
  isWithinWorkHours,
  normalizeTimeWindowSettings
} = require('../scheduler/scheduleRules');
const {
  createJsonStore,
  migrateLocalStoragePayload
} = require('./store');
const { createFloatingCardController } = require('./floatingCard');
const { createNotificationController } = require('./notifications');
const { createTrayController } = require('./tray');

const APP_NAME = 'Daily Haiku';
const APP_ID = 'com.dailyhaiku.app';
const WINDOW_WIDTH = 580;
const WINDOW_HEIGHT = 660;
const MAX_SHARE_IMAGE_BYTES = 18 * 1024 * 1024;
const DEFAULT_INTERVAL_MINUTES = 60;
const SCHEDULER_TICK_MS = 5 * 1000;
const DEFAULT_IDLE_THRESHOLD_MS = 5 * 60 * 1000;
const STORE_FILE_NAME = 'daily-haiku-store.json';

let mainWindow = null;
let appStore = null;
let trayController = null;
let floatingCardController = null;
let notificationController = null;
let schedulerLoop = null;
let currentIntervalMinutes = DEFAULT_INTERVAL_MINUTES;
let idleThresholdMs = DEFAULT_IDLE_THRESHOLD_MS;
let scheduler = createActiveTimeScheduler({
  intervalMs: minutesToMilliseconds(DEFAULT_INTERVAL_MINUTES)
});
let trackedEnvironmentState = {
  isSuspended: false,
  isLocked: false
};
let timeWindowSettings = normalizeTimeWindowSettings(DEFAULT_TIME_WINDOW_SETTINGS);
let haikuDataCache = null;

app.setName(APP_NAME);
if (process.platform === 'win32') {
  app.setAppUserModelId(APP_ID);
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });
}

function createDefaultIcon() {
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const cx = x - 7.5;
      const cy = y - 7.5;
      const d = Math.sqrt(cx * cx + cy * cy);

      if (d < 6.5) {
        buf[i] = 212;
        buf[i + 1] = 160;
        buf[i + 2] = 74;
        buf[i + 3] = 255;
      } else if (d < 8) {
        const a = Math.max(0, 1 - (d - 6.5) / 1.5);
        buf[i] = 212;
        buf[i + 1] = 160;
        buf[i + 2] = 74;
        buf[i + 3] = Math.round(a * 255);
      }
    }
  }

  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

function getAppIcon() {
  const candidates = [
    path.join(__dirname, '..', '..', 'build', 'icon.ico'),
    path.join(__dirname, '..', '..', 'icon.ico')
  ];
  const diskIcon = candidates
    .map((candidate) => nativeImage.createFromPath(candidate))
    .find((icon) => !icon.isEmpty());

  return diskIcon || createDefaultIcon();
}

function loadHaikuData() {
  if (!haikuDataCache) {
    const dataPath = path.join(__dirname, '..', 'data', 'haikus.json');
    haikuDataCache = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }

  return haikuDataCache;
}

function getAppStore() {
  if (!appStore) {
    appStore = createJsonStore({
      filePath: path.join(app.getPath('userData'), STORE_FILE_NAME)
    });
  }

  return appStore;
}

function sanitizeFileName(value) {
  const safe = String(value || 'Daily Haiku Share Card')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

  return safe || 'Daily Haiku Share Card';
}

function pngBufferFromDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) {
    throw new Error('Expected a PNG data URL');
  }

  const buffer = Buffer.from(dataUrl.slice('data:image/png;base64,'.length), 'base64');

  if (buffer.length === 0 || buffer.length > MAX_SHARE_IMAGE_BYTES) {
    throw new Error('PNG export is empty or too large');
  }

  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error('Invalid PNG data');
  }

  return buffer;
}

function sendToRenderer(channel) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel);
    return true;
  }

  return false;
}

function sendToRendererWithPayload(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
    return true;
  }

  return false;
}

function minutesToMilliseconds(minutes) {
  return Number(minutes) * 60 * 1000;
}

function normalizePositiveMilliseconds(value, label) {
  const milliseconds = Number(value);

  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    throw new RangeError(`${label} must be a positive number of milliseconds`);
  }

  return milliseconds;
}

function normalizeIntervalMinutes(value) {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_INTERVAL_MINUTES;
}

function normalizeIdleThresholdMs(value) {
  const milliseconds = Number(value);
  return Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds : DEFAULT_IDLE_THRESHOLD_MS;
}

function persistStorePatch(patch) {
  try {
    getAppStore().update(patch);
  } catch (_error) {
    return false;
  }

  return true;
}

function hydrateMainStateFromStore() {
  const store = getAppStore().getAll();

  currentIntervalMinutes = normalizeIntervalMinutes(store.settings && store.settings.interval);
  idleThresholdMs = normalizeIdleThresholdMs(store.scheduler && store.scheduler.idleThresholdMs);
  timeWindowSettings = normalizeTimeWindowSettings(
    store.settings && store.settings.timeWindowSettings
  );
  scheduler = createActiveTimeScheduler({
    intervalMs: minutesToMilliseconds(currentIntervalMinutes)
  });
}

function getSystemIdleState() {
  const idleThresholdSeconds = Math.max(1, Math.ceil(idleThresholdMs / 1000));

  try {
    return powerMonitor.getSystemIdleState(idleThresholdSeconds);
  } catch (_error) {
    return 'unknown';
  }
}

function getSystemIdleTimeMs() {
  try {
    return powerMonitor.getSystemIdleTime() * 1000;
  } catch (_error) {
    return 0;
  }
}

function getScheduleState(date = new Date()) {
  const isInQuietHours = isWithinQuietHours(date, timeWindowSettings);
  const isInsideWorkHours = isWithinWorkHours(date, timeWindowSettings);

  return {
    isInQuietHours,
    isOutsideWorkHours: timeWindowSettings.workHoursOnly && !isInsideWorkHours
  };
}

function getFloatingCardController() {
  if (!floatingCardController) {
    floatingCardController = createFloatingCardController({
      htmlPath: path.join(__dirname, '..', 'renderer', 'floating-card.html'),
      preloadPath: path.join(__dirname, '..', 'preload', 'floatingCardPreload.js'),
      getScheduleState,
      sendToRendererWithPayload
    });
  }

  return floatingCardController;
}

function getNotificationController() {
  if (!notificationController) {
    notificationController = createNotificationController({
      appName: APP_NAME,
      showMainWindow,
      showFloatingHaikuCard: (data) => getFloatingCardController().show(data)
    });
  }

  return notificationController;
}

// Timing lives in the main process because only Electron's main side can
// reliably observe screen lock, system idle, and suspend/resume state. The
// renderer can draw a countdown, but it should not decide when haikus fire.
function getEnvironmentState(now = Date.now()) {
  const idleState = getSystemIdleState();
  const idleTimeMs = getSystemIdleTimeMs();
  const isLocked = trackedEnvironmentState.isLocked || idleState === 'locked';
  const scheduleState = getScheduleState(new Date(now));

  return {
    isLocked,
    isIdle: !isLocked && (idleState === 'idle' || idleTimeMs >= idleThresholdMs),
    isSuspended: trackedEnvironmentState.isSuspended,
    isInQuietHours: scheduleState.isInQuietHours,
    isOutsideWorkHours: scheduleState.isOutsideWorkHours
  };
}

function getSchedulerSnapshot(now = Date.now()) {
  return {
    ...scheduler.getSnapshot(now),
    ...getScheduleState(new Date(now)),
    timeWindowSettings,
    currentIntervalMinutes,
    idleThresholdMs,
    tickMs: SCHEDULER_TICK_MS
  };
}

function broadcastSchedulerSnapshot(now = Date.now()) {
  sendToRendererWithPayload('scheduler:snapshot', getSchedulerSnapshot(now));
}

function runSchedulerTick(now = Date.now()) {
  const event = scheduler.tick(now, getEnvironmentState(now));

  if (event && event.type === 'TRIGGER_HAIKU') {
    sendToRenderer('trigger-popup');
  }

  broadcastSchedulerSnapshot(now);
  return event;
}

function resetScheduler(now = Date.now()) {
  const snapshot = scheduler.reset(now);
  broadcastSchedulerSnapshot(now);
  return {
    ...snapshot,
    currentIntervalMinutes,
    idleThresholdMs,
    tickMs: SCHEDULER_TICK_MS
  };
}

function updateSchedulerIntervalMs(intervalMs, now = Date.now()) {
  const nextIntervalMs = normalizePositiveMilliseconds(intervalMs, 'intervalMs');
  currentIntervalMinutes = nextIntervalMs / 60 / 1000;
  const snapshot = scheduler.updateInterval(nextIntervalMs, now);
  persistStorePatch({ settings: { interval: currentIntervalMinutes } });
  broadcastSchedulerSnapshot(now);
  return {
    ...snapshot,
    currentIntervalMinutes,
    idleThresholdMs,
    tickMs: SCHEDULER_TICK_MS
  };
}

function updateSchedulerIntervalMinutes(minutes, now = Date.now()) {
  const nextMinutes = Number(minutes);

  if (!Number.isFinite(nextMinutes) || nextMinutes <= 0) {
    return getSchedulerSnapshot(now);
  }

  return updateSchedulerIntervalMs(minutesToMilliseconds(nextMinutes), now);
}

function setIdleThresholdMs(thresholdMs, now = Date.now()) {
  idleThresholdMs = normalizePositiveMilliseconds(thresholdMs, 'idleThresholdMs');
  persistStorePatch({ scheduler: { idleThresholdMs } });
  broadcastSchedulerSnapshot(now);
  return getSchedulerSnapshot(now);
}

function updateTimeWindowSettings(settings, now = Date.now()) {
  timeWindowSettings = normalizeTimeWindowSettings(settings);
  persistStorePatch({ settings: { timeWindowSettings } });
  scheduler.tick(now, getEnvironmentState(now));
  broadcastSchedulerSnapshot(now);
  return getSchedulerSnapshot(now);
}

function triggerHaikuNow(now = Date.now()) {
  resetScheduler(now);
  sendToRenderer('trigger-popup');
  broadcastSchedulerSnapshot(now);
}

function startSchedulerLoop(now = Date.now()) {
  if (schedulerLoop) clearInterval(schedulerLoop);

  scheduler.start(now);
  broadcastSchedulerSnapshot(now);
  schedulerLoop = setInterval(() => {
    runSchedulerTick(Date.now());
  }, SCHEDULER_TICK_MS);
}

function stopSchedulerLoop() {
  if (schedulerLoop) {
    clearInterval(schedulerLoop);
    schedulerLoop = null;
  }
}

function markSchedulerInactive(now, key, reason) {
  runSchedulerTick(now);
  trackedEnvironmentState[key] = true;
  scheduler.pause(now, reason);
  scheduler.tick(now, getEnvironmentState(now));
  broadcastSchedulerSnapshot(now);
}

function markSchedulerActive(now, key, reason) {
  trackedEnvironmentState[key] = false;
  scheduler.resume(now, reason);
  scheduler.tick(now, getEnvironmentState(now));
  broadcastSchedulerSnapshot(now);
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  if (!trayController) {
    trayController = createTrayController({
      getAppIcon,
      getMainWindow: () => mainWindow,
      showMainWindow,
      triggerHaikuNow,
      sendToRenderer
    });
  }

  return trayController.create();
}

function createWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: 460,
    minHeight: 520,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#1a1714',
    show: false,
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    x: Math.round((sw - WINDOW_WIDTH) / 2),
    y: Math.round((sh - WINDOW_HEIGHT) / 2 - 20)
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.on('minimize-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.on('close-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
});

ipcMain.on('show-native-notification', (_event, text) => {
  getNotificationController().showNativeNotification(String(text || ''));
});

ipcMain.on('haiku:notify', (_event, payload) => {
  getNotificationController().showHaikuNotification(payload);
});

ipcMain.handle('floating-haiku:get-data', () => {
  return getFloatingCardController().getData();
});

ipcMain.handle('floating-haiku:save', () => {
  return getFloatingCardController().save();
});

ipcMain.handle('floating-haiku:copy', () => {
  return getFloatingCardController().copy();
});

ipcMain.on('floating-haiku:close', () => {
  getFloatingCardController().close();
});

ipcMain.handle('share-card:save-png', async (_event, payload = {}) => {
  try {
    const buffer = pngBufferFromDataUrl(payload.dataUrl);
    const fileName = `${sanitizeFileName(payload.suggestedName)}.png`;
    const ownerWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
    const result = await dialog.showSaveDialog(ownerWindow, {
      title: 'Save Haiku Share Card',
      defaultPath: path.join(app.getPath('pictures'), fileName),
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
      properties: ['createDirectory']
    });

    if (result.canceled || !result.filePath) {
      return { ok: false, canceled: true };
    }

    fs.writeFileSync(result.filePath, buffer);
    return { ok: true, filePath: result.filePath };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('share-card:copy-png', (_event, payload = {}) => {
  try {
    const buffer = pngBufferFromDataUrl(payload.dataUrl);
    const image = nativeImage.createFromBuffer(buffer);

    if (image.isEmpty()) {
      return { ok: false, error: 'Could not create clipboard image' };
    }

    clipboard.writeImage(image);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('store:get', (_event, section) => {
  return getAppStore().get(section);
});

ipcMain.handle('store:set', (_event, section, value) => {
  return getAppStore().set(section, value);
});

ipcMain.handle('store:update', (_event, patch = {}) => {
  if (patch && patch.__migrateLocalStorage) {
    const store = getAppStore();
    const migrated = migrateLocalStoragePayload(patch.__migrateLocalStorage, store.getAll());
    const nextStore = store.replaceAll(migrated);
    hydrateMainStateFromStore();
    broadcastSchedulerSnapshot();
    return nextStore;
  }

  return getAppStore().update(patch);
});

ipcMain.handle('store:reset-section', (_event, section) => {
  return getAppStore().resetSection(section);
});

ipcMain.on('update-interval', (_event, minutes) => {
  updateSchedulerIntervalMinutes(minutes);
});

ipcMain.on('reset-timer', () => {
  resetScheduler();
});

ipcMain.handle('scheduler:get-snapshot', () => {
  return getSchedulerSnapshot();
});

ipcMain.handle('scheduler:update-interval', (_event, intervalMs) => {
  return updateSchedulerIntervalMs(intervalMs);
});

ipcMain.handle('scheduler:reset', () => {
  return resetScheduler();
});

ipcMain.handle('scheduler:set-idle-threshold', (_event, thresholdMs) => {
  return setIdleThresholdMs(thresholdMs);
});

ipcMain.handle('schedule:get-settings', () => {
  return timeWindowSettings;
});

ipcMain.handle('schedule:update-settings', (_event, settings) => {
  return updateTimeWindowSettings(settings);
});

ipcMain.on('toggle-autolaunch', (_event, enabled) => {
  const openAtLogin = Boolean(enabled);
  const settings = process.platform === 'win32'
    ? { openAtLogin, path: app.getPath('exe') }
    : { openAtLogin };

  app.setLoginItemSettings(settings);
});

ipcMain.handle('get-autolaunch', () => {
  return app.getLoginItemSettings().openAtLogin;
});

ipcMain.handle('haikus:get-all', () => {
  return loadHaikuData();
});

app.whenReady().then(() => {
  hydrateMainStateFromStore();
  createWindow();
  createTray();
  startSchedulerLoop();

  powerMonitor.on('suspend', () => {
    markSchedulerInactive(Date.now(), 'isSuspended', 'system-suspend');
  });

  powerMonitor.on('resume', () => {
    markSchedulerActive(Date.now(), 'isSuspended', 'system-resume');
  });

  powerMonitor.on('lock-screen', () => {
    markSchedulerInactive(Date.now(), 'isLocked', 'screen-locked');
  });

  powerMonitor.on('unlock-screen', () => {
    markSchedulerActive(Date.now(), 'isLocked', 'screen-unlocked');
  });
});

app.on('activate', () => {
  showMainWindow();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopSchedulerLoop();
  if (floatingCardController) {
    floatingCardController.close({ animate: false });
  }
});
