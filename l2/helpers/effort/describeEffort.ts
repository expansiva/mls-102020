/// <mls fileReference="_102020_/l2/helpers/effort/describeEffort.ts" enhancement="_blank"/>

import { parseD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import type { EffortAnswer, EffortInput, EffortUnitRef } from '/_102035_/l2/solution/poolPlan.js';

const MASTER = { project: '102020', kind: 'l2', device: 'web' } as const;

function answer(input: EffortInput, materialize: EffortUnitRef[], reason?: string): EffortAnswer {
  return {
    master: { ...MASTER },
    item: input.item.changeId,
    status: reason ? 'abend' : 'computed',
    regenerateDefs: [],
    materialize,
    runAgents: [],
    ...(reason ? { abend: { reason } } : {}),
  };
}

/** Pure: which pages cite a changed rule. Anything else is an abend. */
export function describeEffortFrom(input: EffortInput, contracts: Record<string, string>): EffortAnswer {
  if (Object.keys(contracts).length === 0) return answer(input, [], `no generated L2 contracts for module ${input.module}`);
  if (input.item.kind !== 'rule' || input.item.op !== 'changed') {
    return answer(input, [], `v1 computes only rule changed; ${input.item.kind} ${input.item.op} is not handled`);
  }
  const ruleId = input.item.changeId.startsWith('rule:') ? input.item.changeId.slice('rule:'.length) : '';
  const pages: string[] = [];
  for (const pageId of Object.keys(contracts).sort()) {
    const parsed = parseD2ContractV2(contracts[pageId]);
    if (parsed.routes.some(route => route.rules.includes(ruleId))) pages.push(pageId);
  }
  if (pages.length === 0) return answer(input, [], `no route of any contract cites rule ${ruleId}`);
  return answer(input, pages.map(pageId => ({
    kind: 'page' as const,
    id: pageId,
    path: `l2/${input.module}/web/contracts/${pageId}.defs.ts`,
  })));
}

function projectId(input: EffortInput): number | undefined {
  const fromBase = /^mls-(\d+)$/u.exec(input.base.baseId);
  if (fromBase) {
    const id = Number(fromBase[1]);
    if (id > 0) return id;
  }
  const actual = mls.actualProject;
  if (typeof actual === 'number' && actual > 0) return actual;
  return undefined;
}

/** Reads `l2/<module>/web/contracts/*.defs.ts` of the project and classifies the item. */
export async function describeEffort(input: EffortInput): Promise<EffortAnswer> {
  const project = projectId(input);
  if (project === undefined) return answer(input, [], `cannot resolve the project of base ${input.base.baseId}`);
  const folder = `${input.module}/web/contracts`;
  const contracts: Record<string, string> = {};
  for (const file of Object.values(mls.stor.files)) {
    if (!file || file.project !== project || file.level !== 2 || file.status === 'deleted') continue;
    if (file.folder !== folder || file.extension !== '.defs.ts') continue;
    const content = await file.getContent('');
    if (typeof content === 'string' && content.length > 0) contracts[file.shortName] = content;
  }
  return describeEffortFrom(input, contracts);
}
