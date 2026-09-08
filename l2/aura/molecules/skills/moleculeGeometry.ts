/// <mls fileReference="_102020_/l2/aura/molecules/skills/moleculeGeometry.ts" enhancement="_blank"/>

// The registry of SHARED geometry concepts a molecule sheet may need — a spinner, a skeleton — that
// the design system does not cover and more than one molecule is proven to need. The companion of
// skills/tokenVocabulary: the skill tells the agent the two-level naming convention (concept vs
// molecule prefix), this module hands it the concrete names and canonical fallback values to use.
//
// SHARED because two gates judge the same kind of coined token and must not disagree about which
// concepts are registered — agentNewMolecule2/n5-less (judges the whole sheet, it just wrote it) and
// agentImproveMolecule2/i3-edit (judges only what an edit introduced). Same precedent as
// skills/canonicalFallbacks.ts: a module this small lives beside the skill both steps already receive.
//
// WHY ONLY THESE 4, out of 18 tokens molecules coined on their own (measured 2026-09-04, full
// derivation in the "geometry tokens" analysis): the other 14 are either not geometry (2 are colour
// wearing a shadow/ring position — a design-system gap, not this), already covered by an existing
// design-system role at the same value (2 — a migration, not a registry entry), or proven specific to
// one molecule's own anatomy (10 — a slider's knob/track/tooltip, a table's resize handle — nothing
// else in the library has one). These 4 are the ones with PROVEN recurrence: a Studio run coined
// `--ml-button-group-spinner-size`/`-duration` for the exact concept `ml-number-range-slider.less`
// already names `--ml-spinner-size`/`-duration`, same values, different spelling — the waste this
// registry exists to prevent. `--ml-spinner-border-width` and `--ml-skeleton-duration` join by
// adjacency (same subject: what a molecule shows while it waits), not by their own measured
// recurrence — a registry covering half a subject invites coining the other half.
//
// Values are the ones the library already renders with (verified in ml-number-range-slider.less) —
// NOT rounded or converted (16px, never 1rem): the fallback is what a molecule renders with no design
// system, and changing it changes what ships today.

export interface GeometryConcept {
  /** The full custom-property name, e.g. '--ml-spinner-size'. */
  token: string;
  /** The token's suffix without the '--ml-' prefix — what a gate compares a coined token's tail against. */
  concept: string;
  /** The canonical fallback value, verbatim from the library — never rounded or converted. */
  value: string;
  purpose: string;
}

export const GEOMETRY_REGISTRY: ReadonlyArray<GeometryConcept> = [
  { token: '--ml-spinner-size', concept: 'spinner-size', value: '16px', purpose: 'diameter of the loading spinner' },
  { token: '--ml-spinner-duration', concept: 'spinner-duration', value: '0.8s', purpose: 'one full turn of the spinner' },
  { token: '--ml-spinner-border-width', concept: 'spinner-border-width', value: '2px', purpose: 'thickness of the spinner ring' },
  { token: '--ml-skeleton-duration', concept: 'skeleton-duration', value: '1.5s', purpose: 'one cycle of the skeleton shimmer' },
];

/** The markdown table of token -> value -> purpose, header row included. */
export function geometryRegistryRows(): string {
  return [
    '| token | value | purpose |',
    '|---|---|---|',
    ...GEOMETRY_REGISTRY.map(({ token, value, purpose }) => `| \`${token}\` | \`${value}\` | ${purpose} |`),
  ].join('\n');
}
