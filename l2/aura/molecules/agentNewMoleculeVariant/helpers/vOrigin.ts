/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vOrigin.ts" enhancement="_blank"/>

// Origin-molecule analysis: mention entry, ref parsing, portal detection, class-name and
// ml-* inventory extraction, origin-sheet geometry. Pure string functions (unit-testable);
// the only stor access is loadOriginSources via the injected reader.

import {
  isBareMention,
  stripAgentMention,
  tryParseArgs,
  type MentionArgsParser,
} from '/_102020_/l2/aura/molecules/shared/mentionEntry.js';

export interface VOriginRef {
  project: number;
  group: string;        // folder name, lowercase (e.g. 'grouptriggeraction')
  shortName: string;    // e.g. 'ml-button-standard'
  tag: string;          // e.g. 'grouptriggeraction--ml-button-standard'
  importPath: string;   // e.g. '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js'
}

// Accepts the molecule reference in the shapes both invocation paths send:
//  - collab-messages: '_102040_/l2/molecules/<group>/<shortName>'
//  - preview `page`:  '_102040_molecules/<group>/<shortName>' (no /l2/ segment)
//  - preview `fullName`: '_102040_/l2/molecules/<group>/ <shortName>' (stray spaces)
// Normalization mirrors the platform-canonical one used by agentImproveMolecule
// (insert /l2/ after the project token). Optional leading '/' and '.ts' suffix.
// Canonical-form normalizer, shared by the agent entry (so the rootPlan and
// task memory hold the clean ref) and parseOriginRef (idempotent). Mirrors the
// platform normalization used by agentImproveMolecule.
export function normalizeOriginPage(page: string): string {
  return (page || '')
    .replace(/\s+/g, '')                       // preview fullName carries stray spaces
    .replace(/^\//, '')
    .replace(/\.ts$/, '')
    .replace(/^(_\d+_)(?!\/l2\/)/, '$1/l2/');  // insert /l2/ when missing (preview page)
}

export function parseOriginRef(page: string): { ref: VOriginRef | null; error?: string } {
  const cleaned = normalizeOriginPage(page);
  const match = cleaned.match(/^_(\d+)_\/l2\/molecules\/([a-z0-9]+)\/([a-z0-9-]+)$/);
  if (!match) {
    return { ref: null, error: `invalid origin reference '${page}' — expected '_<project>_/l2/molecules/<group>/<molecule>' (a molecule of a dependency project)` };
  }
  const project = Number(match[1]);
  const group = match[2];
  const shortName = match[3];
  return {
    ref: {
      project,
      group,
      shortName,
      tag: `${group}--${shortName}`,
      importPath: `/_${project}_/l2/molecules/${group}/${shortName}.js`,
    },
  };
}

export function detectPortal(originTs: string): boolean {
  return /getPortalTemplate\s*\(|portalWidgetName/.test(originTs);
}

export function extractOriginClassName(originTs: string): string | null {
  const match = originTs.match(/export\s+class\s+([A-Za-z0-9_]+)/);
  return match ? match[1] : null;
}

// The ml-* semantic class inventory: union of occurrences in the origin .ts
// (emitted by render()) and .less (styled selectors). This is the discipline
// gate input AND the v3-less subset check universe.
export function extractMlInventory(originTs: string, originLess: string): string[] {
  const found = new Set<string>();
  const pattern = /(?<![\w-])ml-[a-z][a-z0-9-]*/g;
  for (const source of [originTs, originLess]) {
    for (const match of source.matchAll(pattern)) found.add(match[0]);
  }
  return Array.from(found).sort();
}

// ml-* classes the origin render() positions with `absolute`/`fixed`. The theme
// .less must NOT set position/overflow on these (doing so drops the element into
// normal flow → full width / clipped decorations — the discrete-slider bug).
// Heuristic over the render source: a "class-list context" (a single string
// literal, or a flat `[ ... ]` array as in the get*Classes() builders) that
// contains an `absolute`/`fixed` token contributes ALL its ml-* classes.
export function extractAbsoluteMlClasses(originTs: string): string[] {
  const found = new Set<string>();
  const collect = (text: string): void => {
    if (!/\b(absolute|fixed)\b/.test(text)) return;
    for (const m of text.matchAll(/(?<![\w-])ml-[a-z][a-z0-9-]*/g)) found.add(m[0]);
  };
  // (1) single-line quoted strings ('...' / "...") — one per element class list
  //     (inline class="..." attributes, cn(...) args). NOT backtick templates:
  //     a whole html`...` template spans many elements and would wrongly merge a
  //     positioned element's `absolute` with another element's ml-* class.
  for (const m of originTs.matchAll(/(['"])(.*?)\1/g)) collect(m[2]);
  // (2) flat array literals [ ... ] — the get*Classes() builders keep the
  //     positioning class and the ml-* classes as SEPARATE elements.
  for (const m of originTs.matchAll(/\[([^[\]]*)\]/g)) collect(m[1]);
  return Array.from(found).sort();
}

// ---- mention entry ------------------------------------------------------------
// The Variant is invoked with a molecule REFERENCE, from three places: the preview
// ({ fullName, page, prompt, position }), a typed object mention ({ page, prompt }) and — as
// of 2026-07-28 — a typed bare reference ('@@agentNewMoleculeVariant _102040_/l2/...'),
// which used to die inside safeParseArgs before reaching any of our code.

export interface VMentionEntry {
  page: string;    // '' when the mention carries no reference (caller fails readable)
  notes: string;   // user notes; never the mention itself
}

export function parseVariantEntry(userPrompt: string, agentName: string, parseArgs: MentionArgsParser): VMentionEntry {
  const text = stripAgentMention(userPrompt, agentName);
  if (!text || isBareMention(text)) return { page: '', notes: '' };

  const parsed = tryParseArgs(text, parseArgs);
  if (parsed) {
    const page = readEntryString(parsed.page) || readEntryString(parsed.fullName);
    return { page, notes: cleanEntryNotes(readEntryString(parsed.prompt)) };
  }
  // Not an object (or a malformed one): read the reference out of the plain text and treat
  // whatever follows it as notes.
  return parseBareReference(text);
}

// '_102040_/l2/molecules/group/ml-x rest of the sentence' -> ref + notes. The preview's
// fullName can carry a space before the molecule name ('.../group/ ml-x'), so a following
// 'ml-*' token is glued back onto a reference that ends with '/' instead of becoming notes.
function parseBareReference(text: string): VMentionEntry {
  const match = text.match(/_\d+_\S*/);
  if (!match) return { page: '', notes: cleanEntryNotes(text) };
  let page = match[0];
  let rest = `${text.slice(0, match.index)} ${text.slice((match.index || 0) + page.length)}`.trim();
  if (page.endsWith('/')) {
    const glued = rest.match(/^(ml-[a-z0-9-]+)\s*/);
    if (glued) {
      page += glued[1];
      rest = rest.slice(glued[0].length).trim();
    }
  }
  return { page, notes: cleanEntryNotes(rest) };
}

// The preview sends the agent mention itself in `prompt` — that is not user notes.
function cleanEntryNotes(value: string | undefined): string {
  const notes = (value || '').trim();
  return notes.startsWith('@@') ? '' : notes;
}

function readEntryString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

// ---- geometry conservation (Strategy D) --------------------------------------
// The base .less is scoped to the BASE tag, so it does NOT cascade to the variant
// tag: every layout declaration the origin sheet made must be REPRODUCED in the
// variant sheet. Dropping it is how ml-number-range-slider-brutal lost its rail
// (the 6px track fell out of `position:absolute; top:50%` into normal flow, and the
// render-positioned handles then sat below the line).
export type VGeometryByClass = Record<string, Record<string, string>>;

export const V_GEOMETRY_PROPS = ['position', 'top', 'right', 'bottom', 'left', 'width', 'height', 'transform'] as const;

// Layout declarations per ml-* class, keyed by the SUBJECT of each selector
// (`.ml-error .ml-track-fill { ... }` belongs to ml-track-fill). Works on the origin
// sheet and on a generated sheet, so the gate can diff the two maps.
export function extractGeometryByClass(sheet: string): VGeometryByClass {
  const out: VGeometryByClass = {};
  const scrubbed = stripLessComments(sheet || '');
  // `[^{};]*` cannot cross a delimiter, so each match starts right after the previous
  // one — no explicit prefix, which would skip a block nested directly inside another.
  const selectors = /([^{};]*)\{/g;
  let match: RegExpExecArray | null;
  while ((match = selectors.exec(scrubbed)) !== null) {
    const classes = selectorSubjects(match[1]);
    if (!classes.length) continue;
    // the matched '{' is the last character the regex consumed
    const body = ownDeclarations(scrubbed, selectors.lastIndex - 1);
    const geometry = geometryDeclarations(body);
    if (!Object.keys(geometry).length) continue;
    for (const cls of classes) {
      out[cls] = { ...geometry, ...(out[cls] || {}) };
    }
  }
  return out;
}

// The ml-* class each comma-separated selector part APPLIES to (its last simple
// selector). Pseudo-class arguments are dropped first, so `:not(.ml-disabled)`
// never becomes a subject.
function selectorSubjects(selectorText: string): string[] {
  const subjects: string[] = [];
  for (const part of selectorText.split(',')) {
    const clean = part.replace(/:[a-z-]+\([^)]*\)/gi, '').replace(/\[[^\]]*\]/g, '').trim();
    const matches = clean.match(/\.(ml-[a-z][a-z0-9-]*)/g);
    if (!matches?.length) continue;
    subjects.push(matches[matches.length - 1].slice(1));
  }
  return subjects;
}

// A block's OWN declarations: the body with nested blocks removed, so a child
// rule's geometry is not attributed to its parent.
function ownDeclarations(sheet: string, open: number): string {
  if (open < 0) return '';
  let depth = 0;
  let end = sheet.length;
  for (let i = open; i < sheet.length; i++) {
    if (sheet[i] === '{') depth++;
    else if (sheet[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  const body = sheet.slice(open + 1, end);
  return body.replace(/[^{}]*\{[\s\S]*?\}/g, '');
}

function geometryDeclarations(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const declaration of body.split(';')) {
    const parsed = declaration.match(/^\s*([a-z-]+)\s*:\s*([^;]+?)\s*$/i);
    if (!parsed) continue;
    const property = parsed[1].toLowerCase();
    if (!V_GEOMETRY_PROPS.includes(property as typeof V_GEOMETRY_PROPS[number])) continue;
    out[property] = parsed[2].trim();
  }
  return out;
}

function stripLessComments(sheet: string): string {
  return sheet.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

// ml-* classes REFERENCED as selectors in a generated .less.
export function extractMlClassesFromLess(less: string): string[] {
  const found = new Set<string>();
  for (const match of less.matchAll(/\.(ml-[a-z][a-z0-9-]*)/g)) found.add(match[1]);
  return Array.from(found).sort();
}

// 'ml-button-standard' -> 'BUTTON STANDARD' (shell header title convention — fase 0 finding).
export function toShellTitle(shortName: string): string {
  return shortName.replace(/^ml-/, '').split('-').join(' ').toUpperCase();
}
