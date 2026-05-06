(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DailyHaikuEngine = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeHaiku(raw, index) {
    const lines = Array.isArray(raw.lines) ? raw.lines : raw.text;
    return {
      id: raw.id || `legacy-${String(index + 1).padStart(3, '0')}`,
      lines: Array.isArray(lines) ? lines : [],
      mood: raw.mood || 'reflective',
      theme: raw.theme || 'daily practice',
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      index
    };
  }

  function normalizeHaikus(rawHaikus) {
    return (Array.isArray(rawHaikus) ? rawHaikus : []).map(normalizeHaiku);
  }

  function getHaikuLines(haiku) {
    if (!haiku) return [];
    if (Array.isArray(haiku.lines)) return haiku.lines;
    if (Array.isArray(haiku.text)) return haiku.text;
    return [];
  }

  function getHaikuText(haiku) {
    return getHaikuLines(haiku).join('\n');
  }

  function getHaikuMeta(haiku) {
    if (!haiku) return '';
    const mood = titleCase(haiku.mood || '');
    const theme = titleCase(haiku.theme || '');
    return [mood, theme].filter(Boolean).join(' · ');
  }

  function titleCase(value) {
    return String(value)
      .split(/[\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function createQueueState(savedState) {
    return {
      shownIds: Array.isArray(savedState && savedState.shownIds)
        ? savedState.shownIds.filter((id) => typeof id === 'string')
        : []
    };
  }

  function sanitizeShownIds(shownIds, availableIds) {
    const available = new Set(availableIds);
    const seen = new Set();
    return shownIds.filter((id) => {
      if (!available.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function pickOne(items, random) {
    if (!items.length) return null;
    const value = typeof random === 'function' ? random() : Math.random();
    const index = Math.min(items.length - 1, Math.max(0, Math.floor(value * items.length)));
    return items[index];
  }

  function selectNextHaiku(haikus, queueState, options) {
    const normalized = normalizeHaikus(haikus);
    const random = options && options.random;
    const currentId = options && options.currentId;

    if (!normalized.length) {
      return { haiku: null, index: -1, queueState: createQueueState(queueState) };
    }

    const ids = normalized.map((haiku) => haiku.id);
    let shownIds = sanitizeShownIds(createQueueState(queueState).shownIds, ids);

    if (shownIds.length >= ids.length) {
      shownIds = [];
    }

    let eligibleIds = ids.filter((id) => !shownIds.includes(id));

    if (eligibleIds.length > 1 && currentId) {
      const withoutCurrent = eligibleIds.filter((id) => id !== currentId);
      if (withoutCurrent.length) eligibleIds = withoutCurrent;
    }

    if (!eligibleIds.length) {
      eligibleIds = ids.length > 1 && currentId ? ids.filter((id) => id !== currentId) : ids.slice();
      shownIds = [];
    }

    const selectedId = pickOne(eligibleIds, random);
    const index = normalized.findIndex((haiku) => haiku.id === selectedId);
    const nextShownIds = shownIds.includes(selectedId) ? shownIds : shownIds.concat(selectedId);

    return {
      haiku: normalized[index],
      index,
      queueState: { shownIds: nextShownIds }
    };
  }

  function findHaikuByLegacyRef(haikus, ref) {
    const normalized = normalizeHaikus(haikus);
    if (typeof ref === 'string') {
      return normalized.find((haiku) => haiku.id === ref) || null;
    }

    const index = Number(ref);
    if (Number.isInteger(index) && index >= 0 && index < normalized.length) {
      return normalized[index];
    }

    return null;
  }

  return {
    normalizeHaikus,
    getHaikuLines,
    getHaikuText,
    getHaikuMeta,
    createQueueState,
    selectNextHaiku,
    findHaikuByLegacyRef
  };
}));
