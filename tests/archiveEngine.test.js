import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  createArchiveEntry,
  filterArchiveEntries,
  getUniqueValues,
  migrateHistoryToArchive,
  updateReflection
} = require('../src/renderer/archiveEngine.js');

const haikus = [
  { id: 'calm-001', lines: ['Still tea steam rises'], mood: 'calm', theme: 'rest', tags: ['tea', 'quiet'] },
  { id: 'bold-001', lines: ['Steps ring through the rain'], mood: 'bold', theme: 'courage', tags: ['motion'] },
  { id: 'warm-001', lines: ['Window light returns'], mood: 'warm', theme: 'gratitude', tags: ['home'] }
];

function entry(haiku, shownAt, source = 'manual') {
  return createArchiveEntry(haiku, { shownAt, source, id: `${haiku.id}-${shownAt}` });
}

describe('archive engine', () => {
  it('searches text, mood, theme, and tags', () => {
    const entries = [
      entry(haikus[0], '2026-05-06T08:00:00.000Z'),
      entry(haikus[1], '2026-05-06T09:00:00.000Z')
    ];

    expect(filterArchiveEntries(entries, { search: 'steam' })).toHaveLength(1);
    expect(filterArchiveEntries(entries, { search: 'bold' })[0].haikuId).toBe('bold-001');
    expect(filterArchiveEntries(entries, { search: 'courage' })[0].haikuId).toBe('bold-001');
    expect(filterArchiveEntries(entries, { search: 'quiet' })[0].haikuId).toBe('calm-001');
  });

  it('filters by mood and theme', () => {
    const entries = [
      entry(haikus[0], '2026-05-06T08:00:00.000Z'),
      entry(haikus[1], '2026-05-06T09:00:00.000Z')
    ];

    expect(filterArchiveEntries(entries, { mood: 'calm' }).map((item) => item.haikuId)).toEqual(['calm-001']);
    expect(filterArchiveEntries(entries, { theme: 'courage' }).map((item) => item.haikuId)).toEqual(['bold-001']);
  });

  it('applies time scopes and favorites scope newest first', () => {
    const entries = [
      entry(haikus[0], '2026-05-06T08:00:00.000Z'),
      entry(haikus[1], '2026-05-04T09:00:00.000Z'),
      entry(haikus[2], '2026-04-20T09:00:00.000Z')
    ];

    expect(filterArchiveEntries(entries, { scope: 'today', now: '2026-05-06T12:00:00.000Z' }).map((item) => item.haikuId)).toEqual(['calm-001']);
    expect(filterArchiveEntries(entries, { scope: 'week', now: '2026-05-06T12:00:00.000Z' }).map((item) => item.haikuId)).toEqual(['calm-001', 'bold-001']);
    expect(filterArchiveEntries(entries, { scope: 'favorites', favoriteIds: ['warm-001'] }).map((item) => item.haikuId)).toEqual(['warm-001']);
  });

  it('updates and clears one-line reflections', () => {
    const entries = [entry(haikus[0], '2026-05-06T08:00:00.000Z')];
    const withNote = updateReflection(entries, entries[0].id, 'Breathe before starting.');
    const cleared = updateReflection(withNote, entries[0].id, '');

    expect(withNote[0].reflection).toBe('Breathe before starting.');
    expect(cleared[0].reflection).toBe('');
  });

  it('migrates legacy history using haiku data where possible', () => {
    const legacy = [{ id: 'calm-001', t: 'old text', time: '09:00 AM' }];
    const migrated = migrateHistoryToArchive(legacy, haikus, [], '2026-05-06T12:00:00.000Z');

    expect(migrated[0]).toMatchObject({
      haikuId: 'calm-001',
      lines: ['Still tea steam rises'],
      mood: 'calm',
      theme: 'rest',
      source: 'manual'
    });
  });

  it('returns unique mood and theme filter values', () => {
    const entries = [
      entry(haikus[0], '2026-05-06T08:00:00.000Z'),
      entry(haikus[1], '2026-05-06T09:00:00.000Z'),
      entry(haikus[0], '2026-05-06T10:00:00.000Z')
    ];

    expect(getUniqueValues(entries, 'mood')).toEqual(['bold', 'calm']);
    expect(getUniqueValues(entries, 'theme')).toEqual(['courage', 'rest']);
  });
});
