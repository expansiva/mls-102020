/// <mls fileReference="_102020_/l2/aura/molecules/skills/canonicalFallbacks.ts" enhancement="_blank"/>

// The canonical FALLBACK VALUE of every design-system role, read from DEFAULT_TOKENS_TEMPLATE — the
// same constant that GENERATES a project's designSystem.ts. The companion of skills/tokenVocabulary:
// the skill hands the agent the role NAMES and the rules, this module hands it the VALUES, so a
// fallback is looked up instead of invented.
//
// SHARED because two agents write the same kind of file and must not disagree about what the library
// looks like with no design system:
//
// - agentNewMolecule2/n5-less (NEUTRAL mode) — creates a sheet, so the canonical value IS the answer;
// - agentImproveMolecule2/i3-edit — EDITS a sheet, so the canonical value is only for a role the edit
//   INTRODUCES; a role the sheet already reads keeps the fallback it already uses.
//
// That difference lives in each agent's prose. Only the table is shared — it was duplicated for one
// day and the TODO that created this module (todo/moleculetokens/todo-ajuste-im2-template.md) says
// plainly: duplicating is acceptable, letting the two diverge is not.
//
// MEASURED on the 2026-09-03 Studio run, before any of this existed: two molecules generated in the
// same session disagreed on the fallback of 6 roles (`--text-default` #37323d vs #374151), and one
// sheet disagreed with ITSELF on `--border-subtle` nine lines apart. With the table injected into
// n5-less the next run gave 0 divergence across 92 `var()` sites.

import { DEFAULT_TOKENS_TEMPLATE } from '/_102029_/l2/designSystemBase.js';

/**
 * The markdown table of role -> canonical fallback, header row included.
 *
 * Only the base colour roles are listed: the `-hover`/`-focus`/`-disabled` variants follow the same
 * value pattern and listing all 176 keys would bury the table. The `_dark-` keys are the dark theme's
 * override, not a fallback a sheet ever writes.
 */
export function canonicalFallbackRows(): string {
  // The scale tokens carry LESS expressions (`calc(@space-base-unit * 2)`). The runtime rewrites
  // `@token` into `var(--token)` when it compiles the design system, but a molecule sheet is
  // compiled on its own — `@space-base-unit` is undefined there and `lessc` fails with a NameError.
  // Verified: `var(--font-size-12, calc(@font-base-unit * 3))` does not compile. So resolve the
  // expression against its base unit and hand over a concrete value.
  const resolveScale = (value: string, source: Record<string, string>): string => {
    const match = value.match(/^calc\(\s*@([\w-]+)\s*\*\s*([\d.]+)\s*\)$/);
    if (!match) return value;
    const base = source[match[1]];
    const baseMatch = base?.match(/^([\d.]+)([a-z%]*)$/);
    if (!baseMatch) return value;
    const amount = Number(baseMatch[1]) * Number(match[2]);
    return `${Number(amount.toFixed(4))}${baseMatch[2]}`;
  };

  const rows: string[] = [];
  const push = (source: Record<string, string>, skipStates: boolean): void => {
    for (const [name, value] of Object.entries(source)) {
      if (name.startsWith('_dark-')) continue;
      if (skipStates && /-(hover|focus|disabled)$/.test(name)) continue;
      if (/-base-unit$/.test(name)) continue; // an internal of the scale, never read by a sheet
      rows.push(`| \`--${name}\` | \`${resolveScale(value, source)}\` |`);
    }
  };
  push(DEFAULT_TOKENS_TEMPLATE.color, true);
  push(DEFAULT_TOKENS_TEMPLATE.global, false);
  push(DEFAULT_TOKENS_TEMPLATE.typography, false);

  return [
    '| Role | Fallback |',
    '|------|----------|',
    ...rows,
  ].join('\n');
}
