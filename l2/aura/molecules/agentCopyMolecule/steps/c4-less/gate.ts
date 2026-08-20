/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c4-less/gate.ts" enhancement="_blank"/>

// Gate of the .less copy (pure — unit-testable).
// Two things are worth checking and nothing else: the sheet is scoped to the COPY's tag, and
// when the origin was a shell the sheet came from the SHELL (the appearance the client chose),
// never from the parent.

import type { CopyItem } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { copyShortName, copyTag } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { containsTag, extractLessRootSelectors } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cTemplates.js';

export interface CGateIssue {
  code: string;
  message: string;
}

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
  if (!roots.some(selector => selector === tag || selector.startsWith(`${tag} `) || selector.startsWith(`${tag}.`) || selector.startsWith(`${tag}:`))) {
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
