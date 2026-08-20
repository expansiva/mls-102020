/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c4-less/agentCopyLess.ts" enhancement="_102027_/l2/enhancementAgent"/>

// c4-less (NO LLM): copies the stylesheet of every item that was not skipped.
// Verbatim + header. The Variant needs an LLM here because the theme changes the appearance;
// here the appearance does NOT change, which is why this step is a file copy.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  C_AGENT_FOLDER,
  cContextFileInfo,
  cDestMoleculeFile,
  cMoleculeFile,
  cTraceFileInfo,
  readJsonArtifact,
  readStorText,
  writeJsonArtifact,
  writeStorTextAtomic,
} from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cFs.js';
import { CopyContext, CopyItem, copyShortName, itemsToWrite } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { renderCopiedLess } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cTemplates.js';
import { cDoneAnchor, cParseStepArgs, cResultStepIntent, cUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cSteps.js';
import { CGateIssue, runLessGate } from '/_102020_/l2/aura/molecules/agentCopyMolecule/steps/c4-less/gate.js';
import { getCRunKey } from '/_102020_/l2/aura/molecules/agentCopyMolecule/agentCopyMolecule.js';

const AGENT_NAME = 'agentCopyLess';
const PLAN_ID = 'c4-less';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${C_AGENT_FOLDER}/steps/c4-less`,
    agentDescription: 'c4-less — copies the molecule stylesheet verbatim (the shell sheet when flattening)',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);

  const runKey = getCRunKey(context, cParseStepArgs(args || step.prompt).runKey);
  const ctx = await readJsonArtifact<CopyContext>(cContextFileInfo(runKey), true);
  if (!ctx) throw new Error(`[${AGENT_NAME}] context.json missing for ${runKey}`);

  // Cancelled run (c2): no-op, but ANCHOR — the pipeline has to reach the summary so the user is
  // told the run ended and nothing was written (T2 lesson, 2026-08-20).
  if (ctx.cancelled) {
    return [
      cResultStepIntent(context, parentStep, {
        planId: cDoneAnchor('c4-less'),
        dependsOn: [],
        stepTitle: 'cancelado — nada escrito',
        result: { cancelled: true, written: [] },
      }),
      cUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'cancelado pelo usuário', 'input_output'),
    ];
  }

  const pending = itemsToWrite(ctx);
  const prepared: { item: CopyItem; less: string }[] = [];
  const issues: CGateIssue[] = [];

  for (const item of pending) {
    // ALWAYS the sheet of the molecule that was asked for — for a shell, its own sheet is the
    // appearance the client chose; the parent's would undo the theme.
    const source = await readStorText(cMoleculeFile(item.origin.project, item.origin.group, item.origin.shortName, '.less'));
    if (!source.trim()) {
      issues.push({ code: 'source_less', message: `${item.origin.ref}: .less de origem ilegível` });
      continue;
    }
    const less = renderCopiedLess(item, source, ctx.destProject);
    prepared.push({ item, less });
    issues.push(...runLessGate({ item, destProject: ctx.destProject, writtenLess: less, sourceIsShellSheet: true }));
  }

  if (issues.length) {
    const message = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeJsonArtifact(cTraceFileInfo(runKey, PLAN_ID, 1), { savedAt: new Date().toISOString(), planId: PLAN_ID, issues });
    return [cUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }

  const written: string[] = [];
  for (const entry of prepared) {
    await writeStorTextAtomic(cDestMoleculeFile(entry.item.destination.group, copyShortName(entry.item), '.less'), entry.less, true);
    written.push(entry.item.destination.files.less);
  }

  await writeJsonArtifact(cTraceFileInfo(runKey, PLAN_ID, 1), { savedAt: new Date().toISOString(), planId: PLAN_ID, written });

  return [
    cResultStepIntent(context, parentStep, {
      planId: cDoneAnchor(PLAN_ID),
      dependsOn: [],
      stepTitle: !written.length ? 'nada a copiar' : written.length === 1 ? written[0] : `${written.length} folhas de estilo`,
      result: { written },
    }),
    cUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `${written.length} .less escrito(s)`, 'input_output'),
  ];
}
