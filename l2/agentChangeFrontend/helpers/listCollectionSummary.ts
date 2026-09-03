/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/listCollectionSummary.ts" enhancement="_blank"/>

/**
 * Collection-summary counts from already-loaded list items. Not a backend aggregate.
 * Overdue is derived: calendar day of dueDate before today and status is not completed/cancelled/canceled.
 */

const TERMINAL_STATUS = /^(completed|cancelled|canceled)$/i;
const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;

/** Calendar day YYYY-MM-DD. A date-only string is that day, not a UTC midnight instant. */
function calendarDay(value: unknown, nowMs?: number): string | null {
  if (typeof value === 'string') {
    const match = DATE_PREFIX.exec(value);
    if (match) return match[1];
  }
  const ms = typeof value === 'number' ? value : nowMs;
  if (ms === undefined || Number.isNaN(ms)) return null;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isOverdueRecord(row: { status?: unknown; dueDate?: unknown }, nowMs = Date.now()): boolean {
  const status = typeof row.status === 'string' ? row.status : '';
  if (TERMINAL_STATUS.test(status)) return false;
  const dueDay = calendarDay(row.dueDate);
  const today = calendarDay(nowMs);
  if (!dueDay || !today) return false;
  return dueDay < today;
}

export function summarizeCollection(
  items: unknown[],
  nowMs = Date.now(),
): { total: number; byStatus: Record<string, number>; overdue: number } {
  const rows = Array.isArray(items) ? items : [];
  const byStatus: Record<string, number> = {};
  let overdue = 0;
  for (const item of rows) {
    const row = item && typeof item === 'object' ? item as { status?: unknown; dueDate?: unknown } : {};
    const status = typeof row.status === 'string' ? row.status : '';
    if (status) byStatus[status] = (byStatus[status] || 0) + 1;
    if (isOverdueRecord(row, nowMs)) overdue += 1;
  }
  return { total: rows.length, byStatus, overdue };
}
