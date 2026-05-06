import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  createJsonStore,
  legacyAccentTheme,
  migrateLocalStoragePayload
} = require('../src/main/store.js');

describe('main process store migration', () => {
  it('migrates legacy renderer state into sectioned app data', () => {
    const legacyState = {
      history: [{ id: 'calm-001', t: 'Still tea steam rises', time: '09:00 AM' }],
      archiveEntries: [{
        id: 'entry-1',
        haikuId: 'calm-001',
        lines: ['Still tea steam rises'],
        mood: 'calm',
        theme: 'rest',
        tags: ['tea'],
        shownAt: '2026-05-06T09:00:00.000Z',
        source: 'manual',
        reflection: 'Start quietly.'
      }],
      archiveMigrated: true,
      archiveView: { scope: 'favorites', search: 'tea' },
      favs: [{ id: 'calm-001', t: 'Still tea steam rises' }],
      interval: 30,
      popup: false,
      notificationStyle: 'both',
      sound: false,
      themeKey: 'forest',
      onboardingComplete: true,
      shownHaikuIds: ['calm-001', ''],
      timeWindowSettings: {
        quietHoursEnabled: true,
        quietHoursStart: '21:00',
        quietHoursEnd: '07:00',
        workHoursOnly: true,
        workdays: [1, 2, 3]
      }
    };

    const migrated = migrateLocalStoragePayload(
      { dhState: JSON.stringify(legacyState) },
      undefined,
      '2026-05-06T12:00:00.000Z'
    );

    expect(migrated.settings).toMatchObject({
      interval: 30,
      popup: false,
      notificationStyle: 'both',
      sound: false,
      themeKey: 'forest',
      onboardingComplete: true
    });
    expect(migrated.settings.timeWindowSettings).toMatchObject({
      quietHoursEnabled: true,
      quietHoursStart: '21:00',
      quietHoursEnd: '07:00',
      workHoursOnly: true,
      workdays: [1, 2, 3]
    });
    expect(migrated.favorites).toHaveLength(1);
    expect(migrated.archive.history).toHaveLength(1);
    expect(migrated.archive.archiveEntries[0].reflection).toBe('Start quietly.');
    expect(migrated.archive.archiveMigrated).toBe(true);
    expect(migrated.queue.shownHaikuIds).toEqual(['calm-001']);
    expect(migrated.migration).toEqual({
      localStorageCompleted: true,
      completedAt: '2026-05-06T12:00:00.000Z'
    });
  });

  it('maps legacy accent colors and keeps old users past onboarding', () => {
    const migrated = migrateLocalStoragePayload(
      { dhState: JSON.stringify({ interval: 60 }), dhAccent: '#5c8e9e' },
      undefined,
      '2026-05-06T12:00:00.000Z'
    );

    expect(legacyAccentTheme('#5c8e9e')).toBe('winter');
    expect(migrated.settings.themeKey).toBe('winter');
    expect(migrated.settings.onboardingComplete).toBe(true);
  });

  it('handles invalid legacy data without crashing', () => {
    const migrated = migrateLocalStoragePayload(
      { dhState: '{not-json' },
      undefined,
      '2026-05-06T12:00:00.000Z'
    );

    expect(migrated.favorites).toEqual([]);
    expect(migrated.archive.archiveEntries).toEqual([]);
    expect(migrated.migration.localStorageCompleted).toBe(true);
  });

  it('persists section updates to a JSON file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-haiku-store-'));
    const filePath = path.join(dir, 'store.json');

    try {
      const store = createJsonStore({ filePath });
      store.set('favorites', [{ id: 'calm-001' }]);
      store.update({
        settings: { interval: 120 },
        queue: { shownHaikuIds: ['calm-001'] }
      });

      const reloaded = createJsonStore({ filePath });
      expect(reloaded.get('favorites')).toEqual([{ id: 'calm-001' }]);
      expect(reloaded.get('settings').interval).toBe(120);
      expect(reloaded.get('queue').shownHaikuIds).toEqual(['calm-001']);

      reloaded.resetSection('queue');
      expect(reloaded.get('queue').shownHaikuIds).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
