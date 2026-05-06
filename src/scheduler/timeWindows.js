const DEFAULT_TIME_WINDOW_SETTINGS = {
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  workHoursOnly: false,
  workdayStart: '09:00',
  workdayEnd: '17:00',
  workdays: [1, 2, 3, 4, 5]
};

function normalizeTimeWindowSettings(settings = {}) {
  return {
    ...DEFAULT_TIME_WINDOW_SETTINGS,
    ...settings,
    workdays: Array.isArray(settings.workdays)
      ? settings.workdays.map(Number).filter((day) => day >= 0 && day <= 6)
      : DEFAULT_TIME_WINDOW_SETTINGS.workdays.slice()
  };
}

function minutesFromTime(value, fallback) {
  const source = typeof value === 'string' ? value : fallback;
  const match = /^(\d{1,2}):(\d{2})$/.exec(source);

  if (!match) return minutesFromTime(fallback, '00:00');

  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return hours * 60 + minutes;
}

function minutesFromDate(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function isWithinWindow(currentMinutes, startMinutes, endMinutes) {
  if (startMinutes === endMinutes) return true;
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

function isWithinQuietHours(date, settings = {}) {
  const normalized = normalizeTimeWindowSettings(settings);
  if (!normalized.quietHoursEnabled) return false;

  return isWithinWindow(
    minutesFromDate(date),
    minutesFromTime(normalized.quietHoursStart, DEFAULT_TIME_WINDOW_SETTINGS.quietHoursStart),
    minutesFromTime(normalized.quietHoursEnd, DEFAULT_TIME_WINDOW_SETTINGS.quietHoursEnd)
  );
}

function isWithinWorkHours(date, settings = {}) {
  const normalized = normalizeTimeWindowSettings(settings);
  if (!normalized.workHoursOnly) return true;
  if (!normalized.workdays.includes(date.getDay())) return false;

  return isWithinWindow(
    minutesFromDate(date),
    minutesFromTime(normalized.workdayStart, DEFAULT_TIME_WINDOW_SETTINGS.workdayStart),
    minutesFromTime(normalized.workdayEnd, DEFAULT_TIME_WINDOW_SETTINGS.workdayEnd)
  );
}

function isEligibleHaikuTime(date, settings = {}) {
  const normalized = normalizeTimeWindowSettings(settings);
  return !isWithinQuietHours(date, normalized) && isWithinWorkHours(date, normalized);
}

exports.DEFAULT_TIME_WINDOW_SETTINGS = DEFAULT_TIME_WINDOW_SETTINGS;
exports.normalizeTimeWindowSettings = normalizeTimeWindowSettings;
exports.isWithinQuietHours = isWithinQuietHours;
exports.isWithinWorkHours = isWithinWorkHours;
exports.isEligibleHaikuTime = isEligibleHaikuTime;
