/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2PageContext.ts" enhancement="_blank"/>

// The target page's OWN declared intent, formatted for the molecule choice. Pure — the caller passes
// the already-parsed `definition` object (helpers/cm2DefsPatch.parsePageDefsSource).
//
// ⚠️ WHY THIS EXISTS, measured on two runs of the same page (_102046_ approveChangeOrder/page21):
// c1 picked the right GROUP every time and c2 flip-flopped INSIDE it — ml-data-table vs ml-view-table
// (11 siblings), ml-multiline-text vs ml-enter-text (8 siblings), ml-radio-group vs nothing (12
// siblings) — while the one group with just 2 siblings stayed stable. The instability scaled with the
// number of siblings, which is the signature of "nothing to discriminate on", not of a bad model.
//
// It is NOT the catalog's fault: groupViewTable's own skill text ships 10 scenario rows, 11 full
// molecule descriptions AND their layout axes. It is the region's `need` line, which said only
// "Localizar a ordem de mudança submetida — returns fields: ..." and therefore matched the catch-all
// scenario row ("Listagem geral com ordenação e paginação") — the row that recommends 10 of the 11.
//
// agentChooseMolecules (the probe) does not have this problem: its `need` is WRITTEN by an LLM from
// human prose, and its c1 prompt devotes a whole section to ordering that line to carry the
// discriminating axes ("how many options, whether the user types to filter, single/several/range...").
// Here the regions are mechanical, so the discriminating evidence must come from somewhere else — and
// it is already in the target file: `purpose`, `presentation.categoryRef` and, on the goal-first
// genomes, the entire `pageObjective` block. Those are DECLARED facts, never inference — the same
// category as the contract's field types, and the same principle helpers/cm2ProjectContext.ts already
// follows for the project language.
//
// page11 carries no `pageObjective` (only page21/page31 do), so there this degrades to
// purpose + categoryRef, and to nothing at all when even those are absent — never padded with a guess.

import { isRecord } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';

export interface Cm2CriticalAction {
  action: string;
  presentation: string;
}

export interface Cm2PageContext {
  purpose: string;
  categoryRef: string;
  jobToBeDone: string;
  primaryDecision: string;
  usageFrequency: string;
  decisiveInfo: string[];
  informationHierarchy: string[];
  antiPatterns: string[];
  criticalActions: Cm2CriticalAction[];
  /** Command inputs on this page whose value comes from SELECTING a row of a list — a structural fact
   * about the page (a list surface here has to let the user pick a row), counted from the defs itself. */
  selectionInputCount: number;
}

export function extractPageContext(definitionJson: Record<string, unknown>): Cm2PageContext {
  const objective = isRecord(definitionJson.pageObjective) ? definitionJson.pageObjective : {};
  const presentation = isRecord(definitionJson.presentation) ? definitionJson.presentation : {};
  return {
    purpose: readText(definitionJson.purpose),
    categoryRef: readText(presentation.categoryRef),
    jobToBeDone: readText(objective.jobToBeDone),
    primaryDecision: readText(objective.primaryDecision),
    usageFrequency: readText(objective.usageFrequency),
    decisiveInfo: readTextList(objective.decisiveInfo),
    informationHierarchy: readTextList(objective.informationHierarchy),
    antiPatterns: readTextList(objective.antiPatterns),
    criticalActions: readCriticalActions(objective.criticalActions),
    selectionInputCount: countSelectionInputs(definitionJson),
  };
}

/** '' when the target declares none of it — the caller then omits the whole prompt section. */
export function formatPageContext(context: Cm2PageContext): string {
  const lines: string[] = [];

  if (context.purpose) lines.push(`Purpose: ${context.purpose}`);
  if (context.categoryRef) lines.push(`UX category of this workspace: ${context.categoryRef}`);
  if (context.jobToBeDone) lines.push(`Job to be done: ${context.jobToBeDone}`);
  if (context.primaryDecision) lines.push(`Primary decision the user makes here: ${context.primaryDecision}`);
  if (context.usageFrequency) lines.push(`How often / under what pressure it is used: ${context.usageFrequency}`);
  if (context.decisiveInfo.length) lines.push(`Information the user reads to decide: ${context.decisiveInfo.join('; ')}`);
  if (context.informationHierarchy.length) lines.push(`Information hierarchy, most important first: ${context.informationHierarchy.join('; ')}`);

  if (context.criticalActions.length) {
    lines.push('');
    lines.push('Presentation ALREADY DECIDED for this page\'s critical actions. A molecule that contradicts one of these is the wrong molecule, however well it fits the field type:');
    for (const item of context.criticalActions) {
      lines.push(`- ${item.action}${item.presentation ? ` → ${item.presentation}` : ''}`);
    }
  }

  if (context.antiPatterns.length) {
    lines.push('');
    lines.push('Anti-patterns DECLARED for this page. A molecule whose whole point is one of these is refused, even when the quick-reference table recommends it:');
    for (const item of context.antiPatterns) lines.push(`- ${item}`);
  }

  if (context.selectionInputCount > 0) {
    lines.push('');
    lines.push(`${context.selectionInputCount} command input(s) of this page are populated by SELECTING a row (source: selectedEntity/selection), never typed. A list/table surface here therefore has to let the user pick a row.`);
  }

  if (!lines.length) return '';
  return ['## What this page is for (declared in the target file)', '', ...lines].join('\n');
}

// ---- readers: shape is checked, never assumed (the defs is generated code) ----

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(readText).filter(Boolean);
}

function readCriticalActions(value: unknown): Cm2CriticalAction[] {
  if (!Array.isArray(value)) return [];
  const out: Cm2CriticalAction[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const action = readText(item.action);
    if (!action) continue;
    out.push({ action, presentation: readText(item.presentation) });
  }
  return out;
}

/** Exported: helpers/cm2Regions states this same fact in the surface region's need line, and one
 * source of truth beats two counters that can drift. */
export function countSelectionInputs(definitionJson: Record<string, unknown>): number {
  const bindings = Array.isArray(definitionJson.dataBindings) ? definitionJson.dataBindings : [];
  let count = 0;
  for (const binding of bindings) {
    if (!isRecord(binding) || !Array.isArray(binding.inputs)) continue;
    for (const input of binding.inputs) {
      if (isRecord(input) && (input.source === 'selectedEntity' || input.source === 'selection')) count += 1;
    }
  }
  return count;
}
