/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cOrigin.ts" enhancement="_blank"/>

// Reading the ENTRY and the ORIGIN: reference parsing for the three invocation formats,
// group expansion, and the shell chain. **PURE — no stor access, no cFs import.** That is not
// tidiness: importing cFs pulls libStor -> libModel, which touches `mls.events` at import time
// and dies under the test harness, so a single import would make every function here
// untestable. The group listing arrives INJECTED (`expandRefs`), the same way vOrigin takes an
// injected reader.
//
// Why this is not vOrigin.parseOriginRef promoted to shared/ (spec.md, control 0.4): the
// Variant parses ONE complete reference; this agent parses N references and accepts a
// group-only one. Promoting would mean changing what the Variant depends on to serve a
// consumer whose grammar diverged. The MENTION primitives, which are platform facts, ARE
// shared and are consumed from there.

import {
  isBareMention,
  stripAgentMention,
  tryParseArgs,
  type MentionArgsParser,
} from '/_102020_/l2/aura/molecules/shared/mentionEntry.js';
import type { CopyChain, CopyMode } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';

export const REF_FORMAT_HINT = '_<projeto>_/l2/molecules/<grupo>[/<ml-molecula>]';

export interface CopyRef {
  ref: string;           // normalized, without extension
  project: number;
  group: string;
  shortName: string;     // '' when the reference points at the whole group
  isGroupRef: boolean;
}

// ---- entry -------------------------------------------------------------------

export interface CEntry {
  text: string;   // everything the ref scanner should look at
  notes: string;  // user prose that is NOT a reference
}

// Two doors (flow.json conventions.input): the preview payload (an object literal with
// page/fullName) and prose typed in collab-messages. Both end up as text to scan, because
// a single mention may carry N references.
export function parseCopyEntry(userPrompt: string, agentName: string, parseArgs: MentionArgsParser): CEntry {
  const text = stripAgentMention(userPrompt, agentName);
  if (!text || isBareMention(text)) return { text: '', notes: '' };

  const parsed = tryParseArgs(text, parseArgs);
  if (parsed) {
    const page = readEntryString(parsed.page) || readEntryString(parsed.fullName);
    const prompt = cleanEntryNotes(readEntryString(parsed.prompt));
    // The preview sends ONE molecule in `page`; the prose that came with it may name more.
    return { text: `${page}\n${prompt}`.trim(), notes: prompt };
  }
  return { text, notes: text };
}

// The preview sends the agent mention itself in `prompt` — that is not user notes.
function cleanEntryNotes(value: string | undefined): string {
  const notes = (value || '').trim();
  return notes.startsWith('@@') ? '' : notes;
}

function readEntryString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

// ---- reference parsing -------------------------------------------------------

// EVERY reference in the text, in order, deduplicated. Prose around them is ignored — the
// caller keeps it as notes. The '/l2/' segment is inserted when missing (the preview `page`
// shape) and a stray space before the molecule name is tolerated (a pasted preview
// `fullName` carries it), exactly like the platform-canonical normalization.
export function parseCopyRefs(text: string): { refs: CopyRef[]; errors: string[] } {
  const refs: CopyRef[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  const pattern = /_(\d+)_\/?(?:l2\/)?molecules\/\s*([A-Za-z0-9]+)(?:\/\s*([A-Za-z0-9-]+))?/g;
  for (const match of text.matchAll(pattern)) {
    const project = Number(match[1]);
    const group = match[2].toLowerCase();
    const shortName = (match[3] || '').replace(/\.ts$/, '');
    if (shortName && !/^ml-[a-z0-9-]+$/.test(shortName)) {
      errors.push(`referência inválida '${match[0].trim()}' — o nome da molécula deve começar com 'ml-' (formato: ${REF_FORMAT_HINT})`);
      continue;
    }
    const ref = shortName
      ? `_${project}_/l2/molecules/${group}/${shortName}`
      : `_${project}_/l2/molecules/${group}`;
    if (seen.has(ref)) continue;
    seen.add(ref);
    refs.push({ ref, project, group, shortName, isGroupRef: !shortName });
  }
  return { refs, errors };
}

// single = one molecule; group = one group-only reference; list = anything else.
// Rename is offered ONLY in 'single' (control decision 1), so this is not cosmetic.
export function copyModeForRefs(refs: CopyRef[]): CopyMode {
  if (refs.length === 1 && !refs[0].isGroupRef) return 'single';
  if (refs.length === 1 && refs[0].isGroupRef) return 'group';
  return 'list';
}

// Lists the molecule shortNames of a group in a project. Injected so this module stays pure;
// c1-bootstrap passes cFs.listGroupMolecules, which reads the ORIGIN project's stor listing.
export type GroupLister = (project: number, group: string) => string[];

// A group-only reference becomes the group's molecules; a molecule reference stays as is.
export function expandRefs(refs: CopyRef[], listGroup: GroupLister): { refs: CopyRef[]; errors: string[] } {
  const out: CopyRef[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const ref of refs) {
    if (!ref.isGroupRef) {
      if (!seen.has(ref.ref)) { seen.add(ref.ref); out.push(ref); }
      continue;
    }
    const shortNames = listGroup(ref.project, ref.group);
    if (!shortNames.length) {
      errors.push(`grupo '${ref.ref}' não tem moléculas legíveis — confira o nome do grupo e se o projeto _${ref.project}_ é dependência do projeto atual`);
      continue;
    }
    for (const shortName of shortNames) {
      const expanded = `_${ref.project}_/l2/molecules/${ref.group}/${shortName}`;
      if (seen.has(expanded)) continue;
      seen.add(expanded);
      out.push({ ref: expanded, project: ref.project, group: ref.group, shortName, isGroupRef: false });
    }
  }
  return { refs: out, errors };
}

export function refTag(ref: CopyRef): string {
  return `${ref.group}--${ref.shortName}`;
}

// ---- the origin .ts ----------------------------------------------------------

export function extractOriginClassName(originTs: string): string | null {
  const match = originTs.match(/export\s+class\s+([A-Za-z0-9_]+)/);
  return match ? match[1] : null;
}

export function extractExtendedClassName(originTs: string): string | null {
  const match = originTs.match(/export\s+class\s+[A-Za-z0-9_]+\s+extends\s+([A-Za-z0-9_]+)/);
  return match ? match[1] : null;
}

export function extractCustomElementTag(originTs: string): string | null {
  const match = originTs.match(/@customElement\(\s*['"]([^'"]+)['"]\s*\)/);
  return match ? match[1] : null;
}

// The import path a class name came from: '/_102040_/l2/molecules/<group>/<shortName>.js'
export function findImportRef(originTs: string, className: string): string | null {
  const pattern = new RegExp(`import\\s*{[^}]*\\b${className}\\b[^}]*}\\s*from\\s*['"]([^'"]+)['"]`);
  const match = originTs.match(pattern);
  return match ? match[1] : null;
}

export const MOLECULE_BASE_CLASS = 'MoleculeAuraElement';

// Is this origin a SHELL, and if so what does it extend? Deterministic: a real molecule
// extends MoleculeAuraElement; anything else is a shell over another molecule (the 84 of
// 102054/102055). Depth is 1 by contract — the caller checks the parent and fails readable
// when the parent is itself a shell.
export function detectChain(originTs: string): { chain: CopyChain; error?: string } {
  const extended = extractExtendedClassName(originTs);
  if (!extended) {
    return { chain: { isShell: false }, error: 'não foi possível ler a classe estendida do .ts da origem' };
  }
  if (extended === MOLECULE_BASE_CLASS) return { chain: { isShell: false } };

  const importPath = findImportRef(originTs, extended);
  if (!importPath) {
    return { chain: { isShell: true }, error: `a origem estende '${extended}', mas o import correspondente não foi encontrado — não é possível achatar a cópia` };
  }
  const parsed = parseCopyRefs(importPath.replace(/\.js$/, ''));
  const parentRef = parsed.refs.find(candidate => !candidate.isGroupRef);
  if (!parentRef) {
    return { chain: { isShell: true }, error: `a origem estende '${extended}', importado de '${importPath}', que não é uma molécula de outro projeto — não é possível achatar a cópia` };
  }
  return {
    chain: {
      isShell: true,
      parentRef: parentRef.ref,
      parentProject: parentRef.project,
      parentGroup: parentRef.group,
      parentShortName: parentRef.shortName,
      parentClassName: extended,
    },
  };
}
