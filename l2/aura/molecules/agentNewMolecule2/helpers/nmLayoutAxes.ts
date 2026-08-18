/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmLayoutAxes.ts" enhancement="_blank"/>

// Layout-axis vocabulary bridge (pure — node-testable; designSystemAuraBase has no runtime imports).
//
// `layoutConfig` in a molecule's .defs.ts declares which layout-rule axis VALUES the molecule
// candidates for. The Design System matcher (dsMatch/matchVariant) ANDs over the declared axes,
// treats an omitted axis as a wildcard, and breaks ties by specificity and then catalog order.
//
// Two consequences drive everything here, and they are the reason this file exists:
// - an EMPTY layoutConfig is not neutral: it makes the molecule a specificity-0 wildcard, i.e. the
//   group's fallback pick, chosen by alphabetical order. Measured: the 18 empty ones in mls-102040 are
//   ALL in the 5 groups that have no governing axis, and ZERO are in a group that has one.
// - `buildMoleculeCatalog.sanitizeLayoutConfig` drops an invalid axis or value with only a
//   console.warn, so creation time is the only place a typo can be caught.

import {
  layoutAxes,
  layoutAxisKeys,
  isValidAxisValue,
  type ILayoutAxisDef,
  type LayoutAxisKey,
} from '/_102020_/l2/aura/helpers/designSystemAuraBase.js';
import { NmGateIssue } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n1-bootstrap/gate.js';

// The value that means "this molecule works under ANY value of this axis" — the axis is then omitted
// from layoutConfig. Used as the empty option of the checkpoint's select.
export const NM_AXIS_WILDCARD = '';

export interface NmAxisCandidate {
  key: string;
  label: string;
  section: string;
  values: readonly string[];
  default: string;
  /** true for the input-transversal axes (labelPlacement/validation/requiredMark). */
  transversal: boolean;
}

function axisDef(key: string): ILayoutAxisDef | undefined {
  return (layoutAxes as Record<string, ILayoutAxisDef>)[key];
}

// A page-wide axis (`density`, `motion`) declares no `groups`. It is implemented globally via DS
// tokens, but a molecule MAY still declare it as a discriminator — measured in groupViewTable, where
// ml-data-table declares `comfortable` and ml-data-table-minimal declares `compact`.
export function nmIsPageWideAxis(key: string): boolean {
  const def = axisDef(key);
  return !!def && !def.groups;
}

// Case-insensitive on purpose: the same group is spelled `groupEnterDateTimeInterval` in
// skills/index.ts and `groupEnterDatetimeInterval` in the axis vocabulary, and the .defs corpus
// carries both. An exact comparison would reject a legitimate declaration.
export function nmAxisGovernsGroup(key: string, groupCanonical: string): boolean {
  const def = axisDef(key);
  if (!def || !def.groups) return false;
  const wanted = (groupCanonical || '').toLowerCase();
  return def.groups.some(group => group.toLowerCase() === wanted);
}

// The axes the checkpoint offers for this group, in vocabulary order. Empty for the 5 groups that have
// no governing axis (groupEnterNumberInterval, groupLocatePosition, groupPlayMedia, groupViewChart,
// groupScanCode) — for those, an empty layoutConfig is the only correct answer.
export function nmCandidateAxes(groupCanonical: string): NmAxisCandidate[] {
  return layoutAxisKeys
    .filter(key => nmAxisGovernsGroup(key, groupCanonical))
    .map(key => {
      const def = layoutAxes[key as LayoutAxisKey] as ILayoutAxisDef;
      return {
        key,
        label: def.label,
        section: def.section,
        values: def.values,
        default: def.default,
        transversal: !!def.inputTransversal,
      };
    });
}

export interface NmLayoutConfigNormalized {
  config: Record<string, string>;
  dropped: string[];   // what code discarded and why — recorded in the trace
}

// Keeps only string pairs, trims, and drops the wildcard marker (an axis set to "any" is simply
// absent). Validation is the gate's job, not this function's.
export function nmNormalizeLayoutConfig(raw: unknown): NmLayoutConfigNormalized {
  const config: Record<string, string> = {};
  const dropped: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { config, dropped };
  for (const [axis, value] of Object.entries(raw as Record<string, unknown>)) {
    const key = axis.trim();
    if (!key) continue;
    if (typeof value !== 'string') {
      dropped.push(`${key}: not a string`);
      continue;
    }
    const clean = value.trim();
    if (!clean || clean === NM_AXIS_WILDCARD) continue; // wildcard: omit the axis
    config[key] = clean;
  }
  return { config, dropped };
}

// The 4 gate codes, each measured to have 0 counterexamples across the 146 .defs.ts of mls-102040.
export function runNmLayoutConfigGate(config: Record<string, string>, groupCanonical: string): NmGateIssue[] {
  const issues: NmGateIssue[] = [];
  const candidates = nmCandidateAxes(groupCanonical);
  const candidateKeys = new Set(candidates.map(axis => axis.key));

  for (const [axis, value] of Object.entries(config)) {
    const def = axisDef(axis);
    if (!def) {
      issues.push({
        code: 'axis_unknown',
        message: `'${axis}' is not a layout axis — the DS catalog would drop it with a console.warn and the molecule would silently become a wildcard on it. Known axes: ${layoutAxisKeys.join(', ')}`,
      });
      continue;
    }
    if (!isValidAxisValue(axis, value)) {
      issues.push({
        code: 'axis_value',
        message: `'${value}' is not a value of the axis '${axis}' — allowed: ${def.values.join(', ')}`,
      });
    }
    // A page-wide axis is exempt: it has no `groups` by design, and declaring it is a legitimate
    // discriminator (measured in groupViewTable).
    if (!nmIsPageWideAxis(axis) && !candidateKeys.has(axis)) {
      issues.push({
        code: 'axis_not_governing',
        message: `the axis '${axis}' does not govern '${groupCanonical}' — declaring it filters the molecule by an unrelated preference. Axes for this group: ${candidates.map(item => item.key).join(', ') || '(none)'}`,
      });
    }
  }

  // Declaring only a page-wide axis does NOT satisfy this: the molecule would stay a wildcard on the
  // very axis that distinguishes it from its siblings in the group.
  const declaredGoverning = Object.keys(config).filter(axis => candidateKeys.has(axis));
  if (candidates.length && !declaredGoverning.length) {
    issues.push({
      code: 'axis_required',
      message: `'${groupCanonical}' is governed by ${candidates.map(item => item.key).join(', ')} — declare at least one, or the molecule becomes the group's fallback wildcard (chosen by alphabetical order). Omit an axis only when the molecule genuinely works under every one of its values.`,
    });
  }

  return issues;
}

// Pretty one-line summary for a step title / trace: 'metric: big-number, density: compact' or '(any)'.
export function nmLayoutConfigSummary(config: Record<string, string>): string {
  const entries = Object.entries(config);
  if (!entries.length) return '(any)';
  return entries.map(([axis, value]) => `${axis}: ${value}`).join(', ');
}
