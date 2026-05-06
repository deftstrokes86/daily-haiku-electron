const fs = require('fs');
const path = require('path');

const DEFAULT_TIME_WINDOW_SETTINGS = {
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  workHoursOnly: false,
  workdayStart: '09:00',
  workdayEnd: '17:00',
  workdays: [1, 2, 3, 4, 5]
};

const DEFAULT_ARCHIVE_VIEW = {
  scope: 'today',
  search: '',
  mood: '',
  theme: ''
};

const DEFAULT_STORE = {
  settings: {
    interval: 60,
    popup: true,
    notificationStyle: 'native',
    sound: true,
    themeKey: 'midnight',
    onboardingComplete: false,
    archiveView: DEFAULT_ARCHIVE_VIEW,
    timeWindowSettings: DEFAULT_TIME_WINDOW_SETTINGS
  },
  favorites: [],
  archive: {
    history: [],
    archiveEntries: [],
    archiveMigrated: false
  },
  queue: {
    shownHaikuIds: []
  },
  scheduler: {
    idleThresholdMs: 5 * 60 * 1000
  },
  migration: {
    localStorageCompleted: false,
    completedAt: null
  }
};

const VALID_SECTIONS = new Set(Object.keys(DEFAULT_STORE));
const VALID_NOTIFICATION_STYLES = new Set(['native', 'floating', 'both']);
const VALID_THEME_KEYS = new Set(['midnight', 'morning', 'autumn', 'forest', 'winter']);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepMerge(base, patch) {
  if (patch === undefined) return clone(base);
  if (Array.isArray(patch)) return clone(patch);
  if (!isPlainObject(patch)) return patch;

  const output = isPlainObject(base) ? clone(base) : {};

  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined) return;

    output[key] = isPlainObject(value) && isPlainObject(output[key])
      ? deepMerge(output[key], value)
      : clone(value);
  });

  return output;
}

function normalizePositiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizeStringArray(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
}

function normalizeTimeWindowSettings(settings = {}) {
  const source = isPlainObject(settings) ? settings : {};

  return {
    ...DEFAULT_TIME_WINDOW_SETTINGS,
    ...source,
    workdays: Array.isArray(source.workdays)
      ? source.workdays.map(Number).filter((day) => day >= 0 && day <= 6)
      : DEFAULT_TIME_WINDOW_SETTINGS.workdays.slice()
  };
}

function normalizeStore(value) {
  const source = deepMerge(DEFAULT_STORE, isPlainObject(value) ? value : {});
  const notificationStyle = VALID_NOTIFICATION_STYLES.has(source.settings.notificationStyle)
    ? source.settings.notificationStyle
    : DEFAULT_STORE.settings.notificationStyle;
  const themeKey = VALID_THEME_KEYS.has(source.settings.themeKey)
    ? source.settings.themeKey
    : DEFAULT_STORE.settings.themeKey;

  return {
    settings: {
      ...source.settings,
      interval: normalizePositiveNumber(source.settings.interval, DEFAULT_STORE.settings.interval),
      popup: source.settings.popup !== false,
      notificationStyle,
      sound: source.settings.sound !== false,
      themeKey,
      onboardingComplete: Boolean(source.settings.onboardingComplete),
      archiveView: {
        ...DEFAULT_ARCHIVE_VIEW,
        ...(isPlainObject(source.settings.archiveView) ? source.settings.archiveView : {})
      },
      timeWindowSettings: normalizeTimeWindowSettings(source.settings.timeWindowSettings)
    },
    favorites: Array.isArray(source.favorites) ? clone(source.favorites) : [],
    archive: {
      history: Array.isArray(source.archive.history) ? clone(source.archive.history) : [],
      archiveEntries: Array.isArray(source.archive.archiveEntries) ? clone(source.archive.archiveEntries) : [],
      archiveMigrated: Boolean(source.archive.archiveMigrated)
    },
    queue: {
      shownHaikuIds: normalizeStringArray(source.queue.shownHaikuIds)
    },
    scheduler: {
      idleThresholdMs: normalizePositiveNumber(
        source.scheduler.idleThresholdMs,
        DEFAULT_STORE.scheduler.idleThresholdMs
      )
    },
    migration: {
      localStorageCompleted: Boolean(source.migration.localStorageCompleted),
      completedAt: source.migration.completedAt || null
    }
  };
}

function validateSection(section) {
  if (!VALID_SECTIONS.has(section)) {
    throw new Error(`Invalid store section: ${section}`);
  }
}

function parseLegacyState(value) {
  if (isPlainObject(value)) return clone(value);
  if (typeof value !== 'string' || !value.trim()) return {};

  try {
    const parsed = JSON.parse(value);
    return isPlainObject(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function hasLegacyState(value, parsed) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 && trimmed !== '{}';
  }

  return isPlainObject(parsed) && Object.keys(parsed).length > 0;
}

function legacyAccentTheme(accent) {
  const color = String(accent || '').toLowerCase();
  if (color === '#6a9e5c') return 'forest';
  if (color === '#5c8e9e') return 'winter';
  if (color === '#c45c4a' || color === '#c47a5c') return 'autumn';
  return 'midnight';
}

function migrateLocalStoragePayload(payload = {}, existingStore = DEFAULT_STORE, now = new Date().toISOString()) {
  const legacyState = parseLegacyState(payload.dhState);
  const hadSavedState = hasLegacyState(payload.dhState, legacyState);
  const existing = normalizeStore(existingStore);
  const settings = {};
  const archive = {};
  const queue = {};
  const patch = {
    migration: {
      localStorageCompleted: true,
      completedAt: now
    }
  };

  if (legacyState.interval !== undefined) {
    settings.interval = normalizePositiveNumber(legacyState.interval, existing.settings.interval);
  }

  if (legacyState.popup !== undefined) {
    settings.popup = legacyState.popup !== false;
  }

  if (legacyState.notificationStyle !== undefined) {
    settings.notificationStyle = VALID_NOTIFICATION_STYLES.has(legacyState.notificationStyle)
      ? legacyState.notificationStyle
      : existing.settings.notificationStyle;
  }

  if (legacyState.sound !== undefined) {
    settings.sound = legacyState.sound !== false;
  }

  if (legacyState.themeKey !== undefined || payload.dhAccent !== undefined) {
    settings.themeKey = VALID_THEME_KEYS.has(legacyState.themeKey)
      ? legacyState.themeKey
      : legacyAccentTheme(payload.dhAccent);
  }

  if (legacyState.onboardingComplete !== undefined) {
    settings.onboardingComplete = Boolean(legacyState.onboardingComplete);
  } else if (hadSavedState) {
    settings.onboardingComplete = true;
  }

  if (isPlainObject(legacyState.archiveView)) {
    settings.archiveView = {
      ...DEFAULT_ARCHIVE_VIEW,
      ...legacyState.archiveView
    };
  }

  if (isPlainObject(legacyState.timeWindowSettings)) {
    settings.timeWindowSettings = normalizeTimeWindowSettings(legacyState.timeWindowSettings);
  }

  if (Array.isArray(legacyState.favs)) {
    patch.favorites = clone(legacyState.favs);
  }

  if (Array.isArray(legacyState.history)) {
    archive.history = clone(legacyState.history);
  }

  if (Array.isArray(legacyState.archiveEntries)) {
    archive.archiveEntries = clone(legacyState.archiveEntries);
  }

  if (legacyState.archiveMigrated !== undefined) {
    archive.archiveMigrated = Boolean(legacyState.archiveMigrated);
  }

  if (Array.isArray(legacyState.shownHaikuIds)) {
    queue.shownHaikuIds = normalizeStringArray(legacyState.shownHaikuIds);
  }

  if (Object.keys(settings).length) patch.settings = settings;
  if (Object.keys(archive).length) patch.archive = archive;
  if (Object.keys(queue).length) patch.queue = queue;

  return normalizeStore(deepMerge(existing, patch));
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_error) {
    return {};
  }
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}

function createJsonStore({ filePath }) {
  if (!filePath) {
    throw new Error('createJsonStore requires a filePath');
  }

  let state = normalizeStore(readJsonFile(filePath));

  function commit(nextState) {
    state = normalizeStore(nextState);
    writeJsonFile(filePath, state);
    return clone(state);
  }

  return {
    get(section) {
      if (!section) return clone(state);
      validateSection(section);
      return clone(state[section]);
    },

    getAll() {
      return clone(state);
    },

    set(section, value) {
      validateSection(section);
      return commit({
        ...state,
        [section]: clone(value)
      });
    },

    update(patch = {}) {
      if (!isPlainObject(patch)) {
        throw new Error('Store update must be an object');
      }

      const knownPatch = {};
      Object.entries(patch).forEach(([section, value]) => {
        validateSection(section);
        knownPatch[section] = value;
      });

      return commit(deepMerge(state, knownPatch));
    },

    resetSection(section) {
      validateSection(section);
      return commit({
        ...state,
        [section]: clone(DEFAULT_STORE[section])
      });
    },

    replaceAll(nextState) {
      return commit(nextState);
    },

    filePath
  };
}

exports.DEFAULT_STORE = DEFAULT_STORE;
exports.DEFAULT_TIME_WINDOW_SETTINGS = DEFAULT_TIME_WINDOW_SETTINGS;
exports.DEFAULT_ARCHIVE_VIEW = DEFAULT_ARCHIVE_VIEW;
exports.createJsonStore = createJsonStore;
exports.deepMerge = deepMerge;
exports.legacyAccentTheme = legacyAccentTheme;
exports.migrateLocalStoragePayload = migrateLocalStoragePayload;
exports.normalizeStore = normalizeStore;
exports.normalizeTimeWindowSettings = normalizeTimeWindowSettings;
