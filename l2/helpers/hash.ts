/// <mls fileReference="_102020_/l2/helpers/hash.ts" enhancement="_blank"/>

/** Shared L2 digest; independent of any agent's implementation. */
export async function sha256Text(source: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
