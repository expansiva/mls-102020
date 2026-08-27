/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c4-less/agentCopyLess.ts" enhancement="_102027_/l2/enhancementAgent"/>

// c4-less (NO LLM): copies the stylesheet of every item that was not skipped.
// Verbatim + header. The Variant needs an LLM here because the theme changes the appearance;
// here the appearance does NOT change, which is why this step is a file copy.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  C_AGENT_FOLDER,
  cCompileAndPublishTs,
  cCompileLess,
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
import { renderCopiedLess } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cTemplates.js';
import { cDoneAnchor, cParseStepArgs, cResultStepIntent, cUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cSteps.js';
import { C_LESS_NON_BLOCKING, CGateIssue, runLessGate } from '/_102020_/l2/aura/molecules/agentCopyMolecule/steps/c4-less/gate.js';
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

  // PER ITEM, and NEVER blocking the pipeline — same shape as c5-demo, and for a hard reason
  // learned in the Studio on 2026-08-20: c3 had already written 24 files when this step failed on
  // ONE sheet, leaving 12 molecules without stylesheets. Failing here does not undo c3; it just
  // buries the molecule half-copied. So a bad item is reported and skipped, the good ones are
  // written, and the anchor carries ok:false for the summary to tell the truth.
  const written: string[] = [];
  const issues: CGateIssue[] = [];

  for (const item of itemsToWrite(ctx)) {
    // ALWAYS the sheet of the molecule that was asked for — for a shell, its own sheet is the
    // appearance the client chose; the parent's would undo the theme.
    const source = await readStorText(cMoleculeFile(item.origin.project, item.origin.group, item.origin.shortName, '.less'));
    if (!source.trim()) {
      issues.push({ code: 'source_less', message: `${item.origin.ref}: sem .less legível na origem — a cópia fica sem folha de estilo` });
      continue;
    }
    const less = renderCopiedLess(item, source, ctx.destProject);
    const itemIssues = runLessGate({ item, destProject: ctx.destProject, writtenLess: less, sourceIsShellSheet: true });
    const blocking = itemIssues.filter(issue => !C_LESS_NON_BLOCKING.includes(issue.code));
    issues.push(...itemIssues);
    if (blocking.length) continue;   // this item's sheet is skipped; the others still get theirs
    const shortName = copyShortName(item);
    const lessFileInfo = cDestMoleculeFile(item.destination.group, shortName, '.less');
    await writeStorTextAtomic(lessFileInfo, less, true);
    written.push(item.destination.files.less);

    // needCreateModel above is a no-op for .less (createStorFile's whitelist skips it — see
    // cCompileLess), so without this the sheet sits uncompiled and its sibling .ts never gets a
    // style to inject: create+compile the .less model...
    const lessErrors = await cCompileLess(lessFileInfo);
    if (lessErrors.length) {
      issues.push(...lessErrors.map(message => ({ code: 'less_compile', message: `${item.origin.ref}: ${message}` })));
      continue;   // a sheet that doesn't compile must not be reported as republished
    }

    // ...then recompile+republish the sibling .ts now that the .less model exists, so
    // enhancementAura's onAfterCompile (processCssLit.ts injectStyle) finds it and bakes the
    // style into the JS this run just published to the cache in c3-copy.
    const tsFileInfo = cDestMoleculeFile(item.destination.group, shortName, '.ts');
    const tsSource = await readStorText(tsFileInfo);
    const republishErrors = await cCompileAndPublishTs(tsFileInfo, tsSource, true);
    if (republishErrors.length) {
      issues.push(...republishErrors.map(message => ({ code: 'ts_republish', message: `${item.origin.ref}: ${message}` })));
    }
  }

  await writeJsonArtifact(cTraceFileInfo(runKey, PLAN_ID, 1), { savedAt: new Date().toISOString(), planId: PLAN_ID, written, issues });

  const blockingIssues = issues.filter(issue => !C_LESS_NON_BLOCKING.includes(issue.code));
  const ok = blockingIssues.length === 0;
  const trace = ok ? `${written.length} .less escrito(s)` : blockingIssues.map(issue => `${issue.code}: ${issue.message}`).join('\n');

  return [
    cResultStepIntent(context, parentStep, {
      planId: cDoneAnchor(PLAN_ID),
      dependsOn: [],
      stepTitle: !ok ? 'folhas com pendências' : !written.length ? 'nada a copiar' : written.length === 1 ? written[0] : `${written.length} folhas de estilo`,
      result: { ok, written, issues },
    }),
    cUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace, 'input_output'),
  ];
}
