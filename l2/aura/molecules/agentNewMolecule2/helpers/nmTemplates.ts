/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTemplates.ts" enhancement="_blank"/>

// Deterministic renderers for the molecule artifacts. Pure string functions — everything here is
// a part the model must NOT own:
//
// - the mls headers (file identity: the old flow parsed the model's first line to decide where to
//   save the .ts, so a hallucinated project wrote to the wrong path — lesson M2);
// - the .defs.ts skeleton, including the escaped `skill` literal and the empty `layoutConfig`
//   the Design System process later fills (decision Q7b);
// - the TagName line of the skill (derived from the path, never authored);
// - the playground state substitution.
//
// The byte shape of the .defs.ts matches the real files in mls-102040 (e.g.
// groupviewmetric/ml-metric-card.defs.ts) so the DS agent's update path sees what it expects.

import {
  deriveMoleculeTag,
  escapeSkillLiteral,
  stripLeadingMlsHeader,
  substituteDemoState,
  tagFromFileReference,
  parseMlsFileReference,
  type MoleculeDemoExample,
} from '/_102020_/l2/aura/molecules/shared/moleculeTemplates.js';
import {
  MoleculePlan,
  NM_LESS_ENHANCEMENT,
  NM_TS_ENHANCEMENT,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';

export { deriveMoleculeTag, escapeSkillLiteral, stripLeadingMlsHeader, substituteDemoState, tagFromFileReference, parseMlsFileReference };
export type { MoleculeDemoExample };

// Where an artifact goes. Built once from the confirmed plan so no template re-parses paths.
export interface NmIdentity {
  project: number;
  groupFolder: string;
  groupCanonical: string;
  shortName: string;
  tag: string;
}

export function nmIdentityFromPlan(plan: MoleculePlan): NmIdentity {
  return {
    project: parseMlsFileReference(plan.fileReference)?.project ?? 0,
    groupFolder: plan.group,
    groupCanonical: plan.groupCanonical,
    shortName: plan.shortName,
    tag: plan.tag,
  };
}

export function nmMoleculeRef(id: NmIdentity, suffix: string): string {
  return `_${id.project}_/l2/molecules/${id.groupFolder}/${id.shortName}${suffix}`;
}

// ---- headers (spacing matches the real artifacts in mls-102040) ----

export function nmDefsHeader(id: NmIdentity): string {
  return `/// <mls fileReference="${nmMoleculeRef(id, '.defs.ts')}" enhancement="_blank" />`;
}

export function nmTsHeader(id: NmIdentity): string {
  return `/// <mls fileReference="${nmMoleculeRef(id, '.ts')}" enhancement="${NM_TS_ENHANCEMENT}"/>`;
}

export function nmLessHeader(id: NmIdentity): string {
  return `/// <mls fileReference="${nmMoleculeRef(id, '.less')}" enhancement="${NM_LESS_ENHANCEMENT}"/>`;
}

// ---- .defs.ts ----

export const NM_SKILL_SECTIONS = ['# Metadata', '# Objective', '# Responsibilities', '# Constraints', '# Notes'] as const;

// The tag is derived, so the model's TagName line is REPLACED rather than trusted. When the
// model omitted the Metadata section entirely, prepend it — the section is part of the contract.
export function nmSwapTagNameLine(skillMd: string, tag: string): string {
  const source = skillMd.replace(/^﻿/, '').trim();
  if (/^\s*-\s*TagName:\s*.*$/m.test(source)) {
    return source.replace(/^(\s*-\s*TagName:\s*).*$/m, `$1${tag}`);
  }
  if (source.startsWith('# Metadata')) {
    return source.replace(/^# Metadata[ \t]*\n?/, `# Metadata\n- TagName: ${tag}\n`);
  }
  return `# Metadata\n- TagName: ${tag}\n\n${source}`;
}

// The layout-axis object body, in the byte shape of the real files of mls-102040:
//   export const layoutConfig = {
//     metric: "big-number"
//   };
// Empty stays on one line (`{}`), which is what the 18 axis-less molecules carry.
export function renderLayoutConfigBody(layoutConfig: Record<string, string>): string {
  const entries = Object.entries(layoutConfig || {}).filter(([, value]) => !!value);
  if (!entries.length) return '{}';
  const lines = entries.map(([axis, value]) => `  ${axis}: ${JSON.stringify(value)}`);
  return `{\n${lines.join(',\n')}\n}`;
}

// The full .defs.ts. `layoutConfig` carries the axes confirmed at the checkpoint (decision D7): an
// omitted axis is a WILDCARD for the DS matcher, so an empty bag would make the molecule the group's
// fallback pick — correct only for the 5 groups that have no governing axis. The Design System process
// still owns the field afterwards; it updates the variable when it already exists.
export function renderDefsTs(id: NmIdentity, skillMd: string, layoutConfig: Record<string, string> = {}): string {
  const skill = escapeSkillLiteral(nmSwapTagNameLine(skillMd, id.tag));
  return `${nmDefsHeader(id)}

// Do not change – automatically generated code.

export const group = '${id.groupCanonical}';
// Design-system axes this molecule candidates for (matched by the DS agent).
export const layoutConfig = ${renderLayoutConfigBody(layoutConfig)};

export const skill = \`${skill}\`;
`;
}

// ---- .ts / .less normalization ----

// Enforce the deterministic header, dropping whatever the model produced.
export function normalizeMoleculeTs(raw: string, id: NmIdentity): string {
  const body = stripLeadingMlsHeader(raw).replace(/^\n+/, '');
  return `${nmTsHeader(id)}\n${body}`;
}

export function normalizeLessContent(raw: string, id: NmIdentity): string {
  const body = stripLeadingMlsHeader(raw).replace(/^\n+/, '');
  return `${nmLessHeader(id)}\n${body}`;
}

// ---- group index ----

export function nmGroupIndexTag(id: NmIdentity): string {
  return `molecules--${id.groupFolder}--index-${id.project}`;
}

// index.html is deterministic: just the group index custom element.
export function renderGroupIndexHtml(id: NmIdentity): string {
  const tag = nmGroupIndexTag(id);
  return `<${tag}></${tag}>`;
}
