/// <mls fileReference="_102020_/l2/aura/molecules/skills/libraryFallbacks.ts" enhancement="_blank"/>

// The LEDGER of the library — the fallback value each design-system role ALREADY reads across the
// sheets of mls-102040 today. The companion of skills/canonicalFallbacks: that module gives the
// TEMPLATE's value, this one gives what the LIBRARY looks like today with no design system.
//
// Why this exists: agentImproveMolecule2/i3-edit, migrating a sheet, cannot obey "keep the fallback
// the sheet already used" — every role is introduced fresh in a migration. Without this table the
// model unifies two different concepts into one role, changing a VALUE to make the gate's message
// go away. Measured on the groupEnterMoney pilot (see
// todo/moleculetokens/todo-gate-fallback-migracao.md): a focus border lost its highlight because the
// retry rewrote `--focus-ring` to `--border-default`'s value instead of leaving the site on its own
// role.
//
// MATERIALIZED, not scanned at runtime: the agent runs in the Studio and does not have the sheets of
// mls-102040 on disk. `harness/gen-library-fallbacks.mjs` scans mls-102040 and regenerates the array
// below — never hand-edit it, regenerate it.

export interface LibraryFallbackEntry {
  /** The DS role name, without its leading `--`. */
  role: string;
  /** The fallback value every site in the library agrees on for this role. */
  value: string;
  /** How many `var()` sites in the library read this role. */
  sites: number;
}

// GENERATED — start (harness/gen-library-fallbacks.mjs)
export const LIBRARY_FALLBACKS: LibraryFallbackEntry[] = [
  { role: 'border-default', value: "#e2e8f0", sites: 7 },
  { role: 'border-default-disabled', value: "#e2e8f0", sites: 1 },
  { role: 'border-default-focus', value: "#e2e8f0", sites: 1 },
  { role: 'border-default-hover', value: "#e2e8f0", sites: 1 },
  { role: 'button-danger-bg', value: "#ef4444", sites: 2 },
  { role: 'button-danger-bg-hover', value: "#ff4a4a", sites: 2 },
  { role: 'button-danger-text', value: "#ffffff", sites: 1 },
  { role: 'button-primary-bg', value: "#3b82f6", sites: 10 },
  { role: 'button-primary-bg-hover', value: "#408fff", sites: 4 },
  { role: 'button-primary-text', value: "#ffffff", sites: 7 },
  { role: 'button-secondary-bg', value: "#ffffff", sites: 6 },
  { role: 'button-secondary-bg-hover', value: "#f5f5f5", sites: 8 },
  { role: 'button-secondary-border', value: "#e2e8f0", sites: 7 },
  { role: 'button-secondary-border-hover', value: "#e2e8f0", sites: 6 },
  { role: 'button-secondary-text', value: "#1c1b1f", sites: 8 },
  { role: 'focus-ring', value: "rgba(59, 130, 246, 0.4)", sites: 12 },
  { role: 'font-family-primary', value: "system-ui, -apple-system, sans-serif", sites: 34 },
  { role: 'font-weight-bold', value: "500", sites: 11 },
  { role: 'link-text', value: "#3b82f6", sites: 5 },
  { role: 'link-text-hover', value: "#3b82f6", sites: 1 },
  { role: 'radius-small', value: "6px", sites: 10 },
  { role: 'selected-bg', value: "#f5f5f5", sites: 5 },
  { role: 'selected-bg-hover', value: "#f5f5f5", sites: 1 },
  { role: 'selected-border', value: "#3b82f6", sites: 5 },
  { role: 'selected-border-hover', value: "#3b82f6", sites: 1 },
  { role: 'selected-text', value: "#3b82f6", sites: 1 },
  { role: 'selected-text-hover', value: "#3b82f6", sites: 1 },
  { role: 'shadow-medium', value: "0 4px 6px rgba(0, 0, 0, 0.1)", sites: 4 },
  { role: 'shadow-small', value: "0 1px 3px rgba(0, 0, 0, 0.1)", sites: 4 },
  { role: 'status-error-bg', value: "#f5f5f5", sites: 4 },
  { role: 'status-error-text', value: "#ef4444", sites: 4 },
  { role: 'status-success-bg', value: "#ecfdf5", sites: 4 },
  { role: 'status-success-text', value: "#16a34a", sites: 4 },
  { role: 'status-warning-bg', value: "#fffbeb", sites: 4 },
  { role: 'status-warning-text', value: "#d97706", sites: 4 },
  { role: 'surface-alt-bg', value: "#f5f5f5", sites: 14 },
  { role: 'surface-bg', value: "#ffffff", sites: 7 },
  { role: 'text-muted', value: "#49454f", sites: 13 },
  { role: 'text-muted-disabled', value: "#79747e", sites: 6 },
  { role: 'text-strong', value: "#1c1b1f", sites: 14 },
  { role: 'transition-fast', value: "200ms ease", sites: 23 },
];
// GENERATED — end

/**
 * The markdown table of role -> the value the library ALREADY reads, header row included.
 *
 * Only roles with a CONSISTENT fallback across every site ship here — a role read with two
 * different values in the library is a pre-existing divergence (harness/check-ds-tokens.mjs catches
 * it) and does not belong in a table meant to be followed as ground truth.
 */
export function libraryFallbackRows(): string {
  if (!LIBRARY_FALLBACKS.length) return '(the ledger is empty — run `node harness/gen-library-fallbacks.mjs --write`)';
  return [
    '| Role | Value in the library today | Sites |',
    '|------|------------------------------|-------|',
    ...LIBRARY_FALLBACKS.map(e => `| \`--${e.role}\` | \`${e.value}\` | ${e.sites} |`),
  ].join('\n');
}
