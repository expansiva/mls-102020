/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNs2Mdm.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Plan MDM domains as REFERENCES (Stage 1 does not materialize tables). When a domain reuses the
// shared MDM infra it records a l5/project.json dependency on project 102034.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  PlannerExtractConfig,
  PlannerOutput,
  assertArray,
  assertRecord,
  assertString,
  createPromptReadyIntent,
  createUpdateStatusIntent,
  getPlannerOutput,
  normalizeStringList,
  optionalString,
} from '/_102020_/l2/agentNewSolution2/ns2Shared.js';
import { createPlannerToolSchema, extractPlannerOutput } from '/_102020_/l2/agentNewSolution2/ns2Extract.js';
import { getApprovedModuleName, mergeProjectJson, saveAgentTrace } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { mdmResultSchema } from '/_102020_/l2/agentNewSolution2/ns2Schemas.js';
import { getFinalizeOutput } from '/_102020_/l2/agentNewSolution2/agentNs2Finalize.js';

const AGENT_NAME = 'agentNs2Mdm';
const TOOL_NAME = 'submitMdmPlan';

export interface MdmDomain { domainId: string; title: string; masterEntities: string[]; resolution: 'referenceSharedInfra' | 'draft'; reason?: string }
export interface MdmResult { mdmDomains: MdmDomain[] }
export type MdmOutput = PlannerOutput<MdmResult>;

const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the MDM domain references.', mdmResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Plan MDM domain references', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`[${AGENT_NAME}] args invalid`);
  const fp = getFinalizeOutput(context).result;
  const human = `## Ontology entities (map)\n${JSON.stringify(Object.keys(fp.ontology.entities), null, 2)}\n\n## MDM signals\n${JSON.stringify(fp.approvedArtifacts.mdm, null, 2)}\n`;
  return [createPromptReadyIntent(context, parentStep, hookSequential, args, systemPrompt.split('{{toolName}}').join(TOOL_NAME), human, toolSchema, TOOL_NAME)];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let status: mls.msg.AIStepStatus = 'completed';
  let traceMsg: string | undefined;
  let output: MdmOutput | undefined;
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) throw new Error('missing payload');
    output = extractPlannerOutput(payload, config);
    if (output.status === 'failed') { status = 'failed'; traceMsg = `${AGENT_NAME} returned failed`; }
  } catch (error) {
    status = 'failed';
    traceMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${AGENT_NAME}] ${traceMsg}`);
  }
  if (status === 'completed' && output && output.status === 'ok' && getApprovedModuleName(context) && output.result.mdmDomains.some(d => d.resolution === 'referenceSharedInfra')) {
    try {
      await mergeProjectJson({ moduleName: getApprovedModuleName(context) as string }, [{ projectId: '102034', kind: 'mdm-infrastructure' }]);
    } catch (error) {
      console.warn(`[${AGENT_NAME}] project.json dependency merge failed`, error);
    }
  }
  await saveAgentTrace(context, AGENT_NAME, step);
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg)];
}

export function getMdmOutput(context: mls.msg.ExecutionContext): MdmOutput | null {
  try { return getPlannerOutput(context, AGENT_NAME, config); } catch { return null; }
}

const config: PlannerExtractConfig<MdmResult> = { toolName: TOOL_NAME, normalizeResult };

function normalizeResult(value: unknown): MdmResult {
  const result = assertRecord(value, 'result');
  const mdmDomains = assertArray(result.mdmDomains || [], 'result.mdmDomains').map((item, index) => {
    const d = assertRecord(item, `result.mdmDomains[${index}]`);
    return {
      domainId: assertString(d.domainId, `result.mdmDomains[${index}].domainId`),
      title: optionalString(d.title) || '',
      masterEntities: normalizeStringList(d.masterEntities, `result.mdmDomains[${index}].masterEntities`),
      resolution: d.resolution === 'draft' ? 'draft' as const : 'referenceSharedInfra' as const,
      reason: optionalString(d.reason),
    };
  });
  return { mdmDomains };
}

const systemPrompt = `
<!-- modelType: codeinstruct -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME} for the collab.codes "newSolution2" flow (Stage 1).
Plan the MDM (master data) domains as REFERENCES. Stage 1 does not create tables.

Call the "{{toolName}}" tool with: status, result, questions, trace. Do not return prose.

In result.mdmDomains, each: domainId (camelCase), title, masterEntities (ontology entity ids),
resolution ('referenceSharedInfra' when the shared MDM infra fits, else 'draft'), reason.
Use canonical ontology ids for masterEntities. Return an empty array when there is no master data.
masterEntities are ONLY stable cadastral records (identity/registration), accessed by id with a
cadastral status (active/inactive). NEVER list an entity that holds operational/transactional state
(occupied/available, open/closed, balances, current charges) — that lives in a kind=core entity, not MDM.
Every listed master entity must already be modeled in ontology as ownership=mdmOwned, kind=mdm with
moduleType and mdmSubtype; relationships/anchors are modeled in the ontology relationships, not here.

`;
