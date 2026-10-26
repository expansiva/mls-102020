/// <mls fileReference="_102020_/l2/agentNewReleaseL2/helpers/plan.ts" enhancement="_blank"/>

import { validateChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
import { EFFORT_UNIT_KINDS, type EffortAnswer, type EffortUnitRef } from '/_102035_/l2/solution/poolPlan.js';

export type NewReleaseL2Mode = 'materialize' | 'regenerate';

export type NewReleaseL2Plan =
  | {
    ok: true;
    mode: NewReleaseL2Mode;
    pages: string[];
    materializeOnly: string[];
    commands: string[];
    /** Pages with `shared` in `regenerateDefs` or `materialize`, or `contract` in `regenerateDefs`. */
    sharedPages: string[];
    /** Pages with `contract` in `regenerateDefs`, plus pages in `create`. */
    bffPages: string[];
  }
  | { ok: false; reason: string };

const PAGE_KIND = EFFORT_UNIT_KINDS.find(kind => kind === 'page');
const DEFS_KINDS = new Set<EffortUnitRef['kind']>(['page', 'contract', 'shared']);

function outOfStep(answer: EffortAnswer): string[] {
  const reasons: string[] = [];
  if (answer.status === 'abend') reasons.push(`abend: ${answer.abend?.reason ?? ''}`);
  if (answer.remove.length > 0) reasons.push('remove');
  if (answer.create.some(unit => unit.kind !== PAGE_KIND)) reasons.push('create');
  if (answer.regenerateDefs.some(unit => !DEFS_KINDS.has(unit.kind))) reasons.push('regenerateDefs');
  return reasons;
}

function addPage(pages: string[], seen: Set<string>, id: string): void {
  if (seen.has(id)) return;
  seen.add(id);
  pages.push(id);
}

function addCommand(commands: string[], seen: Set<string>, command: string): void {
  if (!command || seen.has(command)) return;
  seen.add(command);
  commands.push(command);
}

function collectNamedPages(answer: EffortAnswer, sharedPages: string[], seenShared: Set<string>, bffPages: string[], seenBff: Set<string>): void {
  for (const unit of answer.regenerateDefs) {
    if (unit.kind === 'shared') addPage(sharedPages, seenShared, unit.id);
    if (unit.kind === 'contract') {
      addPage(bffPages, seenBff, unit.id);
      addPage(sharedPages, seenShared, unit.id);
    }
  }
  for (const unit of answer.materialize) {
    if (unit.kind === 'shared') addPage(sharedPages, seenShared, unit.id);
  }
  for (const unit of answer.create) {
    if (unit.kind === PAGE_KIND) addPage(bffPages, seenBff, unit.id);
  }
}

function citesDefs(answer: EffortAnswer): boolean {
  return answer.contract === 'change'
    || answer.create.some(unit => unit.kind === PAGE_KIND)
    || answer.regenerateDefs.some(unit => DEFS_KINDS.has(unit.kind));
}

function addCitedPages(pages: string[], seen: Set<string>, answer: EffortAnswer): void {
  for (const unit of answer.regenerateDefs) {
    if (DEFS_KINDS.has(unit.kind)) addPage(pages, seen, unit.id);
  }
  for (const unit of answer.create) {
    if (unit.kind === PAGE_KIND) addPage(pages, seen, unit.id);
  }
  if (answer.contract !== 'change') return;
  for (const unit of answer.materialize) {
    if (unit.kind === PAGE_KIND) addPage(pages, seen, unit.id);
  }
}

/** Pages of this master to materialize, or to rebuild with the defs generator. Other masters are ignored. */
export function planNewReleaseL2(effort: unknown, masterProject: string): NewReleaseL2Plan {
  const checked = validateChangeEffort(effort);
  if (!checked.ok) {
    const detail = checked.issues.map(issue => `${issue.code}:${issue.path}`).join(', ');
    return { ok: false, reason: `changeEffort rejected by gate: ${detail}` };
  }
  const blocks: string[] = [];
  const materialize: string[] = [];
  const regenerate: string[] = [];
  const seenMaterialize = new Set<string>();
  const seenRegenerate = new Set<string>();
  const commands: string[] = [];
  const seenCommands = new Set<string>();
  const sharedPages: string[] = [];
  const seenShared = new Set<string>();
  const bffPages: string[] = [];
  const seenBff = new Set<string>();
  let rebuild = false;
  let sawMaster = false;
  for (const row of checked.file.perItem) {
    for (const answer of row.answers) {
      if (answer.master.project !== masterProject) continue;
      sawMaster = true;
      for (const agent of answer.runAgents) addCommand(commands, seenCommands, agent.command);
      collectNamedPages(answer, sharedPages, seenShared, bffPages, seenBff);
      for (const reason of outOfStep(answer)) blocks.push(`${answer.item} ${reason}`);
      if (citesDefs(answer)) {
        rebuild = true;
        addCitedPages(regenerate, seenRegenerate, answer);
        continue;
      }
      for (const unit of answer.materialize) {
        if (unit.kind !== PAGE_KIND) continue;
        addPage(materialize, seenMaterialize, unit.id);
      }
    }
  }
  if (blocks.length > 0) return { ok: false, reason: `not in this release step: ${blocks.join('; ')}` };
  if (!sawMaster) return { ok: false, reason: `change effort has no answer from master ${masterProject}` };
  const pages = rebuild ? regenerate : materialize;
  if (pages.length === 0) return { ok: false, reason: 'nothing to apply' };
  const materializeOnly = rebuild ? materialize.filter(id => !seenRegenerate.has(id)) : [];
  return { ok: true, mode: rebuild ? 'regenerate' : 'materialize', pages, materializeOnly, commands, sharedPages, bffPages };
}
