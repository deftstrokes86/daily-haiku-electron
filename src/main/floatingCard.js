const path = require('path');
const { BrowserWindow, clipboard, screen } = require('electron');

const DEFAULT_WIDTH = 380;
const DEFAULT_HEIGHT = 252;
const DEFAULT_MARGIN = 24;
const DEFAULT_DURATION_MS = 10 * 1000;

function createFloatingCardController({
  htmlPath,
  preloadPath,
  getScheduleState,
  sendToRendererWithPayload,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  margin = DEFAULT_MARGIN,
  durationMs = DEFAULT_DURATION_MS
}) {
  let windowRef = null;
  let popupData = null;
  let dismissTimer = null;
  let closeTimer = null;

  function getBounds() {
    const { workArea } = screen.getPrimaryDisplay();
    return {
      x: Math.round(workArea.x + workArea.width - width - margin),
      y: Math.round(workArea.y + workArea.height - height - margin),
      width,
      height
    };
  }

  function position() {
    if (!windowRef || windowRef.isDestroyed()) return;
    windowRef.setBounds(getBounds(), false);
  }

  function clearTimers() {
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }

    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  }

  function close({ animate = true } = {}) {
    if (!windowRef || windowRef.isDestroyed()) return;

    clearTimers();

    if (animate) {
      windowRef.webContents.send('floating-haiku:dismiss');
      closeTimer = setTimeout(() => {
        if (windowRef && !windowRef.isDestroyed()) {
          windowRef.close();
        }
      }, 220);
      return;
    }

    windowRef.close();
  }

  function scheduleDismiss() {
    if (dismissTimer) clearTimeout(dismissTimer);
    dismissTimer = setTimeout(() => close(), durationMs);
  }

  function showInactive() {
    if (!windowRef || windowRef.isDestroyed()) return;

    position();
    windowRef.setAlwaysOnTop(true, 'floating');
    windowRef.showInactive();
    scheduleDismiss();
  }

  function createWindow() {
    windowRef = new BrowserWindow({
      ...getBounds(),
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
        preload: path.resolve(preloadPath),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    windowRef.setVisibleOnAllWorkspaces(false);
    windowRef.loadFile(path.resolve(htmlPath));

    windowRef.once('ready-to-show', () => {
      windowRef.webContents.send('floating-haiku:data', popupData);
      showInactive();
    });

    windowRef.on('closed', () => {
      clearTimers();
      windowRef = null;
      popupData = null;
    });
  }

  function show(data, now = Date.now()) {
    const scheduleState = getScheduleState(new Date(now));
    if (scheduleState.isInQuietHours) return;
    if (!data || !Array.isArray(data.lines) || !data.lines.length) return;

    popupData = data;

    if (windowRef && !windowRef.isDestroyed()) {
      windowRef.webContents.send('floating-haiku:data', popupData);
      showInactive();
      return;
    }

    createWindow();
  }

  function save() {
    if (!popupData || !popupData.haiku) {
      return { ok: false };
    }

    return { ok: sendToRendererWithPayload('floating-haiku:save', popupData.haiku) };
  }

  function copy() {
    if (!popupData || !popupData.text) {
      return { ok: false };
    }

    clipboard.writeText(popupData.text);
    return { ok: true };
  }

  return {
    close,
    copy,
    getData: () => popupData,
    position,
    save,
    show
  };
}

exports.createFloatingCardController = createFloatingCardController;
