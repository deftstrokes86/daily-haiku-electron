import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  isEligibleHaikuTime,
  isWithinQuietHours,
  isWithinWorkHours
} = require('../src/scheduler/timeWindows.js');

function localDate(day, time) {
  return new Date(`2026-05-${day}T${time}:00`);
}

describe('time window rules', () => {
  it('handles quiet hours crossing midnight', () => {
    const settings = { quietHoursEnabled: true, quietHoursStart: '22:00', quietHoursEnd: '08:00' };

    expect(isWithinQuietHours(localDate('04', '23:00'), settings)).toBe(true);
    expect(isWithinQuietHours(localDate('05', '07:30'), settings)).toBe(true);
    expect(isWithinQuietHours(localDate('05', '09:00'), settings)).toBe(false);
  });

  it('handles a normal same-day quiet window', () => {
    const settings = { quietHoursEnabled: true, quietHoursStart: '13:00', quietHoursEnd: '15:00' };

    expect(isWithinQuietHours(localDate('05', '12:59'), settings)).toBe(false);
    expect(isWithinQuietHours(localDate('05', '13:00'), settings)).toBe(true);
    expect(isWithinQuietHours(localDate('05', '14:59'), settings)).toBe(true);
    expect(isWithinQuietHours(localDate('05', '15:00'), settings)).toBe(false);
  });

  it('allows work hours Monday to Friday', () => {
    const settings = {
      workHoursOnly: true,
      workdayStart: '09:00',
      workdayEnd: '17:00',
      workdays: [1, 2, 3, 4, 5]
    };

    expect(isWithinWorkHours(localDate('04', '09:00'), settings)).toBe(true);
    expect(isWithinWorkHours(localDate('06', '12:00'), settings)).toBe(true);
    expect(isWithinWorkHours(localDate('08', '16:59'), settings)).toBe(true);
    expect(isWithinWorkHours(localDate('08', '17:00'), settings)).toBe(false);
  });

  it('excludes weekends from work-hours-only mode', () => {
    const settings = {
      workHoursOnly: true,
      workdayStart: '09:00',
      workdayEnd: '17:00',
      workdays: [1, 2, 3, 4, 5]
    };

    expect(isWithinWorkHours(localDate('09', '11:00'), settings)).toBe(false);
    expect(isEligibleHaikuTime(localDate('10', '11:00'), settings)).toBe(false);
  });

  it('treats disabled settings as eligible', () => {
    const settings = {
      quietHoursEnabled: false,
      quietHoursStart: '00:00',
      quietHoursEnd: '23:59',
      workHoursOnly: false,
      workdayStart: '09:00',
      workdayEnd: '17:00',
      workdays: []
    };

    expect(isWithinQuietHours(localDate('05', '12:00'), settings)).toBe(false);
    expect(isWithinWorkHours(localDate('10', '02:00'), settings)).toBe(true);
    expect(isEligibleHaikuTime(localDate('10', '02:00'), settings)).toBe(true);
  });
});
