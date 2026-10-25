/// <mls fileReference="_102020_/l2/agentNewReleaseL2/helpers/plan.ts" enhancement="_blank"/>

import { validateChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
import { EFFORT_UNIT_KINDS, type EffortAnswer } from '/_102035_/l2/solution/poolPlan.js';

export type NewReleaseL2Plan =
  | { ok: true; pages: string[] }
  | { ok: false; reason: string };

const PAGE_KIND = EFFORT_UNIT_KINDS.find(kind => kind === 'page');

function outOfStep(answer: EffortAnswer): string[] {
  const reasons: string[] = [];
  if (answer.status === 'abend') reasons.push(`abend: ${answer.abend?.reason ?? ''}`);
  if (answer.create.length > 0) reasons.push('create');
  if (answer.remove.length > 0) reasons.push('remove');
  if (answer.regenerateDefs.length > 0) reasons.push('regenerateDefs');
  if (answer.runAgents.length > 0) reasons.push('runAgents');
  if (answer.contract === 'change') reasons.push("contract: 'change'");
  return reasons;
}

/** Pages of this master to materialize again. Other masters in the file are ignored. */
export function planNewReleaseL2(effort: unknown, masterProject: string): NewReleaseL2Plan {
  const checked = validateChangeEffort(effort);
  if (!checked.ok) {
    const detail = checked.issues.map(issue => `${issue.code}:${issue.path}`).join(', ');
    return { ok: false, reason: `changeEffort rejected by gate: ${detail}` };
  }
  const blocks: string[] = [];
  const pages: string[] = [];
  const seen = new Set<string>();
  for (const row of checked.file.perItem) {
    for (const answer of row.answers) {
      if (answer.master.project !== masterProject) continue;
      for (const reason of outOfStep(answer)) blocks.push(`${answer.item} ${reason}`);
      for (const unit of answer.materialize) {
        if (unit.kind !== PAGE_KIND || seen.has(unit.id)) continue;
        seen.add(unit.id);
        pages.push(unit.id);
      }
    }
  }
  if (blocks.length > 0) return { ok: false, reason: `not in this release step: ${blocks.join('; ')}` };
  if (pages.length === 0) return { ok: false, reason: 'nothing to apply' };
  return { ok: true, pages };
}
