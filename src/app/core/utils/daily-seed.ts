/** Deterministic "one per day" selection shared by every player. */

/** Local calendar day as YYYY-MM-DD. */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, 12);
}

export function previousDateKey(key: string): string {
  const date = parseKey(key);
  date.setDate(date.getDate() - 1);
  return localDateKey(date);
}

const DAILY_EPOCH = '2026-01-01';

/** 1-based puzzle number shown in share text. */
export function dailyPuzzleNumber(key: string): number {
  const ms = parseKey(key).getTime() - parseKey(DAILY_EPOCH).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

/** FNV-1a 32-bit hash. */
export function hashString(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Same item for everyone on a given day (items must be in a stable order). */
export function pickDaily<T>(items: readonly T[], dateKey: string, salt = 'daily-country'): T | null {
  if (items.length === 0) {
    return null;
  }
  return items[hashString(`${salt}:${dateKey}`) % items.length] ?? null;
}
