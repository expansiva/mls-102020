/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c4-less/gate.ts" enhancement="_blank"/>

// Gate of the .less copy (pure — unit-testable).
// Two things are worth checking and nothing else: the sheet is scoped to the COPY's tag, and
// when the origin was a shell the sheet came from the SHELL (the appearance the client chose),
// never from the parent.
//
// A sheet with NO RULES AT ALL (header only) is a legitimate state, not a defect: 1 of the 154
// molecules of the base is exactly that (groupviewtable/ml-data-table). Copying it faithfully means
// copying a sheet with no rules, and there is no root selector to check — so the scope check is
// SKIPPED and an informational `less_no_rules` is emitted for the trace. Failing there is what
// aborted a 12-molecule group copy in the Studio on 2026-08-20.

import type { CopyItem } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { copyShortName, copyTag } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { containsTag, extractLessRootSelectors, isTagScopedSelector } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cTemplates.js';

export interface CGateIssue {
  code: string;
  message: string;
}

// Codes the step must NOT treat as blocking (same convention as c3's `defs_missing`).
export const C_LESS_NON_BLOCKING = ['less_no_rules'];

export interface CLessGateInputs {
  item: CopyItem;
  destProject: number;
  writtenLess: string;
  sourceIsShellSheet: boolean;   // true when the content came from the shell's own .less
}

export function runLessGate(inputs: CLessGateInputs): CGateIssue[] {
  const issues: CGateIssue[] = [];
  const { item, writtenLess, destProject } = inputs;
  const ref = item.origin.ref;
  const shortName = copyShortName(item);
  const tag = copyTag(item);

  if (!writtenLess.trim()) {
    issues.push({ code: 'less_empty', message: `${ref}: .less da cópia saiu vazio` });
    return issues;
  }

  const expectedHeader = `_${destProject}_/l2/molecules/${item.destination.group}/${shortName}.less`;
  if (!writtenLess.includes(`fileReference="${expectedHeader}"`)) {
    issues.push({ code: 'less_header', message: `${ref}: header do .less não aponta para ${expectedHeader}` });
  }

  // The root selector IS the tag. On the default path the sheet already carries the right one
  // (same name); on a rename it was re-scoped.
  const roots = extractLessRootSelectors(writtenLess);
  if (!roots.length) {
    // Faithful copy of a molecule that has no appearance of its own. Nothing to scope.
    issues.push({ code: 'less_no_rules', message: `${ref}: a folha da origem não tem regras (só header) — a cópia saiu igual, sem aparência própria` });
    return issues;
  }
  if (!roots.some(selector => isTagScopedSelector(selector, tag))) {
    issues.push({
      code: 'less_scope',
      message: `${ref}: o seletor raiz do .less não é a tag da cópia ('${tag}') — encontrados: ${roots.slice(0, 3).join(', ') || '(nenhum)'}`,
    });
  }
  if (item.rename && containsTag(writtenLess, item.origin.tag)) {
    issues.push({ code: 'less_old_tag', message: `${ref}: a tag antiga ('${item.origin.tag}') sobrou no .less renomeado` });
  }
  if (item.origin.chain.isShell && !inputs.sourceIsShellSheet) {
    issues.push({
      code: 'less_from_parent',
      message: `${ref}: casca achatada — o .less tem de vir da CASCA (a aparência escolhida), não do pai`,
    });
  }

  return issues;
}
