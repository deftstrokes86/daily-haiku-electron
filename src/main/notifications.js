const { Notification } = require('electron');

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
    meta: toText(payload.meta) || [haiku.mood, haiku.theme].filter(Boolean).join(' Â· '),
    notificationStyle: normalizeNotificationStyle(payload.notificationStyle)
  };
}

function createNotificationController({ appName, showMainWindow, showFloatingHaikuCard }) {
  function showNativeNotification(text) {
    if (!Notification.isSupported()) return;

    const notification = new Notification({
      title: appName,
      body: text,
      silent: false
    });

    notification.on('click', showMainWindow);
    notification.show();
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

  return {
    showHaikuNotification,
    showNativeNotification
  };
}

exports.createNotificationController = createNotificationController;
exports.normalizeHaikuNotificationPayload = normalizeHaikuNotificationPayload;
exports.normalizeNotificationStyle = normalizeNotificationStyle;
