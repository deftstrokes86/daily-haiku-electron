import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createActiveTimeScheduler } = require('../src/scheduler/activeTimeScheduler.js');

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const ACTIVE = {
  isLocked: false,
  isIdle: false,
  isSuspended: false,
  isInQuietHours: false
};

function createScheduler(intervalMs = HOUR) {
  const scheduler = createActiveTimeScheduler({ intervalMs });
  scheduler.start(0);
  return scheduler;
}

describe('active time scheduler', () => {
  it('triggers after exactly 60 active minutes', () => {
    const scheduler = createScheduler();

    expect(scheduler.tick(HOUR, ACTIVE)).toEqual({
      type: 'TRIGGER_HAIKU',
      reason: 'active-interval-complete'
    });

    const snapshot = scheduler.getSnapshot(HOUR);
    expect(snapshot.activeAccumulatedMs).toBe(0);
    expect(snapshot.lastTriggeredAt).toBe(HOUR);
    expect(snapshot.hasEmittedForCurrentInterval).toBe(true);
  });

  it('does not trigger after 59 active minutes', () => {
    const scheduler = createScheduler();

    expect(scheduler.tick(59 * MINUTE, ACTIVE)).toBeNull();
    expect(scheduler.getSnapshot(59 * MINUTE)).toMatchObject({
      activeAccumulatedMs: 59 * MINUTE,
      remainingMs: MINUTE
    });
  });

  it('pauses accumulation while locked', () => {
    const scheduler = createScheduler();

    expect(scheduler.tick(30 * MINUTE, { ...ACTIVE, isLocked: true })).toBeNull();
    expect(scheduler.tick(HOUR, ACTIVE)).toBeNull();
    expect(scheduler.tick(90 * MINUTE, ACTIVE)).toEqual({
      type: 'TRIGGER_HAIKU',
      reason: 'active-interval-complete'
    });
  });

  it('pauses accumulation while idle', () => {
    const scheduler = createScheduler();

    expect(scheduler.tick(30 * MINUTE, { ...ACTIVE, isIdle: true })).toBeNull();
    expect(scheduler.tick(HOUR, ACTIVE)).toBeNull();
    expect(scheduler.tick(90 * MINUTE, ACTIVE)).toEqual({
      type: 'TRIGGER_HAIKU',
      reason: 'active-interval-complete'
    });
  });

  it('pauses accumulation while suspended', () => {
    const scheduler = createScheduler();

    expect(scheduler.tick(30 * MINUTE, { ...ACTIVE, isSuspended: true })).toBeNull();
    expect(scheduler.tick(HOUR, ACTIVE)).toBeNull();
    expect(scheduler.tick(90 * MINUTE, ACTIVE)).toEqual({
      type: 'TRIGGER_HAIKU',
      reason: 'active-interval-complete'
    });
  });

  it('pauses during quiet hours', () => {
    const scheduler = createScheduler();

    expect(scheduler.tick(30 * MINUTE, { ...ACTIVE, isInQuietHours: true })).toBeNull();
    expect(scheduler.tick(HOUR, ACTIVE)).toBeNull();
    expect(scheduler.tick(90 * MINUTE, ACTIVE)).toEqual({
      type: 'TRIGGER_HAIKU',
      reason: 'active-interval-complete'
    });
  });

  it('does not spam multiple haikus after resume', () => {
    const scheduler = createScheduler();

    expect(scheduler.tick(10 * MINUTE, ACTIVE)).toBeNull();
    expect(scheduler.tick(6 * HOUR, { ...ACTIVE, isSuspended: true })).toBeNull();

    const event = scheduler.tick(9 * HOUR, ACTIVE);

    expect(event).toEqual({
      type: 'TRIGGER_HAIKU',
      reason: 'active-interval-complete'
    });
    expect(scheduler.getSnapshot(9 * HOUR)).toMatchObject({
      activeAccumulatedMs: 0,
      lastTriggeredAt: 9 * HOUR
    });
    expect(scheduler.tick(9 * HOUR, ACTIVE)).toBeNull();
  });

  it('reset clears progress', () => {
    const scheduler = createScheduler();

    expect(scheduler.tick(30 * MINUTE, ACTIVE)).toBeNull();
    expect(scheduler.reset(30 * MINUTE)).toMatchObject({
      activeAccumulatedMs: 0,
      remainingMs: HOUR,
      progress: 0
    });
    expect(scheduler.tick(89 * MINUTE, ACTIVE)).toBeNull();
    expect(scheduler.tick(90 * MINUTE, ACTIVE)).toEqual({
      type: 'TRIGGER_HAIKU',
      reason: 'active-interval-complete'
    });
  });

  it('interval change works safely', () => {
    const scheduler = createScheduler();

    expect(scheduler.tick(45 * MINUTE, ACTIVE)).toBeNull();

    const snapshot = scheduler.updateInterval(30 * MINUTE, 45 * MINUTE);

    expect(snapshot.activeAccumulatedMs).toBe(22.5 * MINUTE);
    expect(snapshot.remainingMs).toBe(7.5 * MINUTE);
    expect(snapshot.progress).toBe(0.75);
    expect(snapshot.isReadyToTrigger).toBe(false);
    expect(scheduler.tick(45 * MINUTE, ACTIVE)).toBeNull();
    expect(scheduler.tick(52.5 * MINUTE, ACTIVE)).toEqual({
      type: 'TRIGGER_HAIKU',
      reason: 'active-interval-complete'
    });
  });

  it('snapshot returns remaining time and percentage progress', () => {
    const scheduler = createScheduler();

    expect(scheduler.tick(15 * MINUTE, ACTIVE)).toBeNull();

    expect(scheduler.getSnapshot(15 * MINUTE)).toMatchObject({
      intervalMs: HOUR,
      activeAccumulatedMs: 15 * MINUTE,
      remainingMs: 45 * MINUTE,
      progress: 0.25,
      progressPercent: 25,
      isActivelyCountable: true
    });
  });
});
