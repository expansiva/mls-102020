/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.ts" enhancement="_blank"/>

// The context artifact contract (l4/agentCopy/<runKey>/context.json).
// Written ONCE by c1-bootstrap; every later step reads it from disk and never re-derives.
// ONE documented exception (flow.json conventions.contextArtifact): c2-clarify writes back
// `rename` and `skip` — it is the only step allowed to mutate the context.
//
// The entry is ALWAYS a list: copying one molecule is a list of one. That is what keeps
// c3/c4/c5 with a single code path for the three invocation formats.

export interface CopyChain {
  isShell: boolean;
  // Populated only when isShell. Depth is 1 by contract (a shell of a shell fails in c1).
  parentRef?: string;
  parentProject?: number;
  parentGroup?: string;
  parentShortName?: string;
  parentClassName?: string;
}

export interface CopyOrigin {
  ref: string;            // '_102040_/l2/molecules/<group>/<shortName>'
  project: number;
  group: string;          // folder name, lowercase
  shortName: string;      // 'ml-combobox'
  tag: string;            // '<group>--<shortName>'
  className: string;      // exported class of the origin .ts
  chain: CopyChain;
}

export interface CopyDestinationFiles {
  ts: string;
  defs: string;
  less: string;
  html: string;
}

// A collision is NOT a failure (c1 records it, c2 resolves it). `files` lists the
// destination display paths that already exist; `copiedFrom` is the provenance line of
// the existing copy when readable — it is what lets the widget say WHEN that copy was
// made, which is the difference between an informed "replace" and a surprise.
export interface CopyCollision {
  files: string[];
  copiedFrom?: string;
}

export interface CopyItem {
  origin: CopyOrigin;
  destination: { group: string; files: CopyDestinationFiles };
  collision: CopyCollision | null;
  rename: string | null;   // new shortName; single mode only, written by c2
  skip: boolean;           // 'ignore existing ones' (batch), written by c2
}

export type CopyMode = 'single' | 'group' | 'list';

export interface CopyContext {
  schemaVersion: 1;
  createdAt: string;
  runKey: string;
  destProject: number;
  mode: CopyMode;
  userLanguage: string;
  userNotes: string;
  copiedFromDate: string;  // YYYY-MM-DD stamped once, so every file of the run agrees
  items: CopyItem[];
}

// ---- effective identity ------------------------------------------------------
// The identity a copy is WRITTEN with. Three cases collapse here, and getting this wrong
// is what would make the whole agent pointless:
//  - default: the origin's own identity (same name/tag => the copy shadows the base);
//  - flattened shell: STILL the shell's identity (the origin IS the shell) even though the
//    body comes from the parent — with the parent's identity the copy would shadow the BASE
//    molecule instead of the themed one the client actually uses;
//  - renamed (single mode, collision): the identity derived from the new shortName.

export function copyShortName(item: CopyItem): string {
  return item.rename || item.origin.shortName;
}

export function copyTag(item: CopyItem): string {
  return `${item.destination.group}--${copyShortName(item)}`;
}

export function copyClassName(item: CopyItem): string {
  if (!item.rename) return item.origin.className;
  return deriveClassName(item.rename, item.origin.className);
}

// 'ml-combobox-local' + origin 'ComboboxMolecule' -> 'ComboboxLocalMolecule'
// 'ml-button-standard-brutal-2' + origin 'ButtonStandardBrutal' -> 'ButtonStandardBrutal2'
// The 'Molecule' suffix is kept only when the origin used it: the base molecules do, the
// hand-made shells of 102054/102055 do not.
export function deriveClassName(shortName: string, originClassName: string): string {
  const pascal = shortName
    .replace(/^ml-/, '')
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return /Molecule$/.test(originClassName) ? `${pascal}Molecule` : pascal;
}

// ---- selectors ---------------------------------------------------------------

// The items c3/c4/c5 actually write. `skip` is the ONLY reason an item is left out at
// this point: invalid items never make it past c1 (fail-fast).
export function itemsToWrite(ctx: CopyContext): CopyItem[] {
  return ctx.items.filter(item => !item.skip);
}

export function collidingItems(ctx: CopyContext): CopyItem[] {
  return ctx.items.filter(item => !!item.collision);
}

export function copyContextSummary(ctx: CopyContext): string {
  const shells = ctx.items.filter(item => item.origin.chain.isShell).length;
  const collisions = collidingItems(ctx).length;
  const parts = [`${ctx.items.length} molécula(s) [${ctx.mode}]`];
  if (shells) parts.push(`${shells} casca(s) achatada(s)`);
  parts.push(collisions ? `${collisions} colisão(ões)` : 'sem colisão');
  return `${parts.join(', ')} -> _${ctx.destProject}_`;
}
