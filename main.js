const { app, BrowserWindow, Tray, Menu, Notification, nativeImage, ipcMain, screen, powerMonitor, clipboard } = require('electron');
const fs = require('fs');
const path = require('path');
const { createActiveTimeScheduler } = require('./src/scheduler/activeTimeScheduler');
const {
  DEFAULT_TIME_WINDOW_SETTINGS,
  isWithinQuietHours,
  isWithinWorkHours,
  normalizeTimeWindowSettings
} = require('./src/scheduler/timeWindows');

const APP_NAME = 'Daily Haiku';
const APP_ID = 'com.dailyhaiku.app';
const WINDOW_WIDTH = 580;
const WINDOW_HEIGHT = 660;
const FLOATING_POPUP_WIDTH = 380;
const FLOATING_POPUP_HEIGHT = 252;
const FLOATING_POPUP_MARGIN = 24;
const FLOATING_POPUP_DURATION_MS = 10 * 1000;
const DEFAULT_INTERVAL_MINUTES = 60;
const SCHEDULER_TICK_MS = 5 * 1000;
const DEFAULT_IDLE_THRESHOLD_MS = 5 * 60 * 1000;

let mainWindow = null;
let tray = null;
let schedulerLoop = null;
let floatingPopupWindow = null;
let floatingPopupData = null;
let floatingPopupTimer = null;
let floatingPopupCloseTimer = null;
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
  const icoPath = path.join(__dirname, 'icon.ico');
  const diskIcon = nativeImage.createFromPath(icoPath);
  return diskIcon.isEmpty() ? createDefaultIcon() : diskIcon;
}

function loadHaikuData() {
  if (!haikuDataCache) {
    const dataPath = path.join(__dirname, 'src', 'data', 'haikus.json');
    haikuDataCache = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  }

  return haikuDataCache;
}

function normalizeNotificationStyle(style) {
  return ['native', 'floating', 'both'].includes(style) ? style : 'native';
}

function toText(value) {
  return typeof value === 'string' ? value : '';
}

function normalizeHaikuNotificationPayload(payload = {}) {
  const sourceHaiku = payload.haiku || {};
  const sourceLines = Array.isArray(payload.lines) ? payload.lines : sourceHaiku.lines;
  const lines = Array.isArray(sourceLines)
    ? sourceLines.map((line) => String(line || '').trim()).filter(Boolean).slice(0, 3)
    : [];

  const haiku = {
    id: toText(sourceHaiku.id || payload.id),
    lines,
    mood: toText(sourceHaiku.mood || payload.mood),
    theme: toText(sourceHaiku.theme || payload.theme),
    tags: Array.isArray(sourceHaiku.tags) ? sourceHaiku.tags.map(String) : []
  };

  return {
    haiku,
    lines,
    text: toText(payload.text) || lines.join('\n'),
    meta: toText(payload.meta) || [haiku.mood, haiku.theme].filter(Boolean).join(' · '),
    notificationStyle: normalizeNotificationStyle(payload.notificationStyle)
  };
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

function showNativeNotification(text) {
  if (!Notification.isSupported()) return;

  const notification = new Notification({
    title: APP_NAME,
    body: text,
    silent: false
  });

  notification.on('click', showMainWindow);
  notification.show();
}

function getFloatingPopupBounds() {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    x: Math.round(workArea.x + workArea.width - FLOATING_POPUP_WIDTH - FLOATING_POPUP_MARGIN),
    y: Math.round(workArea.y + workArea.height - FLOATING_POPUP_HEIGHT - FLOATING_POPUP_MARGIN),
    width: FLOATING_POPUP_WIDTH,
    height: FLOATING_POPUP_HEIGHT
  };
}

function positionFloatingPopup() {
  if (!floatingPopupWindow || floatingPopupWindow.isDestroyed()) return;

  const bounds = getFloatingPopupBounds();
  floatingPopupWindow.setBounds(bounds, false);
}

function clearFloatingPopupTimers() {
  if (floatingPopupTimer) {
    clearTimeout(floatingPopupTimer);
    floatingPopupTimer = null;
  }

  if (floatingPopupCloseTimer) {
    clearTimeout(floatingPopupCloseTimer);
    floatingPopupCloseTimer = null;
  }
}

function closeFloatingPopup({ animate = true } = {}) {
  if (!floatingPopupWindow || floatingPopupWindow.isDestroyed()) return;

  clearFloatingPopupTimers();

  if (animate) {
    floatingPopupWindow.webContents.send('floating-haiku:dismiss');
    floatingPopupCloseTimer = setTimeout(() => {
      if (floatingPopupWindow && !floatingPopupWindow.isDestroyed()) {
        floatingPopupWindow.close();
      }
    }, 220);
    return;
  }

  floatingPopupWindow.close();
}

function scheduleFloatingPopupDismiss() {
  if (floatingPopupTimer) clearTimeout(floatingPopupTimer);
  floatingPopupTimer = setTimeout(() => closeFloatingPopup(), FLOATING_POPUP_DURATION_MS);
}

function showFloatingPopupWindow() {
  if (!floatingPopupWindow || floatingPopupWindow.isDestroyed()) return;

  positionFloatingPopup();
  floatingPopupWindow.setAlwaysOnTop(true, 'floating');
  floatingPopupWindow.showInactive();
  scheduleFloatingPopupDismiss();
}

function createFloatingPopupWindow() {
  const bounds = getFloatingPopupBounds();

  floatingPopupWindow = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    focusable: false,
    alwaysOnTop: true,
    hasShadow: true,
    acceptFirstMouse: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'popupPreload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  floatingPopupWindow.setVisibleOnAllWorkspaces(false);
  floatingPopupWindow.loadFile(path.join(__dirname, 'popup.html'));

  floatingPopupWindow.once('ready-to-show', () => {
    floatingPopupWindow.webContents.send('floating-haiku:data', floatingPopupData);
    showFloatingPopupWindow();
  });

  floatingPopupWindow.on('closed', () => {
    clearFloatingPopupTimers();
    floatingPopupWindow = null;
    floatingPopupData = null;
  });
}

function showFloatingHaikuCard(payload, now = Date.now()) {
  const scheduleState = getScheduleState(new Date(now));
  if (scheduleState.isInQuietHours) return;

  const data = normalizeHaikuNotificationPayload(payload);
  if (!data.lines.length) return;

  floatingPopupData = data;

  if (floatingPopupWindow && !floatingPopupWindow.isDestroyed()) {
    floatingPopupWindow.webContents.send('floating-haiku:data', floatingPopupData);
    showFloatingPopupWindow();
    return;
  }

  createFloatingPopupWindow();
}

function showHaikuNotification(payload) {
  const data = normalizeHaikuNotificationPayload(payload);
  if (!data.lines.length) return;

  if (data.notificationStyle === 'native' || data.notificationStyle === 'both') {
    showNativeNotification(data.text.replace(/\n/g, ' / '));
  }

  if (data.notificationStyle === 'floating' || data.notificationStyle === 'both') {
    showFloatingHaikuCard(data);
  }
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
  broadcastSchedulerSnapshot(now);
  return getSchedulerSnapshot(now);
}

function updateTimeWindowSettings(settings, now = Date.now()) {
  timeWindowSettings = normalizeTimeWindowSettings(settings);
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
  if (tray) return;

  tray = new Tray(getAppIcon().resize({ width: 16, height: 16 }));
  tray.setToolTip(APP_NAME);

  const menu = Menu.buildFromTemplate([
    { label: 'Show Haiku', click: showMainWindow },
    { label: 'Next Haiku Now', click: () => triggerHaikuNow() },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        showMainWindow();
        sendToRenderer('open-settings');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(menu);
  tray.on('click', () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
      return;
    }

    showMainWindow();
  });
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
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    x: Math.round((sw - WINDOW_WIDTH) / 2),
    y: Math.round((sh - WINDOW_HEIGHT) / 2 - 20)
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
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
  showNativeNotification(String(text || ''));
});

ipcMain.on('haiku:notify', (_event, payload) => {
  showHaikuNotification(payload);
});

ipcMain.handle('floating-haiku:get-data', () => {
  return floatingPopupData;
});

ipcMain.handle('floating-haiku:save', () => {
  if (!floatingPopupData || !floatingPopupData.haiku) {
    return { ok: false };
  }

  return { ok: sendToRendererWithPayload('floating-haiku:save', floatingPopupData.haiku) };
});

ipcMain.handle('floating-haiku:copy', () => {
  if (!floatingPopupData || !floatingPopupData.text) {
    return { ok: false };
  }

  clipboard.writeText(floatingPopupData.text);
  return { ok: true };
});

ipcMain.on('floating-haiku:close', () => {
  closeFloatingPopup();
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
  closeFloatingPopup({ animate: false });
});
