const { app, BrowserWindow, Tray, Menu, Notification, nativeImage, ipcMain, screen } = require('electron');
const path = require('path');

const APP_NAME = 'Daily Haiku';
const APP_ID = 'com.dailyhaiku.app';
const WINDOW_WIDTH = 580;
const WINDOW_HEIGHT = 660;

let mainWindow = null;
let tray = null;
let haikuTimer = null;
let currentInterval = 60;

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

function sendToRenderer(channel) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel);
  }
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
    { label: 'Next Haiku Now', click: () => sendToRenderer('trigger-popup') },
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

function startTimer(minutes = currentInterval) {
  const nextInterval = Number(minutes);
  if (!Number.isFinite(nextInterval) || nextInterval <= 0) return;

  currentInterval = nextInterval;
  if (haikuTimer) clearInterval(haikuTimer);

  haikuTimer = setInterval(() => {
    sendToRenderer('trigger-popup');
  }, currentInterval * 60 * 1000);
}

ipcMain.on('minimize-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.on('close-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
});

ipcMain.on('show-native-notification', (_event, text) => {
  if (!Notification.isSupported()) return;

  const notification = new Notification({
    title: APP_NAME,
    body: text,
    silent: false
  });

  notification.on('click', showMainWindow);
  notification.show();
});

ipcMain.on('update-interval', (_event, minutes) => startTimer(minutes));
ipcMain.on('reset-timer', () => startTimer());

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

app.whenReady().then(() => {
  createWindow();
  createTray();
  startTimer(60);
});

app.on('activate', () => {
  showMainWindow();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (haikuTimer) clearInterval(haikuTimer);
});
