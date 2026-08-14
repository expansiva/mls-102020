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

import { ImInheritance, ImOverridable, ImUnreachable } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

const NOT_A_SHELL: ImInheritance = {
  isShell: false,
  parentReference: null,
  parentProject: null,
  parentClassName: null,
  ownMembers: [],
  overridableMembers: [],
  unreachableMembers: [],
};

/**
 * Custom-element and Lit lifecycle hooks. They REMAIN overridable — a shell may legitimately
 * intercept one — but they are not where a parent implements a behaviour, so they must never head a
 * list ordered "cheapest first".
 *
 * Measured on 2026-08-13: `disconnectedCallback` sat at cost 20, led the list of a parent whose every
 * other method is private, and was suggested as the place to change a timer duration held in a module
 * constant. Ranking it just under render() is the code-side half of that fix; the other half is
 * `unreachableMembersOf` below.
 */
export const IM_LIFECYCLE_HOOKS = [
  'connectedCallback',
  'disconnectedCallback',
  'attributeChangedCallback',
  'adoptedCallback',
  'willUpdate',
  'update',
  'firstUpdated',
  'updated',
];

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
    if (name && !NOT_A_MEMBER.includes(name)) members.add(name);
  }
  return [...members];
}

/**
 * Keywords the member regex above can match at the start of a line. `super` joined the list on
 * 2026-08-14: a shell whose constructor calls `super()` reported `super` as one of its own members,
 * which was harmless for the clarification but not for `deadShellMembers`, which judges this list.
 */
const NOT_A_MEMBER = ['if', 'for', 'while', 'switch', 'return', 'constructor', 'super'];

/** The text inside the class braces — where a member declaration can appear. */
function classBodyOf(source: string): string {
  const m = source.match(EXTENDS_RE);
  if (!m) return '';
  const bodyStart = source.indexOf('{', source.indexOf(m[0]));
  return bodyStart >= 0 ? source.slice(bodyStart + 1) : '';
}

/**
 * Is `name` READ anywhere in the shell? A declaration is not a read, and neither is an assignment:
 * `protected foo = 3000` followed by `this.foo = 3000` is two writes to something nobody consults.
 */
function isReadInShell(name: string, shellSource: string): boolean {
  const word = new RegExp(`\\b${name}\\b`);
  const declaration = new RegExp(
    `^\\s*(?:public|private|protected)?\\s*(?:static\\s+)?(?:readonly\\s+)?(?:async\\s+)?${name}\\s*[(:=;]`,
  );
  const assignment = new RegExp(`this\\.${name}\\s*=[^=]`);
  for (const line of shellSource.split('\n')) {
    if (!word.test(line)) continue;
    if (declaration.test(line)) continue;
    if (assignment.test(line)) continue;
    return true;
  }
  return false;
}

/**
 * Members the SHELL declares that CANNOT be doing anything: absent from the parent, and never read —
 * not in the shell, not in the parent.
 *
 * ⚠️ WHY THIS EXISTS — 2026-08-14, measured in the Studio. Asked to make a copy confirmation last 3
 * seconds, the model wrote `protected copiedDurationMs = 3000` into the shell. The parent holds that
 * duration in a module-scope `const` and has no such member, so nothing read the field and the button
 * went on confirming for 2000ms. It compiled, so no gate saw it; the run reported success; and the run
 * AFTER it read the contract the first one had edited and agreed there was a defect to fix.
 *
 * An override that overrides nothing is the shape a model reaches for when it is asked to override a
 * parent it cannot see. Fixing the prompt (i3-edit shows the parent on every shell now) removes the
 * reason; this removes the possibility.
 *
 * Textual, like everything else in this file. A name the parent so much as mentions is left alone:
 * the question here is "did this come out of nowhere", not "is it a valid override".
 */
export function deadShellMembers(shellSource: string, parentSource: string): string[] {
  // Shells only. Every molecule extends the base class and declares members of its own — judging
  // those against "the parent" would call `slotTags` invented on any molecule in the library.
  const extended = shellSource.match(EXTENDS_RE);
  if (!extended || extended[2] === BASE_CLASS) return [];

  const body = classBodyOf(shellSource);
  if (!body) return [];
  return collectOwnMembers(body).filter(name =>
    !new RegExp(`\\b${name}\\b`).test(parentSource) && !isReadInShell(name, shellSource));
}

/**
 * The cost of overriding a member, cheapest first. `render` is pinned to the top cost because
 * overriding it forfeits ALL future markup fixes from the parent — the trade the user has to see.
 */
function costOf(name: string, kind: 'property' | 'method'): number {
  if (name === 'render') return 100;
  if (IM_LIFECYCLE_HOOKS.includes(name)) return 90;
  if (kind === 'property') return 1;
  if (/^get[A-Z]/.test(name) || /Template$/.test(name)) return 10;
  return 20;
}

/**
 * Members of the PARENT no subclass can reach: `private` members and module-scope constants.
 *
 * They are the evidence the suggestion needs in order to answer `parent`. Without them the model sees
 * a short list of overridable members and no reason why it is short — see ImUnreachable for the run
 * that measured it.
 *
 * Deliberately textual, like everything else here: this feeds a human decision, not a compiler.
 */
export function unreachableMembersOf(parentSource: string): ImUnreachable[] {
  const privates: ImUnreachable[] = [];
  const constants: ImUnreachable[] = [];
  const seen = new Set<string>();

  // `private foo(`, `private async foo(`, `private foo =`, `private foo: number = 0`
  for (const m of parentSource.matchAll(/^\s*private\s+(?:readonly\s+)?(?:async\s+)?(\w+)\s*[:(=]/gm)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    privates.push({ name: m[1], why: 'private' });
  }
  // Module scope only — no indentation. `const X = …` and `export const X = …`.
  for (const m of parentSource.matchAll(/^(?:export\s+)?const\s+(\w+)\s*[:=]/gm)) {
    if (seen.has(m[1])) continue;
    seen.add(m[1]);
    constants.push({ name: m[1], why: 'module-constant' });
  }

  // MODULE CONSTANTS FIRST, and this ordering is load-bearing. Every consumer caps the list — 12 in
  // i2-triage and in i4-inherit — on the assumption that the first names are the ones the request is
  // about. Emitted in source order that assumption fails exactly where it matters: measured on
  // `ml-copy-button`, 2026-08-14, COPY_CONFIRM_MS came 33rd of 34 behind 30 private methods, so the
  // one member that decides the case was the one the cap threw away. Constants are also the rarer
  // kind (4 of 34 there), so putting them first costs the privates almost nothing.
  return [...constants, ...privates];
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
 * readable from here), the shell is still detected and `overridableMembers`/`unreachableMembers` come
 * back empty — the clarification then offers `.less` and "change the parent", but cannot propose a
 * member.
 */
export function detectInheritance(source: string, parentSource = ''): ImInheritance {
  const m = source.match(EXTENDS_RE);
  if (!m) return NOT_A_SHELL;

  const parentClassName = m[2];
  if (parentClassName === BASE_CLASS) return NOT_A_SHELL;

  const parentImport = findImportOf(source, parentClassName);
  if (!parentImport) return NOT_A_SHELL;

  return {
    isShell: true,
    parentReference: parentImport.reference,
    parentProject: parentImport.project,
    parentClassName,
    ownMembers: collectOwnMembers(classBodyOf(source)),
    overridableMembers: parentSource ? overridableMembersOf(parentSource) : [],
    unreachableMembers: parentSource ? unreachableMembersOf(parentSource) : [],
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
