/// <mls fileReference="_102020_/l2/aura/agentGenomeUx/agentGenomeUxDispatch.ts" enhancement="_blank"/>

// Dispatch step of agentGenomeUx: resolves the pages of the run (page11 desktop defs of the module, or the requested
// subset), keeps the fresh ones (receipt matches page11, template, rules, catalog and the written defs) and plants
// one agentGenomeUxPage worker per pending page. With nothing pending it closes the run at once.
// Base mode (layout 1): layouts["1"] may be absent, and a page without a UX 1 template choice is a no-op.

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { addD2Step, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { GENOME_UX_DISPATCH_AGENT_NAME, GENOME_UX_FOLDER, genomeUxGenome, genomeUxIsBase, genomeUxUseMolecules, type GenomeUxEntry } from '/_102020_/l2/aura/agentGenomeUx/genomeUxCore.js';
import { listGenomeUxPages, readGenomeUxInventory, readGenomeUxLayout, readGenomeUxPagePending } from '/_102020_/l2/aura/agentGenomeUx/genomeUxIo.js';
import { genomeUxCompletionSteps, genomeUxPageStep, type GenomeUxRunArgs } from '/_102020_/l2/aura/agentGenomeUx/genomeUxRun.js';

export function createAgent(): IAgentAsync {
  return { agentName: GENOME_UX_DISPATCH_AGENT_NAME, agentProject: 102020, agentFolder: GENOME_UX_FOLDER, agentDescription: 'Plan one genome UX worker per pending page', visibility: 'private', beforePromptStep };
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  try {
    const entry = JSON.parse(args || step.prompt || '{}') as GenomeUxEntry & { project: number };
    const { project, module, layout } = entry;
    const genome = genomeUxGenome(layout);
    const layoutEntry = await readGenomeUxLayout(project, layout);
    if (!layoutEntry && !genomeUxIsBase(layout)) throw new Error(`GENOME_UX_LAYOUT_MISSING: layouts["${layout}"] is not in the project config`);
    const all = listGenomeUxPages(project, module);
    if (!all.length) throw new Error(`GENOME_UX_PAGES_MISSING: no page11 defs in ${module}/web/desktop/page11`);
    const requested = entry.pages ?? [];
    const absent = requested.filter(page => !all.includes(page));
    if (absent.length) throw new Error(`GENOME_UX_PAGES_UNKNOWN: ${absent.join(', ')} (available: ${all.join(', ')})`);
    const runPages = requested.length ? all.filter(page => requested.includes(page)) : all;
    const run: GenomeUxRunArgs = { project, module, layout, runPages, subset: requested.length > 0, materialize: entry.materialize === true };

    // The catalog counts for reuse only when the UX uses molecules; an unreadable catalog leaves the decision to the worker.
    let catalogHash: string | undefined;
    if (genomeUxUseMolecules(layoutEntry)) { try { catalogHash = (await readGenomeUxInventory(project)).sourceHash; } catch { catalogHash = undefined; } }
    const pending: string[] = [];
    const reasons: string[] = [];
    for (const pageId of runPages) {
      if (entry.force) { pending.push(pageId); continue; }
      const check = await readGenomeUxPagePending(project, module, layout, pageId, { layoutEntry, ...(catalogHash === undefined ? {} : { catalogHash }) });
      if (!check.pending) continue;
      pending.push(pageId);
      reasons.push(`${pageId}: ${check.reason}`);
    }
    console.info(`[agentGenomeUx] ${module} UX ${layout} (${genome}): ${pending.length}/${runPages.length} page(s) to generate`, reasons);
    if (!pending.length) {
      return [...genomeUxCompletionSteps(run).map(item => addD2Step(context, parentStep.stepId, item)),
        updateD2Status(context, parentStep, step, hookSequential, 'completed', `All ${runPages.length} page(s) of ${genome} are fresh${genomeUxIsBase(layout) ? ' or have no UX 1 template choice' : ''}; nothing to generate.`)];
    }
    const workers = pending.map(pageId => addD2Step(context, parentStep.stepId, genomeUxPageStep({ ...run, pageId, stage: 'groups', attempt: 1 })));
    return [...workers, updateD2Status(context, parentStep, step, hookSequential, 'completed', `Planned ${workers.length} ${genome} page(s); ${runPages.length - pending.length} reused. ${reasons.join(' | ')}`)];
  } catch (error) {
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}
