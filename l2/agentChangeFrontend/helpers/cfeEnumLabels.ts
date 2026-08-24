/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeEnumLabels.ts" enhancement="_blank"/>

/** Closed-domain display pair copied from l4 `enumLabels` / `lifecycleLabels`. */
export interface CfeEnumLabel {
  code: string;
  label: string;
}

export function readEnumLabels(value: unknown): CfeEnumLabel[] {
  if (!Array.isArray(value)) return [];
  const out: CfeEnumLabel[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    const code = typeof rec.code === 'string' ? rec.code.trim() : '';
    const label = typeof rec.label === 'string' ? rec.label.trim() : '';
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push({ code, label: label || code });
  }
  return out;
}

/** Prefer the authored label; fall back to the stored code when the L4 has none. */
export function enumDisplayLabel(code: string, labels?: readonly CfeEnumLabel[]): string {
  if (!code) return code;
  const found = labels?.find(item => item.code === code);
  return found?.label || code;
}

export function enumDisplayOptions(codes: readonly string[], labels?: readonly CfeEnumLabel[]): { value: string; label: string }[] {
  return codes.map(code => ({ value: code, label: enumDisplayLabel(code, labels) }));
}
