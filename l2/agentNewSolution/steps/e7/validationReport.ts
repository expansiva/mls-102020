export const NS4_E7_VALIDATION_REPORT_VERSION = '2026-08-12-ns4-e7-validation-report-v4' as const;

interface Ns4E7ValidationAttemptLike { round: number; }

export function isNs4E7ValidationReport(value: unknown, moduleName: string): value is {
  schemaVersion: typeof NS4_E7_VALIDATION_REPORT_VERSION;
  moduleName: string;
  attempts: Ns4E7ValidationAttemptLike[];
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const report = value as Record<string, unknown>;
  return report.schemaVersion === NS4_E7_VALIDATION_REPORT_VERSION
    && report.moduleName === moduleName
    && Array.isArray(report.attempts)
    && report.attempts.every(attempt => !!attempt && typeof attempt === 'object'
      && !Array.isArray(attempt) && Number.isInteger((attempt as Record<string, unknown>).round));
}

export function mergeNs4E7ValidationAttempts<T extends Ns4E7ValidationAttemptLike>(previous: readonly T[], attempt: T): T[] {
  return [...previous.filter(item => item.round !== attempt.round), attempt]
    .sort((left, right) => left.round - right.round);
}
