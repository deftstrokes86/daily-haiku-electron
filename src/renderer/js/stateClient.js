(function (root) {
  function isNotificationStyle(value) {
    return ['native', 'floating', 'both'].includes(value);
  }

  function applyStoredState(store, state, deps) {
    const settings = (store && store.settings) || {};
    const archive = (store && store.archive) || {};
    const queue = (store && store.queue) || {};
    const normalizeArchiveEntries = deps.normalizeArchiveEntries;
    const defaultTimeWindowSettings = deps.defaultTimeWindowSettings;
    const themes = deps.themes;

    state.history = Array.isArray(archive.history) ? archive.history : [];
    state.archiveEntries = normalizeArchiveEntries(
      Array.isArray(archive.archiveEntries) ? archive.archiveEntries : []
    );
    state.archiveMigrated = !!archive.archiveMigrated;
    state.archiveView = { scope: 'today', search: '', mood: '', theme: '', ...(settings.archiveView || {}) };
    state.favs = Array.isArray(store && store.favorites) ? store.favorites : [];
    state.interval = Number(settings.interval) > 0 ? Number(settings.interval) : 60;
    state.themeKey = themes[settings.themeKey] ? settings.themeKey : 'midnight';
    state.onboardingComplete = !!settings.onboardingComplete;
    state.shownHaikuIds = Array.isArray(queue.shownHaikuIds) ? queue.shownHaikuIds : [];
    state.timeWindowSettings = { ...defaultTimeWindowSettings, ...(settings.timeWindowSettings || {}) };
    state.timeWindowSettings.workdays = Array.isArray(state.timeWindowSettings.workdays)
      ? state.timeWindowSettings.workdays
      : [1, 2, 3, 4, 5];
    state.popup = settings.popup !== false;
    state.notificationStyle = isNotificationStyle(settings.notificationStyle) ? settings.notificationStyle : 'native';
    state.sound = settings.sound !== false;
  }

  function storeState(state) {
    return {
      settings: {
        interval: state.interval,
        popup: state.popup,
        notificationStyle: state.notificationStyle,
        sound: state.sound,
        themeKey: state.themeKey,
        onboardingComplete: state.onboardingComplete,
        archiveView: state.archiveView,
        timeWindowSettings: state.timeWindowSettings
      },
      favorites: state.favs,
      archive: {
        history: state.history.slice(0, 20),
        archiveEntries: state.archiveEntries,
        archiveMigrated: state.archiveMigrated
      },
      queue: { shownHaikuIds: state.shownHaikuIds }
    };
  }

  async function loadIntoState(state, deps) {
    const api = deps.electronAPI;
    const storage = deps.localStorage;

    if (!api || !api.storeGet) {
      applyStoredState(null, state, deps);
      return;
    }

    try {
      let store = await api.storeGet();
      if (!store?.migration?.localStorageCompleted) {
        const dhState = storage.getItem('dhState');
        const dhAccent = storage.getItem('dhAccent');

        if (dhState || dhAccent) {
          store = await api.storeUpdate({ __migrateLocalStorage: { dhState, dhAccent } });
        } else {
          store = await api.storeUpdate({
            migration: { localStorageCompleted: true, completedAt: new Date().toISOString() }
          });
        }

        try {
          storage.setItem('dhStoreMigrationCompleted', 'true');
        } catch (_error) {}
      }

      applyStoredState(store, state, deps);
    } catch (_error) {
      applyStoredState(null, state, deps);
    }
  }

  function saveState(state, api) {
    if (!api || !api.storeUpdate) return;
    api.storeUpdate(storeState(state)).catch(() => {});
  }

  root.DailyHaikuStateClient = {
    applyStoredState,
    isNotificationStyle,
    loadIntoState,
    saveState,
    storeState
  };
}(typeof globalThis !== 'undefined' ? globalThis : this));
