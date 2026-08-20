/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c3-copy/gate.ts" enhancement="_blank"/>

// Gate of the .ts + .defs.ts copy (pure — unit-testable). One item at a time; the step
// collects the issues of every item before failing, so a bad batch reports once.
//
// The check that matters most is `i18n_changed`: the collab_i18n block must cross the copy
// BYTE FOR BYTE. Since 2026-08-20 it is not only "the reason the copy exists" — it is the HANDOFF
// CONTRACT: another Studio agent adds the languages afterwards, working on this very block. A copy
// that "improves" it on the way is a copy that agent cannot trust.

import type { CopyItem } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { copyClassName, copyShortName, copyTag } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { containsTag, extractCopiedFrom, extractDefsTagName, extractI18nBlock } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cTemplates.js';

export interface CGateIssue {
  code: string;
  message: string;
}

export interface CCopyGateInputs {
  item: CopyItem;
  destProject: number;
  sourceTs: string;      // the body's source: the parent's .ts when flattening
  writtenTs: string;
  sourceDefs: string;
  writtenDefs: string;
}

export function runCopyGate(inputs: CCopyGateInputs): CGateIssue[] {
  const issues: CGateIssue[] = [];
  const { item, writtenTs, writtenDefs, sourceTs, sourceDefs, destProject } = inputs;
  const ref = item.origin.ref;
  const shortName = copyShortName(item);
  const tag = copyTag(item);
  const className = copyClassName(item);

  if (!writtenTs.trim()) {
    issues.push({ code: 'ts_empty', message: `${ref}: .ts da cópia saiu vazio` });
    return issues;
  }

  // M2 lesson: a wrong project in the header breaks the file's identity.
  const expectedTsHeader = `_${destProject}_/l2/molecules/${item.destination.group}/${shortName}.ts`;
  if (!writtenTs.includes(`fileReference="${expectedTsHeader}"`)) {
    issues.push({ code: 'ts_header', message: `${ref}: header do .ts não aponta para ${expectedTsHeader}` });
  }
  const expectedDefsHeader = `_${destProject}_/l2/molecules/${item.destination.group}/${shortName}.defs.ts`;
  if (writtenDefs.trim() && !writtenDefs.includes(`fileReference="${expectedDefsHeader}"`)) {
    issues.push({ code: 'defs_header', message: `${ref}: header do .defs.ts não aponta para ${expectedDefsHeader}` });
  }

  // Provenance cannot be reconstituted later (§8.6) — it is written even though nothing reads
  // it yet.
  const copiedFrom = extractCopiedFrom(writtenTs);
  if (!copiedFrom) {
    issues.push({ code: 'copied_from', message: `${ref}: linha copiedFrom ausente no .ts` });
  } else {
    if (!copiedFrom.includes(item.origin.ref)) {
      issues.push({ code: 'copied_from_ref', message: `${ref}: copiedFrom não nomeia a origem` });
    }
    if (item.origin.chain.isShell && item.origin.chain.parentRef && !copiedFrom.includes(item.origin.chain.parentRef)) {
      issues.push({ code: 'copied_from_parent', message: `${ref}: casca achatada — o copiedFrom precisa nomear também o pai (${item.origin.chain.parentRef})` });
    }
  }

  // THE check. An absent block on both sides is fine (only 138 of the molecules have one);
  // present-and-different, or lost on the way, is not.
  const sourceI18n = extractI18nBlock(sourceTs);
  const writtenI18n = extractI18nBlock(writtenTs);
  if (sourceI18n && !writtenI18n) {
    issues.push({ code: 'i18n_lost', message: `${ref}: o bloco collab_i18n desapareceu na cópia — é o motivo da cópia existir` });
  } else if (sourceI18n && writtenI18n && sourceI18n !== writtenI18n) {
    issues.push({ code: 'i18n_changed', message: `${ref}: o bloco collab_i18n foi alterado na cópia; ele tem de atravessar byte a byte` });
  }

  // Identity: origin's by default, the shell's when flattened, the new one when renamed.
  if (!writtenTs.includes(`@customElement('${tag}')`) && !writtenTs.includes(`@customElement("${tag}")`)) {
    issues.push({ code: 'tag', message: `${ref}: @customElement da cópia não é '${tag}'` });
  }
  if (className && !new RegExp(`export\\s+class\\s+${escapeRegExp(className)}\\b`).test(writtenTs)) {
    issues.push({ code: 'class', message: `${ref}: a classe exportada da cópia não é '${className}'` });
  }

  // A leftover parent tag after a flatten means the copy would shadow the BASE molecule
  // instead of the themed one the client uses — the whole point of keeping the shell identity.
  if (item.origin.chain.isShell) {
    const parentTag = `${item.origin.chain.parentGroup}--${item.origin.chain.parentShortName}`;
    // containsTag, never includes: the shell tag normally HAS the parent tag as its prefix
    // ('…ml-button-standard' inside '…ml-button-standard-brutal'), so a substring check would
    // flag every conventionally-named shell.
    if (containsTag(writtenTs, parentTag)) {
      issues.push({ code: 'parent_tag_leftover', message: `${ref}: a tag do pai ('${parentTag}') sobrou no .ts achatado` });
    }
  }

  // The .defs.ts is a contract other routines read; its TagName must be the copy's tag.
  if (writtenDefs.trim()) {
    const defsTag = extractDefsTagName(writtenDefs);
    if (defsTag && defsTag !== tag) {
      issues.push({ code: 'defs_tag', message: `${ref}: TagName do .defs.ts é '${defsTag}', esperado '${tag}'` });
    }
    if (!sourceDefs.trim()) {
      issues.push({ code: 'defs_source', message: `${ref}: .defs.ts escrito sem fonte legível` });
    }
  }

  return issues;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
