/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imInherit.ts" enhancement="_blank"/>

// Shell detection and the overridable-member map. PURE: takes source text, returns facts.
// No I/O — imResolve reads the files and calls in here.
//
// A molecule is a SHELL when its class extends a molecule imported from ANOTHER project
// (strategy D). Measured on 2026-08-06 across mls-102054 and mls-102055: 84 shells, 70 with an
// empty body, 14 overriding a single property, ZERO overriding render().
//
//   @customElement('groupenternumber--ml-range-slider-brutal')
//   export class RangeSliderBrutal extends RangeSliderMolecule {}
//
// Why the cost ordering below matters: a shell that overrides render() STOPS INHERITING the
// parent — a later fix in the base no longer reaches it. The clarification of route C uses this
// ordering to steer the user to the smallest member that solves the problem.

import { ImInheritance, ImOverridable } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

const NOT_A_SHELL: ImInheritance = {
  isShell: false,
  parentReference: null,
  parentProject: null,
  parentClassName: null,
  ownMembers: [],
  overridableMembers: [],
};

/**
 * The molecule base class every molecule extends. Extending IT is not inheritance in the sense
 * this agent cares about — every molecule does it. Only extending ANOTHER MOLECULE counts.
 */
const BASE_CLASS = 'MoleculeAuraElement';

/** `export class X extends Y {` — Y is what we care about. */
const EXTENDS_RE = /export\s+class\s+(\w+)\s+extends\s+(\w+)\s*\{/;

/** `import { Y } from '/_102040_/l2/molecules/<group>/<name>.js';` */
function findImportOf(source: string, className: string): { reference: string; project: number } | null {
  const re = new RegExp(
    `import\\s*\\{[^}]*\\b${className}\\b[^}]*\\}\\s*from\\s*'(/_(\\d+)_/l2/molecules/[^']+)\\.js'`,
  );
  const m = source.match(re);
  if (!m) return null;
  const project = Number(m[2]);
  if (!Number.isFinite(project)) return null;
  // Back to the reference form used everywhere else: _102040_/l2/molecules/<group>/<name>.ts
  return { reference: `${m[1].replace(/^\//, '')}.ts`, project };
}

/**
 * Members the shell already declares, so the clarification never proposes overriding something
 * it already overrides. Deliberately simple: this is a map for a human choice, not a parser.
 */
function collectOwnMembers(classBody: string): string[] {
  const members = new Set<string>();
  for (const m of classBody.matchAll(/^\s*(?:protected|private|public)?\s*(?:async\s+)?(\w+)\s*[(=]/gm)) {
    const name = m[1];
    if (name && !['if', 'for', 'while', 'switch', 'return', 'constructor'].includes(name)) members.add(name);
  }
  return [...members];
}

/**
 * The cost of overriding a member, cheapest first. `render` is pinned to the top cost because
 * overriding it forfeits ALL future markup fixes from the parent — the trade the user has to see.
 */
function costOf(name: string, kind: 'property' | 'method'): number {
  if (name === 'render') return 100;
  if (kind === 'property') return 1;
  if (/^get[A-Z]/.test(name) || /Template$/.test(name)) return 10;
  return 20;
}

/** Members of the PARENT a shell could override, ordered cheapest first. */
export function overridableMembersOf(parentSource: string): ImOverridable[] {
  const out: ImOverridable[] = [];
  const seen = new Set<string>();

  for (const m of parentSource.matchAll(/^\s*(?:protected|public)\s+(\w+)\s*=/gm)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    out.push({ name: m[1], kind: 'property', cost: costOf(m[1], 'property') });
  }
  for (const m of parentSource.matchAll(/^\s*(?:protected|public)?\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::[^{]+)?\{/gm)) {
    const name = m[1];
    if (!name || seen.has(name)) continue;
    if (['if', 'for', 'while', 'switch', 'catch', 'constructor'].includes(name)) continue;
    // private members cannot be overridden from a subclass
    if (new RegExp(`private\\s+(?:async\\s+)?${name}\\s*\\(`).test(parentSource)) continue;
    seen.add(name);
    out.push({ name, kind: 'method', cost: costOf(name, 'method') });
  }

  return out.sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
}

/**
 * Detects the shell from the molecule's own source.
 *
 * `parentSource` is optional: when absent (the parent lives in another project and may not be
 * readable from here), the shell is still detected and `overridableMembers` comes back empty —
 * the clarification then offers `.less` and "change the parent", but cannot propose a member.
 */
export function detectInheritance(source: string, parentSource = ''): ImInheritance {
  const m = source.match(EXTENDS_RE);
  if (!m) return NOT_A_SHELL;

  const parentClassName = m[2];
  if (parentClassName === BASE_CLASS) return NOT_A_SHELL;

  const parentImport = findImportOf(source, parentClassName);
  if (!parentImport) return NOT_A_SHELL;

  const bodyStart = source.indexOf('{', source.indexOf(m[0]));
  const classBody = bodyStart >= 0 ? source.slice(bodyStart + 1) : '';

  return {
    isShell: true,
    parentReference: parentImport.reference,
    parentProject: parentImport.project,
    parentClassName,
    ownMembers: collectOwnMembers(classBody),
    overridableMembers: parentSource ? overridableMembersOf(parentSource) : [],
  };
}

/**
 * The hard invariant of the whole agent, as a function so the i3-edit gate can assert it.
 * Returns the offending reference when a write would land outside the current project.
 */
export function offendingForeignWrite(references: string[], currentProject: number): string | null {
  for (const reference of references) {
    const m = reference.match(/^_?(\d+)_/);
    if (m && Number(m[1]) !== currentProject) return reference;
  }
  return null;
}
