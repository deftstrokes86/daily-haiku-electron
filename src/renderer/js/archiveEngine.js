(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DailyHaikuArchive = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DAY_MS = 24 * 60 * 60 * 1000;

  function toText(value) {
    return typeof value === 'string' ? value : '';
  }

  function normalizeLines(value) {
    if (Array.isArray(value)) {
      return value.map((line) => String(line || '').trim()).filter(Boolean).slice(0, 3);
    }

    if (typeof value === 'string') {
      return value.split(/\n| \/ /).map((line) => line.trim()).filter(Boolean).slice(0, 3);
    }

    return [];
  }

  function getHaikuId(haiku) {
    return toText(haiku && (haiku.id || haiku.haikuId));
  }

  function createArchiveEntry(haiku, options) {
    const source = options && options.source === 'scheduled' ? 'scheduled' : 'manual';
    const shownAt = options && options.shownAt ? new Date(options.shownAt) : new Date();
    const haikuId = getHaikuId(haiku);
    const lines = normalizeLines(haiku && (haiku.lines || haiku.text));
    const id = toText(options && options.id) || `${shownAt.toISOString()}-${haikuId || 'haiku'}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      id,
      haikuId,
      lines,
      mood: toText(haiku && haiku.mood),
      theme: toText(haiku && haiku.theme),
      tags: Array.isArray(haiku && haiku.tags) ? haiku.tags.map(String) : [],
      shownAt: shownAt.toISOString(),
      source,
      reflection: toText(options && options.reflection).trim()
    };
  }

  function normalizeEntry(raw, index) {
    const shownAt = raw && raw.shownAt ? new Date(raw.shownAt) : new Date(Date.now() - index * 60 * 1000);
    const safeShownAt = Number.isNaN(shownAt.getTime()) ? new Date(Date.now() - index * 60 * 1000) : shownAt;
    const haikuId = toText(raw && (raw.haikuId || raw.id));

    return {
      id: toText(raw && raw.entryId) || toText(raw && raw.archiveId) || toText(raw && raw.id && raw.haikuId ? raw.id : '') || `${safeShownAt.toISOString()}-${haikuId || index}`,
      haikuId,
      lines: normalizeLines(raw && (raw.lines || raw.t || raw.text)),
      mood: toText(raw && raw.mood),
      theme: toText(raw && raw.theme),
      tags: Array.isArray(raw && raw.tags) ? raw.tags.map(String) : [],
      shownAt: safeShownAt.toISOString(),
      source: raw && raw.source === 'scheduled' ? 'scheduled' : 'manual',
      reflection: toText(raw && raw.reflection).trim()
    };
  }

  function normalizeArchiveEntries(entries) {
    const seen = new Set();

    return (Array.isArray(entries) ? entries : [])
      .map(normalizeEntry)
      .filter((entry) => {
        if (seen.has(entry.id)) return false;
        seen.add(entry.id);
        return entry.lines.length || entry.haikuId;
      });
  }

  function findHaikuByLegacyRef(haikus, ref) {
    const list = Array.isArray(haikus) ? haikus : [];
    if (typeof ref === 'string') {
      return list.find((haiku) => haiku.id === ref) || null;
    }

    const index = Number(ref);
    if (Number.isInteger(index) && index >= 0 && index < list.length) {
      return list[index];
    }

    return null;
  }

  function migrateHistoryToArchive(history, haikus, existingEntries, now) {
    const archive = normalizeArchiveEntries(existingEntries);
    const known = new Set(archive.map((entry) => `${entry.haikuId}|${entry.shownAt}|${entry.lines.join('\n')}`));
    const base = now ? new Date(now) : new Date();

    (Array.isArray(history) ? history : []).forEach((item, index) => {
      const haiku = findHaikuByLegacyRef(haikus, item && (item.id || item.i)) || {};
      const shownAt = item && item.shownAt ? new Date(item.shownAt) : new Date(base.getTime() - index * 60 * 1000);
      const candidate = createArchiveEntry({
        id: haiku.id || toText(item && item.id),
        lines: normalizeLines((haiku && haiku.lines) || (item && (item.t || item.text))),
        mood: haiku.mood || toText(item && item.mood),
        theme: haiku.theme || toText(item && item.theme),
        tags: Array.isArray(haiku.tags) ? haiku.tags : []
      }, {
        id: item && item.entryId,
        shownAt,
        source: item && item.source === 'scheduled' ? 'scheduled' : 'manual',
        reflection: item && item.reflection
      });
      const key = `${candidate.haikuId}|${candidate.shownAt}|${candidate.lines.join('\n')}`;

      if (!known.has(key)) {
        known.add(key);
        archive.push(candidate);
      }
    });

    return sortNewestFirst(archive);
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function startOfWeek(date) {
    const day = date.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const start = startOfDay(date);
    start.setDate(start.getDate() - diff);
    return start;
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function matchesScope(entry, scope, now, favoriteIds) {
    if (scope === 'favorites') return favoriteIds.has(entry.haikuId);
    if (!scope || scope === 'all') return true;

    const shownAt = new Date(entry.shownAt);
    if (Number.isNaN(shownAt.getTime())) return false;

    if (scope === 'today') return shownAt >= startOfDay(now);
    if (scope === 'week') return shownAt >= startOfWeek(now);
    if (scope === 'month') return shownAt >= startOfMonth(now);
    return true;
  }

  function matchesSearch(entry, search) {
    const query = toText(search).trim().toLowerCase();
    if (!query) return true;

    const haystack = [
      entry.lines.join(' '),
      entry.mood,
      entry.theme,
      entry.tags.join(' '),
      entry.reflection
    ].join(' ').toLowerCase();

    return haystack.includes(query);
  }

  function sortNewestFirst(entries) {
    return entries.slice().sort((a, b) => new Date(b.shownAt).getTime() - new Date(a.shownAt).getTime());
  }

  function filterArchiveEntries(entries, options) {
    const settings = options || {};
    const now = settings.now ? new Date(settings.now) : new Date();
    const favoriteIds = new Set(Array.isArray(settings.favoriteIds) ? settings.favoriteIds : []);
    const mood = toText(settings.mood).toLowerCase();
    const theme = toText(settings.theme).toLowerCase();

    return sortNewestFirst(normalizeArchiveEntries(entries).filter((entry) => {
      if (!matchesScope(entry, settings.scope, now, favoriteIds)) return false;
      if (mood && entry.mood.toLowerCase() !== mood) return false;
      if (theme && entry.theme.toLowerCase() !== theme) return false;
      return matchesSearch(entry, settings.search);
    }));
  }

  function getUniqueValues(entries, field) {
    const values = new Set();
    normalizeArchiveEntries(entries).forEach((entry) => {
      const value = toText(entry[field]).trim();
      if (value) values.add(value);
    });

    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }

  function updateReflection(entries, entryId, reflection) {
    const value = toText(reflection).trim();
    return normalizeArchiveEntries(entries).map((entry) => (
      entry.id === entryId ? { ...entry, reflection: value } : entry
    ));
  }

  return {
    createArchiveEntry,
    normalizeArchiveEntries,
    migrateHistoryToArchive,
    filterArchiveEntries,
    getUniqueValues,
    updateReflection
  };
}));
