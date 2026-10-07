import { reminderTimes } from './reminder.service';

describe('reminderTimes', () => {
  it('fires today when the hour is ahead and the daily is not solved', () => {
    const now = new Date(2026, 9, 7, 10, 0);
    const [first, second] = reminderTimes(now, 19, false);
    expect(first!.getDate()).toBe(7);
    expect(first!.getHours()).toBe(19);
    expect(second!.getDate()).toBe(8);
  });

  it('skips to tomorrow when already solved or the hour passed', () => {
    expect(reminderTimes(new Date(2026, 9, 7, 10, 0), 19, true)[0]!.getDate()).toBe(8);
    expect(reminderTimes(new Date(2026, 9, 7, 20, 0), 19, false)[0]!.getDate()).toBe(8);
  });
});
