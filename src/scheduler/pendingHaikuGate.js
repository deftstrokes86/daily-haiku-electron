function normalizeSafetyState(safetyState = {}) {
  return {
    isSafeToInterrupt: safetyState.isSafeToInterrupt !== false,
    reason: safetyState.reason || safetyState.unsafeReason || null
  };
}

function createPendingHaikuGate(options = {}) {
  let avoidInterruptions = options.avoidInterruptions !== false;
  let hasPendingHaiku = false;
  let pendingSince = null;
  let pendingReason = null;

  function displayEvent(reason, now, source = 'scheduled') {
    return {
      type: 'DISPLAY_HAIKU',
      source,
      reason,
      now
    };
  }

  function deferEvent(reason, now) {
    if (!hasPendingHaiku) {
      hasPendingHaiku = true;
      pendingSince = now;
      pendingReason = reason || 'unsafe-to-interrupt';
    }

    return {
      type: 'DEFER_HAIKU',
      reason: pendingReason,
      now
    };
  }

  function onScheduledDue(safetyState = {}, now = Date.now()) {
    if (!avoidInterruptions) {
      return displayEvent('interruptions-allowed', now);
    }

    const safety = normalizeSafetyState(safetyState);
    if (safety.isSafeToInterrupt) {
      return displayEvent('safe-to-interrupt', now);
    }

    return deferEvent(safety.reason, now);
  }

  function onSafetyChanged(safetyState = {}, now = Date.now()) {
    if (!hasPendingHaiku) return null;

    if (!avoidInterruptions) {
      hasPendingHaiku = false;
      pendingSince = null;
      pendingReason = null;
      return displayEvent('interruptions-allowed', now, 'scheduled-pending');
    }

    const safety = normalizeSafetyState(safetyState);
    if (!safety.isSafeToInterrupt) {
      if (safety.reason) pendingReason = safety.reason;
      return null;
    }

    hasPendingHaiku = false;
    pendingSince = null;
    pendingReason = null;
    return displayEvent('pending-safe-to-display', now, 'scheduled-pending');
  }

  function onManualRequest(now = Date.now()) {
    hasPendingHaiku = false;
    pendingSince = null;
    pendingReason = null;
    return displayEvent('manual-request', now, 'manual');
  }

  function updateSettings(settings = {}) {
    if (settings.avoidInterruptions !== undefined) {
      avoidInterruptions = settings.avoidInterruptions !== false;
    }
  }

  function clearPending() {
    hasPendingHaiku = false;
    pendingSince = null;
    pendingReason = null;
  }

  function getSnapshot() {
    return {
      avoidInterruptions,
      hasPendingHaiku,
      pendingSince,
      pendingReason
    };
  }

  return {
    clearPending,
    getSnapshot,
    onManualRequest,
    onSafetyChanged,
    onScheduledDue,
    updateSettings
  };
}

exports.createPendingHaikuGate = createPendingHaikuGate;
