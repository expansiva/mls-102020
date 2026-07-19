/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/rebuild-defs-cleanup/agentCfeRebuildDefsCleanup.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Terminal step for the `/rebuild defs` CLI command only (no LLM). After the create phases have
// regenerated every .defs.ts, this soft-deletes the DERIVED frontend artifacts (materialized .ts
// render/shared/contract outputs AND their .test.ts) so the module's l2 web tree keeps ONLY the
// .defs.ts source of truth. A later `/run` re-materializes the .ts from the fresh defs.
//
// Runs after `verify-create-layouts` (dependsOn) so it never races the defs regeneration. Deletion
// is a soft-delete (deleteFile -> status='deleted', recoverable from the collab-fs trash), scoped to
// the create run's modules and to the generated frontend folders (web/contracts, web/shared,
// web/desktop/pageN, web/mobile/pageN). .defs.ts is preserved (distinct extension); non-frontend l2
// files such as designSystem.ts / project.ts live at the l2 root folder and never match.
//
// F3 exception: the per-bffCall contract .ts under web/contracts is a DETERMINISTIC byte-copy of the
// l4 contract of record (not an LLM-materialized artifact), so it is the source of truth for the wire
// types and is PRESERVED (identified by the "copied from l4" marker). Only genuinely derived .ts go.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { deleteFile } from '/_102027_/l2/libStor.js';
import { createUpdateStatusIntent } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';
import { isCopiedL4Contract } from '/_102020_/l2/agentChangeFrontend/helpers/cfeL4Contract.js';

interface CleanupArgs {
  modules: string[];
}

const AGENT_NAME = 'agentCfeRebuildDefsCleanup';
const MAX_TRACE_PATHS = 60;

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/rebuild-defs-cleanup',
    agentDescription: 'Soft-delete derived frontend .ts/.test.ts after a /rebuild defs, keeping only .defs.ts',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const { modules } = parseArgs(step.prompt);
    const project = mls.actualProject || 0;
    const deleted: string[] = [];

    let keptContracts = 0;
    let keptDefs = 0;
    for (const file of Object.values(mls.stor.files) as any[]) {
      if (!file || file.project !== project || file.level !== 2 || file.status === 'deleted') continue;
      const folder = String(file.folder || '');
      if (!isGeneratedFrontendFolder(folder, modules)) continue;
      if (file.extension === '.defs.ts') { keptDefs += 1; continue; }
      if (file.extension !== '.ts' && file.extension !== '.test.ts') continue;
      // Preserve the deterministic l4 contract byte-copies (F3): they are the wire contract of record.
      if (file.extension === '.ts' && /\/web\/contracts$/.test(folder) && isCopiedL4Contract(String(await file.getContent()))) {
        keptContracts += 1;
        continue;
      }
      await deleteFile(file);
      deleted.push(`_${project}_/l2/${folder}/${file.shortName}${file.extension}`);
    }

    // F2: defs-only run — report the defs written and that nothing was materialized.
    const keptNote = keptContracts > 0 ? `, kept ${keptContracts} l4 contract copy/-ies` : '';
    const summaryLine = `rebuild-defs: ${keptDefs} defs gravados, 0 materializados (${deleted.length} .ts derivados removidos${keptNote})`;
    const trace = deleted.length === 0
      ? `${summaryLine} — nenhum .ts/.test.ts derivado para remover`
      : `${summaryLine}:\n${summarize(deleted)}`;
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace)];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    // Best-effort cleanup: a failure here must not fail the whole rebuild-defs tree — the defs are
    // already regenerated and the stale .ts are recoverable and re-materializable.
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `REBUILD-DEFS-CLEANUP-SKIPPED: ${message}`)];
  }
}

// Generated frontend TS live under <module>/web/{contracts|shared|desktop/pageN|mobile/pageN}. Scope
// the sweep to the create run's modules so a rebuild-defs of one module never touches another.
function isGeneratedFrontendFolder(folder: string, modules: string[]): boolean {
  if (!modules.some(module => module && folder.startsWith(`${module}/web/`))) return false;
  return /\/web\/contracts$/.test(folder)
    || /\/web\/shared$/.test(folder)
    || /\/web\/desktop\/page\d+$/.test(folder)
    || /\/web\/mobile\/page\d+$/.test(folder);
}

function summarize(paths: string[]): string {
  if (paths.length <= MAX_TRACE_PATHS) return paths.join('\n');
  return `${paths.slice(0, MAX_TRACE_PATHS).join('\n')}\n…(+${paths.length - MAX_TRACE_PATHS} more)`;
}

function parseArgs(prompt: string | undefined): CleanupArgs {
  const parsed = prompt ? JSON.parse(prompt) as Record<string, unknown> : {};
  const modules = Array.isArray(parsed.modules)
    ? parsed.modules.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  return { modules };
}
