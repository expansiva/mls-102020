/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c3-copy/agentCopyFiles.ts" enhancement="_102027_/l2/enhancementAgent"/>

// c3-copy (NO LLM): writes the .ts and the .defs.ts of every item that was not skipped.
// The FIRST step that writes into l2 — everything before it is admission and decision.
// See flow.json; the sources of each artifact in the flattened path are in spec.md.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  C_AGENT_FOLDER,
  cCompileAndPublishTs,
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
import { renderCopiedDefs, renderCopiedTs } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cTemplates.js';
import { cDoneAnchor, cParseStepArgs, cResultStepIntent, cUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cSteps.js';
import { CGateIssue, runCopyGate } from '/_102020_/l2/aura/molecules/agentCopyMolecule/steps/c3-copy/gate.js';
import { getCRunKey } from '/_102020_/l2/aura/molecules/agentCopyMolecule/agentCopyMolecule.js';

const AGENT_NAME = 'agentCopyFiles';
const PLAN_ID = 'c3-copy';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${C_AGENT_FOLDER}/steps/c3-copy`,
    agentDescription: 'c3-copy — writes the copied .ts (real code, flattened when the origin is a shell) and .defs.ts',
    visibility: 'private',
    beforePromptStep,
  };
}

interface PreparedItem {
  item: CopyItem;
  ts: string;
  defs: string;
  sourceTs: string;
  sourceDefs: string;
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
        planId: cDoneAnchor('c3-copy'),
        dependsOn: [],
        stepTitle: 'cancelado — nada escrito',
        result: { cancelled: true, written: [] },
      }),
      cUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'cancelado pelo usuário', 'input_output'),
    ];
  }

  const pending = itemsToWrite(ctx);
  const prepared: PreparedItem[] = [];
  const issues: CGateIssue[] = [];

  // Render + gate EVERY item before writing the first byte: a batch that fails midway is the
  // half-state this pipeline refuses.
  for (const item of pending) {
    const sources = await loadSources(item);
    if (!sources.ts.trim()) {
      issues.push({ code: 'source_ts', message: `${item.origin.ref}: .ts de origem ficou ilegível entre a admissão e a cópia` });
      continue;
    }
    const ts = renderCopiedTs(item, sources.ts, ctx.destProject, ctx.copiedFromDate);
    const defs = sources.defs.trim()
      ? renderCopiedDefs(item, sources.defs, ctx.destProject, ctx.copiedFromDate, sources.defsFromParent)
      : '';
    if (!defs) {
      // Neither the molecule nor its parent has a .defs.ts. It is a contract other routines
      // read, so its absence is named — but it does not stop the copy.
      issues.push({ code: 'defs_missing', message: `${item.origin.ref}: sem .defs.ts legível (nem na origem, nem no pai) — o contrato não acompanha a cópia` });
    }
    prepared.push({ item, ts, defs, sourceTs: sources.ts, sourceDefs: sources.defs });
    issues.push(...runCopyGate({
      item,
      destProject: ctx.destProject,
      sourceTs: sources.ts,
      writtenTs: ts,
      sourceDefs: sources.defs,
      writtenDefs: defs,
    }));
  }

  const blocking = issues.filter(issue => issue.code !== 'defs_missing');
  if (blocking.length) {
    const message = blocking.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeJsonArtifact(cTraceFileInfo(runKey, PLAN_ID, 1), { savedAt: new Date().toISOString(), planId: PLAN_ID, issues: blocking });
    return [cUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }

  // Writing alone leaves the copy inert (§3 of the todo): a file that was written but never
  // compiled+published only "works" after a human opens it in the editor and saves — the exact
  // gesture cCompileAndPublishTs replicates programmatically. runAfterCompile:true on the .ts so
  // enhancementAura's onAfterCompile runs (it will find no .less yet at this point — c4-less
  // republishes once the sheet exists); .defs.ts needs no post-process, only the cache entry.
  const written: string[] = [];
  const compileIssues: CGateIssue[] = [];
  for (const entry of prepared) {
    const shortName = copyShortName(entry.item);
    const ref = entry.item.origin.ref;

    const tsFileInfo = cDestMoleculeFile(entry.item.destination.group, shortName, '.ts');
    await writeStorTextAtomic(tsFileInfo, entry.ts, true);
    written.push(entry.item.destination.files.ts);
    const tsErrors = await cCompileAndPublishTs(tsFileInfo, entry.ts, true);
    compileIssues.push(...tsErrors.map(message => ({ code: 'compile_ts', message: `${ref}: ${message}` })));

    if (entry.defs) {
      const defsFileInfo = cDestMoleculeFile(entry.item.destination.group, shortName, '.defs.ts');
      await writeStorTextAtomic(defsFileInfo, entry.defs, true);
      written.push(entry.item.destination.files.defs);
      const defsErrors = await cCompileAndPublishTs(defsFileInfo, entry.defs, false);
      compileIssues.push(...defsErrors.map(message => ({ code: 'compile_defs', message: `${ref}: ${message}` })));
    }
  }

  if (compileIssues.length) {
    const message = compileIssues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
    await writeJsonArtifact(cTraceFileInfo(runKey, PLAN_ID, 1), { savedAt: new Date().toISOString(), planId: PLAN_ID, written, compileIssues });
    return [cUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }

  await writeJsonArtifact(cTraceFileInfo(runKey, PLAN_ID, 1), {
    savedAt: new Date().toISOString(),
    planId: PLAN_ID,
    written,
    skipped: ctx.items.filter(item => item.skip).map(item => item.origin.ref),
    warnings: issues.filter(issue => issue.code === 'defs_missing'),
  });

  // Everything skipped is a REAL path (batch + 'ignore existing ones' where all existed): the
  // run succeeded and copied nothing, and the title has to say that instead of '0 moléculas'.
  const title = !pending.length
    ? 'nada a copiar — todas já existiam'
    : pending.length === 1 ? written[0] : `${pending.length} moléculas: .ts + .defs`;
  return [
    cResultStepIntent(context, parentStep, {
      planId: cDoneAnchor(PLAN_ID),
      dependsOn: [],
      stepTitle: title,
      result: { written, skipped: ctx.items.filter(item => item.skip).length },
    }),
    cUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `${written.length} arquivo(s) escrito(s)`, 'input_output'),
  ];
}

// WHERE each source comes from (spec.md, medido 19/08):
//  - default: the molecule itself;
//  - flattened shell: the .ts from the PARENT (that is where the real code and the i18n block
//    are), and the .defs.ts from the SHELL when it has one — all 42 shells of 102055 do, but
//    only 1 of 42 in 102054 — otherwise from the parent, with the TagName swapped.
async function loadSources(item: CopyItem): Promise<{ ts: string; defs: string; defsFromParent: boolean }> {
  const origin = item.origin;
  const ownDefs = await readStorText(cMoleculeFile(origin.project, origin.group, origin.shortName, '.defs.ts'));

  if (!origin.chain.isShell) {
    const ts = await readStorText(cMoleculeFile(origin.project, origin.group, origin.shortName, '.ts'));
    return { ts, defs: ownDefs, defsFromParent: false };
  }

  const parentProject = origin.chain.parentProject as number;
  const parentGroup = origin.chain.parentGroup as string;
  const parentShortName = origin.chain.parentShortName as string;
  const parentTs = await readStorText(cMoleculeFile(parentProject, parentGroup, parentShortName, '.ts'));
  if (ownDefs.trim()) return { ts: parentTs, defs: ownDefs, defsFromParent: false };
  const parentDefs = await readStorText(cMoleculeFile(parentProject, parentGroup, parentShortName, '.defs.ts'));
  return { ts: parentTs, defs: parentDefs, defsFromParent: true };
}
