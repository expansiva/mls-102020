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

/** Codes that would paint as themselves because the L4 has no label entry. */
export function missingEnumDisplayCodes(codes: readonly string[], labels?: readonly CfeEnumLabel[]): string[] {
  const have = new Set((labels || []).map(item => item.code));
  return codes.filter(code => Boolean(code) && !have.has(code));
}

/**
 * Non-blocking CF degradation: an enumerated field arrived without enumLabels (and status without
 * lifecycleLabels). The page still renders the stored code; the wire still sends the code.
 */
export function enumLabelFallbackWarnings(entity: {
  entityId: string;
  fields: Array<{ fieldId: string; enum?: string[]; enumLabels?: CfeEnumLabel[] }>;
  lifecycleLabels?: CfeEnumLabel[];
}): string[] {
  const warnings: string[] = [];
  for (const field of entity.fields) {
    const codes = field.enum || [];
    if (!codes.length) continue;
    const labels = field.enumLabels?.length
      ? field.enumLabels
      : /(^|[a-z0-9])status$/i.test(field.fieldId) ? entity.lifecycleLabels : undefined;
    const missing = missingEnumDisplayCodes(codes, labels);
    if (!missing.length) continue;
    warnings.push(
      `entity ${entity.entityId} field ${field.fieldId}: closed-domain display falls back to the stored code (${missing.join(', ')}) because l4 has no enumLabels/lifecycleLabels; wire still sends the code`,
    );
  }
  return warnings;
}
