/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeSessionScope.ts" enhancement="_blank"/>

/**
 * Session-memo bag used by the CF create run (ux-variants, run cache, diagnostics, esbuild instance).
 *
 * Capability, never host: when a browser global object is present it is used (same object, same keys
 * as the previous `window[...]` writes). When it is absent, `globalThis` holds the memo. The memo
 * logic does not branch.
 */
export function sessionScope(): Record<string, unknown> {
  const browser = (globalThis as Record<string, unknown>)['window'];
  if (browser && typeof browser === 'object') return browser as Record<string, unknown>;
  return globalThis as unknown as Record<string, unknown>;
}
