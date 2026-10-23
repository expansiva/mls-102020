/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/hash.ts" enhancement="_blank"/>

// Copy, private to agentMaterializeL2 (from l2/helpers/hash.ts, 05/10/2026).

/**
 * JSON with the object keys sorted, so a hash of DATA does not move when code builds the same object in another order.
 * The reuse fingerprints hash data this way, never the text an agent renders from it (22/10/2026: a change of how the L4
 * slice is written, or of a prompt, must not regenerate what the defs did not change).
 */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => (item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
    : item));
}

/** Shared L2 digest; independent of any agent's implementation. */
export async function sha256Text(source: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
