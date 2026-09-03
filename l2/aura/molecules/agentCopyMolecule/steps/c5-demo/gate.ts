/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c5-demo/gate.ts" enhancement="_blank"/>

// Gate of the .html demo copy (pure — unit-testable).
// This is the ONLY non-blocking step: its issues become a warning in the summary, never a stop.
// A molecule without its demo page is usable; a pipeline that dies at the demo is not.

import type { CopyItem } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { copyTag } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { containsTag } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cTemplates.js';

export interface CGateIssue {
  code: string;
  message: string;
}

export interface CDemoGateInputs {
  item: CopyItem;
  writtenHtml: string;
}

export function runDemoGate(inputs: CDemoGateInputs): CGateIssue[] {
  const issues: CGateIssue[] = [];
  const { item, writtenHtml } = inputs;
  const ref = item.origin.ref;
  const tag = copyTag(item);

  if (!writtenHtml.trim()) {
    issues.push({ code: 'html_empty', message: `${ref}: .html da demo saiu vazio` });
    return issues;
  }
  if (!writtenHtml.includes(tag)) {
    issues.push({ code: 'html_tag', message: `${ref}: a demo não menciona a tag da cópia ('${tag}')` });
  }
  if (item.rename && containsTag(writtenHtml, item.origin.tag)) {
    issues.push({ code: 'html_old_tag', message: `${ref}: a tag antiga ('${item.origin.tag}') sobrou na demo renomeada` });
  }
  // No mls header is EXPECTED here: 0 of 153 molecule .html files carry one (measured
  // 2026-08-19). A header showing up would mean someone re-introduced a swap.
  if (/^\s*\/\/\/\s*<mls\b/.test(writtenHtml.split('\n')[0] || '')) {
    issues.push({ code: 'html_header', message: `${ref}: a demo copiada ganhou header mls — as demos das moléculas não têm header` });
  }
  return issues;
}
