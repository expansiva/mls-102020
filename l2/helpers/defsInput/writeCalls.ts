/// <mls fileReference="_102020_/l2/helpers/defsInput/writeCalls.ts" enhancement="_blank"/>

/** A `call` row of integration.defs. Only `direction: "call"` cites a step in `usedBy`. */
export interface D2CallConnection {
  direction?: string;
  operationId?: string;
  usedBy?: readonly string[];
}

/** `journeyId.stepId` → sorted operationIds. A step cited by no call has no entry. */
export function d2CallSetsByStep(connections: readonly D2CallConnection[]): ReadonlyMap<string, readonly string[]> {
  const sets = new Map<string, Set<string>>();
  for (const row of connections) {
    if ((row.direction ?? '').trim() !== 'call') continue;
    const operationId = (row.operationId ?? '').trim();
    if (!operationId) continue;
    for (const used of row.usedBy ?? []) {
      const step = used.trim();
      if (!step) continue;
      const bucket = sets.get(step) ?? new Set<string>();
      bucket.add(operationId);
      sets.set(step, bucket);
    }
  }
  return new Map([...sets].map(([step, ids]) => [step, [...ids].sort()]));
}

/** Calls of one `from` entry. `journey:<journeyId>/<stepId>` is the needs shape; anything else has none. */
export function d2CallsForFrom(from: string, sets: ReadonlyMap<string, readonly string[]>): readonly string[] {
  if (!from.startsWith('journey:')) return [];
  const step = from.slice('journey:'.length).replace('/', '.');
  return sets.get(step) ?? [];
}

export function d2CallSignature(calls: readonly string[]): string {
  return [...calls].sort().join('\0');
}
