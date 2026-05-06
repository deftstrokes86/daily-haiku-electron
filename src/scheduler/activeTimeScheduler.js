const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

const DEFAULT_ENVIRONMENT_STATE = {
  isLocked: false,
  isIdle: false,
  isSuspended: false,
  isInQuietHours: false,
  isOutsideWorkHours: false
};

function normalizeTimestamp(value, label) {
  const timestamp = value instanceof Date ? value.getTime() : Number(value);

  if (!Number.isFinite(timestamp)) {
    throw new TypeError(`${label} must be a finite timestamp in milliseconds`);
  }

  return timestamp;
}

function normalizeInterval(value) {
  const intervalMs = Number(value);

  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new RangeError('intervalMs must be a positive number');
  }

  return intervalMs;
}

function normalizeEnvironmentState(environmentState = {}) {
  return {
    isLocked: Boolean(environmentState.isLocked),
    isIdle: Boolean(environmentState.isIdle),
    isSuspended: Boolean(environmentState.isSuspended),
    isInQuietHours: Boolean(environmentState.isInQuietHours),
    isOutsideWorkHours: Boolean(environmentState.isOutsideWorkHours)
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createActiveTimeScheduler(options = {}) {
  const state = {
    intervalMs: normalizeInterval(options.intervalMs ?? DEFAULT_INTERVAL_MS),
    activeAccumulatedMs: Math.max(0, Number(options.activeAccumulatedMs ?? 0)),
    lastTickAt: options.lastTickAt == null ? null : normalizeTimestamp(options.lastTickAt, 'lastTickAt'),
    paused: Boolean(options.paused),
    pauseReason: options.pauseReason ?? null,
    lastPauseReason: null,
    lastResumeReason: null,
    lastTriggeredAt: options.lastTriggeredAt == null ? null : normalizeTimestamp(options.lastTriggeredAt, 'lastTriggeredAt'),
    hasEmittedForCurrentInterval: Boolean(options.hasEmittedForCurrentInterval),
    environmentState: normalizeEnvironmentState(options.environmentState)
  };

  function isActivelyCountable() {
    return !state.paused
      && !state.environmentState.isLocked
      && !state.environmentState.isIdle
      && !state.environmentState.isSuspended
      && !state.environmentState.isInQuietHours
      && !state.environmentState.isOutsideWorkHours;
  }

  function markActiveProgressStarted() {
    if (state.hasEmittedForCurrentInterval && state.activeAccumulatedMs === 0) {
      state.hasEmittedForCurrentInterval = false;
    }
  }

  function advance(now, environmentState, allowTrigger) {
    const timestamp = normalizeTimestamp(now, 'now');
    state.environmentState = normalizeEnvironmentState(environmentState);

    if (state.lastTickAt == null) {
      state.lastTickAt = timestamp;
      return null;
    }

    const elapsedMs = Math.max(0, timestamp - state.lastTickAt);
    state.lastTickAt = timestamp;

    if (elapsedMs === 0 || !isActivelyCountable()) {
      return null;
    }

    markActiveProgressStarted();
    state.activeAccumulatedMs += elapsedMs;

    if (state.activeAccumulatedMs < state.intervalMs) {
      return null;
    }

    if (!allowTrigger) {
      state.activeAccumulatedMs = state.intervalMs;
      return null;
    }

    // Discard overflow instead of emitting catch-up haikus after long gaps.
    state.activeAccumulatedMs = 0;
    state.lastTriggeredAt = timestamp;
    state.hasEmittedForCurrentInterval = true;

    return {
      type: 'TRIGGER_HAIKU',
      reason: 'active-interval-complete'
    };
  }

  function getSnapshot(now = state.lastTickAt) {
    const timestamp = now == null ? null : normalizeTimestamp(now, 'now');
    const progress = clamp(state.activeAccumulatedMs / state.intervalMs, 0, 1);

    return {
      intervalMs: state.intervalMs,
      activeAccumulatedMs: state.activeAccumulatedMs,
      remainingMs: Math.max(0, state.intervalMs - state.activeAccumulatedMs),
      progress,
      progressPercent: progress * 100,
      lastTickAt: state.lastTickAt,
      paused: state.paused,
      isPaused: state.paused,
      pauseReason: state.pauseReason,
      lastPauseReason: state.lastPauseReason,
      lastResumeReason: state.lastResumeReason,
      isLocked: state.environmentState.isLocked,
      isIdle: state.environmentState.isIdle,
      isSuspended: state.environmentState.isSuspended,
      isInQuietHours: state.environmentState.isInQuietHours,
      isOutsideWorkHours: state.environmentState.isOutsideWorkHours,
      isActivelyCountable: isActivelyCountable(),
      isReadyToTrigger: state.activeAccumulatedMs >= state.intervalMs && !state.hasEmittedForCurrentInterval,
      lastTriggeredAt: state.lastTriggeredAt,
      hasEmittedForCurrentInterval: state.hasEmittedForCurrentInterval,
      now: timestamp
    };
  }

  return {
    start(now) {
      const timestamp = normalizeTimestamp(now, 'now');
      state.activeAccumulatedMs = 0;
      state.lastTickAt = timestamp;
      state.paused = false;
      state.pauseReason = null;
      state.hasEmittedForCurrentInterval = false;
      return getSnapshot(timestamp);
    },

    tick(now, environmentState = DEFAULT_ENVIRONMENT_STATE) {
      return advance(now, environmentState, true);
    },

    pause(now, reason = 'manual') {
      advance(now, state.environmentState, false);
      state.paused = true;
      state.pauseReason = reason;
      state.lastPauseReason = reason;
      return getSnapshot(now);
    },

    resume(now, reason = 'manual') {
      const timestamp = normalizeTimestamp(now, 'now');
      state.lastTickAt = timestamp;
      state.paused = false;
      state.pauseReason = null;
      state.lastResumeReason = reason;
      return getSnapshot(timestamp);
    },

    reset(now) {
      const timestamp = normalizeTimestamp(now, 'now');
      state.activeAccumulatedMs = 0;
      state.lastTickAt = timestamp;
      state.hasEmittedForCurrentInterval = false;
      return getSnapshot(timestamp);
    },

    updateInterval(intervalMs, now) {
      const timestamp = normalizeTimestamp(now, 'now');
      const nextIntervalMs = normalizeInterval(intervalMs);
      const previousProgress = clamp(state.activeAccumulatedMs / state.intervalMs, 0, 1);
      const maxSafeAccumulatedMs = Math.max(0, nextIntervalMs - 1);

      state.intervalMs = nextIntervalMs;
      state.activeAccumulatedMs = Math.min(previousProgress * nextIntervalMs, maxSafeAccumulatedMs);
      state.lastTickAt = timestamp;
      state.hasEmittedForCurrentInterval = false;

      return getSnapshot(timestamp);
    },

    getSnapshot
  };
}

exports.createActiveTimeScheduler = createActiveTimeScheduler;
