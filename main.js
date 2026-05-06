const { app, BrowserWindow, Tray, Menu, Notification, nativeImage, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let haikuTimer = null;
let currentInterval = 60;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

/* ── Tray icon: generated in memory, no external file needed ── */
function createDefaultIcon() {
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const cx = x - 7.5, cy = y - 7.5;
      const d = Math.sqrt(cx * cx + cy * cy);
      if (d < 6.5) {
        buf[i] = 212; buf[i + 1] = 160; buf[i + 2] = 74; buf[i + 3] = 255;
      } else if (d < 8) {
        const a = Math.max(0, 1 - (d - 6.5) / 1.5);
        buf[i] = 212; buf[i + 1] = 160; buf[i + 2] = 74; buf[i + 3] = Math.round(a * 255);
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

function createTray() {
  const icoPath = path.join(__dirname, 'icon.ico');
  let icon = nativeImage.createFromPath(icoPath);
  if (icon.isEmpty()) icon = createDefaultIcon();
  const trayIcon = icon.resize({ width: 16, height: 16 });

  tray = new Tray(trayIcon);
  tray.setToolTip('Daily Haiku');

  const menu = Menu.buildFromTemplate([
    { label: 'Show Haiku', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { label: 'Next Haiku Now', click: () => { mainWindow.webContents.send('trigger-popup'); } },
    { type: 'separator' },
    { label: 'Settings', click: () => { mainWindow.show(); mainWindow.focus(); mainWindow.webContents.send('open-settings'); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(menu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) mainWindow.hide();
    else { mainWindow.show(); mainWindow.focus(); }
  });
}

function createWindow() {
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: 580,
    height: 660,
    minWidth: 460,
    minHeight: 520,
    frame: false,
    backgroundColor: '#1a1714',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    x: Math.round((sw - 580) / 2),
    y: Math.round((sh - 660) / 2 - 20)
  });

  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Close hides to tray; only Quit exits
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) { e.preventDefault(); mainWindow.hide(); }
  });
}

function startTimer(minutes) {
  currentInterval = minutes;
  if (haikuTimer) clearInterval(haikuTimer);
  haikuTimer = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('trigger-popup');
    }
  }, minutes * 60 * 1000);
}

// ── IPC handlers ──
ipcMain.on('minimize-window', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('close-window', () => { if (mainWindow) mainWindow.hide(); });

ipcMain.on('show-native-notification', (_e, text) => {
  if (Notification.isSupported()) {
    const n = new Notification({ title: 'Daily Haiku', body: text, silent: false });
    n.on('click', () => { mainWindow.show(); mainWindow.focus(); });
    n.show();
  }
});

ipcMain.on('update-interval', (_e, minutes) => startTimer(minutes));

ipcMain.on('toggle-autolaunch', (_e, enabled) => {
  app.setLoginItemSettings({ openAtLogin: enabled, path: app.getPath('exe') });
});

ipcMain.handle('get-autolaunch', () => {
  return app.getLoginItemSettings().openAtLogin;
});

app.whenReady().then(() => {
  createWindow();
  createTray();
  startTimer(60);
  app.setLoginItemSettings({ openAtLogin: true, path: app.getPath('exe') });
});

app.on('before-quit', () => { if (haikuTimer) clearInterval(haikuTimer); });