import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { selectNextHaiku } = require('../src/renderer/haikuEngine.js');

const pool = [
  { id: 'one', lines: ['one'], mood: 'calm', theme: 'focus', tags: [] },
  { id: 'two', lines: ['two'], mood: 'bold', theme: 'growth', tags: [] },
  { id: 'three', lines: ['three'], mood: 'warm', theme: 'rest', tags: [] }
];

describe('haiku no-repeat selection', () => {
  it('does not return current haiku again when alternatives exist', () => {
    const result = selectNextHaiku(pool, { shownIds: [] }, {
      currentId: 'one',
      random: () => 0
    });

    expect(result.haiku.id).toBe('two');
    expect(result.queueState.shownIds).toEqual(['two']);
  });

  it('exhausts pool before repeating', () => {
    let queueState = { shownIds: [] };
    const selected = [];

    for (let i = 0; i < pool.length; i += 1) {
      const result = selectNextHaiku(pool, queueState, { random: () => 0 });
      selected.push(result.haiku.id);
      queueState = result.queueState;
    }

    expect(new Set(selected).size).toBe(pool.length);
    expect(queueState.shownIds).toHaveLength(pool.length);
  });

  it('reshuffles safely after full cycle', () => {
    const result = selectNextHaiku(pool, { shownIds: ['one', 'two', 'three'] }, {
      currentId: 'three',
      random: () => 0
    });

    expect(result.haiku.id).toBe('one');
    expect(result.queueState.shownIds).toEqual(['one']);
  });

  it('handles small pools gracefully', () => {
    const single = [{ id: 'solo', lines: ['solo'], mood: 'calm', theme: 'focus', tags: [] }];
    const first = selectNextHaiku(single, { shownIds: [] }, { currentId: 'solo' });
    const second = selectNextHaiku(single, first.queueState, { currentId: 'solo' });

    expect(first.haiku.id).toBe('solo');
    expect(second.haiku.id).toBe('solo');
    expect(second.queueState.shownIds).toEqual(['solo']);
  });
});
