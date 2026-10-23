/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asDates.ts" enhancement="_blank"/>

// Dates for inputs the ontology types as 'date' or 'timestamp' (pure). The model resolves relative
// words ("amanhã", "sexta") against the TODAY it receives and writes ISO; what reaches the wire is
// always validated here, whether it came from the model or was typed in a round.

export const AS_DATE_TYPES = ['date', 'timestamp'] as const;

export function isDateType(valueType: string): boolean {
  return (AS_DATE_TYPES as readonly string[]).includes(valueType);
}

// 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'D/M/YYYY' | 'DD-MM-YYYY' -> 'YYYY-MM-DD' (a real calendar day) or null
export function parseDateInput(text: string): string | null {
  const value = text.trim();
  let year: number;
  let month: number;
  let day: number;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (match) {
    [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(value);
    if (!match) return null;
    [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  }
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`;
}

// An ISO instant, or a date plus 'HH:mm[:ss]' read in the user's local time -> ISO 8601 (UTC).
// A date alone means the start of that day.
export function parseTimestampInput(text: string): string | null {
  const value = text.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/.test(value)) {
    const instant = new Date(value);
    return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
  }
  const match = /^(.+?)(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(value);
  if (!match) return null;
  const date = parseDateInput(match[1]);
  if (!date) return null;
  const [hours, minutes, seconds] = [Number(match[2] ?? 0), Number(match[3] ?? 0), Number(match[4] ?? 0)];
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds).toISOString();
}

export interface AsToday {
  date: string;      // local 'YYYY-MM-DD'
  weekday: string;   // English weekday name, so the model can resolve "sexta" / "next Monday"
  time: string;      // local 'HH:mm'
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function todayInfo(now: Date = new Date()): AsToday {
  return {
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    weekday: WEEKDAYS[now.getDay()],
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
}

// For the confirmation round: 'DD/MM/YYYY' when the user writes Portuguese, ISO otherwise.
export function formatDateForUser(iso: string, userLanguage: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return (userLanguage || '').toLowerCase().startsWith('pt') ? `${match[3]}/${match[2]}/${match[1]}` : `${match[1]}-${match[2]}-${match[3]}`;
}

export function formatTimestampForUser(iso: string, userLanguage: string): string {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return iso;
  const local = `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`;
  return `${formatDateForUser(local, userLanguage)} ${pad(instant.getHours())}:${pad(instant.getMinutes())}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
