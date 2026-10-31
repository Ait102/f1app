const LOCALE = 'ru-RU';

/** Date (YYYY-MM-DD) plus optional UTC time (HH:MM:SS[Z]) as a Date; date-only means midnight UTC. */
export function sessionStart(s: { date: string | null; time: string | null }): Date | null {
  if (!s.date) return null;
  const d = new Date(
    s.time ? `${s.date}T${s.time.endsWith('Z') ? s.time : s.time + 'Z'}` : `${s.date}T00:00:00Z`,
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** "UTC+3", "UTC−4:30", "UTC" for the given zone at the given moment. */
export function utcOffsetLabel(timeZone: string, at: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    }).formatToParts(at);
    const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
    const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
    if (!m) return 'UTC';
    if (m[2] === '00' && m[3] === '00') return 'UTC';
    const hours = String(Number(m[2]));
    return `UTC${m[1] === '-' ? '−' : '+'}${hours}${m[3] === '00' ? '' : ':' + m[3]}`;
  } catch {
    return 'UTC';
  }
}

interface FormattedMoment {
  /** Human text in the display zone. */
  text: string;
  /** Original source value, kept for tooltips. */
  utc: string | null;
  hasTime: boolean;
}

export function formatMoment(
  date: string | null,
  time: string | null,
  timeZone: string = localTimeZone(),
): FormattedMoment {
  if (!date) return { text: 'Дата не объявлена', utc: null, hasTime: false };
  const d = sessionStart({ date, time });
  if (!d) return { text: date, utc: date, hasTime: false };

  if (!time) {
    // Date-only values are shown as-is, without shifting into another zone.
    const text = new Intl.DateTimeFormat(LOCALE, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d);
    return { text: `${text}, время не объявлено`, utc: date, hasTime: false };
  }

  const text = new Intl.DateTimeFormat(LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(d);
  return { text, utc: `${date} ${time.replace(/Z$/, '').slice(0, 5)} UTC`, hasTime: true };
}

/** "15 февраля 1998 г." for a YYYY-MM-DD date, without shifting it into another zone. */
export function formatDate(date: string | null): string {
  if (!date) return 'Дата не объявлена';
  const d = sessionStart({ date, time: null });
  if (!d) return date;
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

export function formatDateTime(iso: string, timeZone: string = localTimeZone()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone,
  }).format(d);
}

export function formatPoints(p: number | null): string {
  if (p === null) return '—';
  return p.toLocaleString(LOCALE, { maximumFractionDigits: 1 });
}

export function countdownParts(
  target: Date,
  now: Date,
): { days: number; hours: number; minutes: number } | null {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60000);
  return { days: Math.floor(mins / 1440), hours: Math.floor((mins % 1440) / 60), minutes: mins % 60 };
}

/** "23.456" or "1:02.345" → seconds; null for anything else. */
export function durationSeconds(d: string | null): number | null {
  if (!d) return null;
  const m = /^(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(d.trim());
  if (!m) return null;
  return (m[1] ? Number(m[1]) * 60 : 0) + Number(m[2]);
}
