/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c5-demo/agentCopyDemo.ts" enhancement="_102027_/l2/enhancementAgent"/>

// c5-demo (NO LLM, NON-BLOCKING): copies the .html demo page of every item.
// The molecule's sibling .html IS its demo. It carries no mls header (0 of 153 measured), so on
// the default path this is a byte-for-byte copy.
//
// A failure here NEVER blocks the summary: the anchor lands with ok:false and c6 reports it. A
// molecule without its demo is usable; a pipeline that dies at the demo is not.

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
import { CopyContext, copyShortName, itemsToWrite } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { renderCopiedHtml } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cTemplates.js';
import { cDoneAnchor, cParseStepArgs, cResultStepIntent, cUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cSteps.js';
import { CGateIssue, runDemoGate } from '/_102020_/l2/aura/molecules/agentCopyMolecule/steps/c5-demo/gate.js';
import { getCRunKey } from '/_102020_/l2/aura/molecules/agentCopyMolecule/agentCopyMolecule.js';

const AGENT_NAME = 'agentCopyDemo';
const PLAN_ID = 'c5-demo';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${C_AGENT_FOLDER}/steps/c5-demo`,
    agentDescription: 'c5-demo — copies the demo .html of each molecule (never blocks the pipeline)',
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

  const written: string[] = [];
  const issues: CGateIssue[] = [];

  for (const item of itemsToWrite(ctx)) {
    const source = await readStorText(cMoleculeFile(item.origin.project, item.origin.group, item.origin.shortName, '.html'));
    if (!source.trim()) {
      issues.push({ code: 'source_html', message: `${item.origin.ref}: sem página de demonstração legível na origem` });
      continue;
    }
    const html = renderCopiedHtml(item, source);
    const itemIssues = runDemoGate({ item, writtenHtml: html });
    if (itemIssues.length) {
      issues.push(...itemIssues);
      continue;   // this item's demo is skipped; the others still get theirs
    }
    await writeStorTextAtomic(cDestMoleculeFile(item.destination.group, copyShortName(item), '.html'), html, true);
    written.push(item.destination.files.html);
  }

  await writeJsonArtifact(cTraceFileInfo(runKey, PLAN_ID, 1), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    written,
    issues,
  });

  const ok = issues.length === 0;
  const trace = ok ? `${written.length} demo(s) copiada(s)` : issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');

  // The anchor lands EITHER WAY (ok:false when something failed) — c6 reads it and reports.
  return [
    cResultStepIntent(context, parentStep, {
      planId: cDoneAnchor(PLAN_ID),
      dependsOn: [],
      stepTitle: !ok ? 'demo com pendências' : !written.length ? 'nada a copiar' : written.length === 1 ? written[0] : `${written.length} páginas de demonstração`,
      result: { ok, written, issues },
    }),
    cUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace, 'input_output'),
  ];
}
