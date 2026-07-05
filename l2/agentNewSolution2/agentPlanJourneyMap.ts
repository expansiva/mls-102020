/// <mls fileReference="_102020_/l2/agentNewSolution2/agentPlanJourneyMap.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Stage 1 journey contract. Turns embedded workflow/operation stories into a module-level navigation
// map: actor landings, workspaces, edges and input origins. It is still business intent, not layout.

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
import { getApprovedModuleName, journeyFileInfo, readJourneyDefs, saveAgentTrace, saveDefsArtifact } from '/_102020_/l2/agentNewSolution2/ns2Artifacts.js';
import { journeyMapResultSchema } from '/_102020_/l2/agentNewSolution2/ns2Schemas.js';
import { getFinalizeOutput } from '/_102020_/l2/agentNewSolution2/agentNs2Finalize.js';
import { getBehaviorIndex } from '/_102020_/l2/agentNewSolution2/agentClassifyBehavior.js';
import { getWorkflowDefinitions } from '/_102020_/l2/agentNewSolution2/agentNs2WorkflowDefinition.js';
import { getOperationDefinitions } from '/_102020_/l2/agentNewSolution2/agentPlanOperationDefinition.js';

const AGENT_NAME = 'agentPlanJourneyMap';
const TOOL_NAME = 'submitJourneyMap';

export type JourneyContextSource = 'userInput' | 'actorSession' | 'businessContext' | 'currentWorkspace' | 'selectedEntity' | 'activeLifecycleInstance' | 'workflowState' | 'routeParam' | 'previousStepOutput' | 'systemDefault';
export type JourneyWorkspaceKind = 'entityManagement' | 'workflow' | 'dashboard' | 'task' | 'support';

export interface JourneyLanding { actor: string; workspaceId: string; reason: string }
export interface JourneyWorkspace {
  workspaceId: string;
  title: string;
  actor: string;
  kind: JourneyWorkspaceKind;
  entity?: string;
  workflowId?: string;
  operationIds: string[];
  purpose: string;
}
export interface JourneyDataTransport { name: string; from: string; to: string; source: JourneyContextSource; description?: string }
export interface JourneyNavigationEdge { from: string; to: string; operationId?: string; trigger: string; data: JourneyDataTransport[]; description: string }
export interface JourneyInputResolution { operationId: string; inputId: string; source: JourneyContextSource; via: string; description: string }
export interface JourneyMap {
  moduleName: string;
  landings: JourneyLanding[];
  workspaces: JourneyWorkspace[];
  navigationEdges: JourneyNavigationEdge[];
  inputResolutions: JourneyInputResolution[];
  acceptanceAssertions: string[];
}
export interface JourneyMapResult { journeyMap: JourneyMap }
export type JourneyMapOutput = PlannerOutput<JourneyMapResult>;

const toolSchema = createPlannerToolSchema(TOOL_NAME, 'Submit the module journey map.', journeyMapResultSchema);

export function createAgent(): IAgentAsync {
  return { agentName: AGENT_NAME, agentProject: 102020, agentFolder: 'agentNewSolution2', agentDescription: 'Plan the L4 module journey map', visibility: 'private', beforePromptStep, afterPromptStep };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  if (!args) throw new Error(`[${AGENT_NAME}] args invalid`);
  const moduleName = getApprovedModuleName(context) || 'module';
  const fp = getFinalizeOutput(context).result;
  const behavior = getBehaviorIndex(context).result;
  const workflows = await getWorkflowDefinitions(context);
  const operations = await getOperationDefinitions(context);
  const reduced = {
    moduleName,
    actors: fp.actors,
    capabilities: fp.capabilities,
    workflows,
    operations,
    behaviorStories: behavior,
  };
  return [createPromptReadyIntent(context, parentStep, hookSequential, args, systemPrompt.split('{{toolName}}').join(TOOL_NAME), `## Reduced L4 behavior contract\n${JSON.stringify(reduced, null, 2)}\n`, toolSchema, TOOL_NAME)];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  let status: mls.msg.AIStepStatus = 'completed';
  let traceMsg: string | undefined;
  let output: JourneyMapOutput | undefined;
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
  if (status === 'completed' && output && output.status === 'ok') {
    try {
      const moduleName = getApprovedModuleName(context) || output.result.journeyMap.moduleName || 'module';
      output.result.journeyMap.moduleName = moduleName;
      await saveDefsArtifact(journeyFileInfo(moduleName), `${moduleName}Journeys`, output.result.journeyMap);
    } catch (error) {
      console.warn(`[${AGENT_NAME}] save failed`, error);
    }
  }
  await saveAgentTrace(context, AGENT_NAME, step);
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, status, traceMsg)];
}

export async function getJourneyMap(context: mls.msg.ExecutionContext): Promise<JourneyMap | null> {
  const moduleName = getApprovedModuleName(context) || 'module';
  const defs = await readJourneyDefs(moduleName);
  const fromFile = defs.find(def => typeof def.moduleName === 'string') as JourneyMap | undefined;
  if (fromFile) return fromFile;
  try {
    const output = getPlannerOutput(context, AGENT_NAME, config);
    return output.status === 'ok' ? output.result.journeyMap : null;
  } catch {
    return null;
  }
}

const config: PlannerExtractConfig<JourneyMapResult> = { toolName: TOOL_NAME, normalizeResult };

function normalizeResult(value: unknown): JourneyMapResult {
  const result = assertRecord(value, 'result');
  const raw = assertRecord(result.journeyMap, 'result.journeyMap');
  return {
    journeyMap: {
      moduleName: assertString(raw.moduleName, 'result.journeyMap.moduleName'),
      landings: assertArray(raw.landings || [], 'result.journeyMap.landings').map(normalizeLanding),
      workspaces: assertArray(raw.workspaces || [], 'result.journeyMap.workspaces').map(normalizeWorkspace),
      navigationEdges: assertArray(raw.navigationEdges || [], 'result.journeyMap.navigationEdges').map(normalizeEdge),
      inputResolutions: assertArray(raw.inputResolutions || [], 'result.journeyMap.inputResolutions').map(normalizeInputResolution),
      acceptanceAssertions: normalizeStringList(raw.acceptanceAssertions, 'result.journeyMap.acceptanceAssertions'),
    },
  };
}

function normalizeLanding(item: unknown, index: number): JourneyLanding {
  const landing = assertRecord(item, `result.journeyMap.landings[${index}]`);
  return {
    actor: assertString(landing.actor, `landings[${index}].actor`),
    workspaceId: assertString(landing.workspaceId, `landings[${index}].workspaceId`),
    reason: assertString(landing.reason, `landings[${index}].reason`),
  };
}

function normalizeWorkspace(item: unknown, index: number): JourneyWorkspace {
  const workspace = assertRecord(item, `result.journeyMap.workspaces[${index}]`);
  return {
    workspaceId: assertString(workspace.workspaceId, `workspaces[${index}].workspaceId`),
    title: assertString(workspace.title, `workspaces[${index}].title`),
    actor: assertString(workspace.actor, `workspaces[${index}].actor`),
    kind: normalizeWorkspaceKind(workspace.kind, `workspaces[${index}].kind`),
    entity: optionalString(workspace.entity),
    workflowId: optionalString(workspace.workflowId),
    operationIds: normalizeStringList(workspace.operationIds, `workspaces[${index}].operationIds`),
    purpose: assertString(workspace.purpose, `workspaces[${index}].purpose`),
  };
}

function normalizeEdge(item: unknown, index: number): JourneyNavigationEdge {
  const edge = assertRecord(item, `result.journeyMap.navigationEdges[${index}]`);
  return {
    from: assertString(edge.from, `navigationEdges[${index}].from`),
    to: assertString(edge.to, `navigationEdges[${index}].to`),
    operationId: optionalString(edge.operationId),
    trigger: assertString(edge.trigger, `navigationEdges[${index}].trigger`),
    data: assertArray(edge.data || [], `navigationEdges[${index}].data`).map(normalizeTransport),
    description: assertString(edge.description, `navigationEdges[${index}].description`),
  };
}

function normalizeTransport(item: unknown, index: number): JourneyDataTransport {
  const data = assertRecord(item, `data[${index}]`);
  return {
    name: assertString(data.name, `data[${index}].name`),
    from: assertString(data.from, `data[${index}].from`),
    to: assertString(data.to, `data[${index}].to`),
    source: normalizeContextSource(data.source, `data[${index}].source`),
    description: optionalString(data.description),
  };
}

function normalizeInputResolution(item: unknown, index: number): JourneyInputResolution {
  const resolution = assertRecord(item, `result.journeyMap.inputResolutions[${index}]`);
  return {
    operationId: assertString(resolution.operationId, `inputResolutions[${index}].operationId`),
    inputId: assertString(resolution.inputId, `inputResolutions[${index}].inputId`),
    source: normalizeContextSource(resolution.source, `inputResolutions[${index}].source`),
    via: assertString(resolution.via, `inputResolutions[${index}].via`),
    description: assertString(resolution.description, `inputResolutions[${index}].description`),
  };
}

function normalizeWorkspaceKind(value: unknown, path: string): JourneyWorkspaceKind {
  const kind = assertString(value, path) as JourneyWorkspaceKind;
  if (['entityManagement', 'workflow', 'dashboard', 'task', 'support'].includes(kind)) return kind;
  throw new Error(`${path} invalid`);
}

function normalizeContextSource(value: unknown, path: string): JourneyContextSource {
  const source = assertString(value, path) as JourneyContextSource;
  if (['userInput', 'actorSession', 'businessContext', 'currentWorkspace', 'selectedEntity', 'activeLifecycleInstance', 'workflowState', 'routeParam', 'previousStepOutput', 'systemDefault'].includes(source)) return source;
  throw new Error(`${path} invalid`);
}

const systemPrompt = `
<!-- modelType: codereasoning -->
<!-- x-tool-strict: true -->

You are ${AGENT_NAME} for the collab.codes "newSolution2" flow (Stage 1).
Create the module-level L4 journey map from the frozen workflows and operations.

Call the "{{toolName}}" tool with: status, result, questions, trace. Do not return prose.

The journey map is a business/navigation contract, NOT UI layout. It tells Stage 2 how the actor
reaches capabilities, how operations are grouped into workspaces, and where required ids come from.
It must not mention components, CSS, molecules, cards, tables, responsive layout or visual design.

In result.journeyMap:
- moduleName: the provided module name.
- landings[]: one landing workspace for every actor that owns now/soon/later behavior.
- workspaces[]: group operations by the user's natural job. Use kind entityManagement for CRUD over
  the same entity, workflow for lifecycle work, dashboard for query/report views, task/support as
  needed. Keep the underlying operationIds explicit and separate.
- navigationEdges[]: directed edges between workspaces. Each edge declares the trigger and the data
  transported, such as a selected entity id from a list/search step to a detail/action step.
- inputResolutions[]: one row for each required technical identifier that comes from journey state,
  selection, route params or a previous step. Local runtime sources (actorSession, businessContext,
  currentWorkspace, systemDefault) do not need a journey row unless the value is also transported between workspaces.
  The source must match one of the operation input sources.
- acceptanceAssertions[]: objective journey checks, such as "actor can open the workspace without
  typing a technical id" or "the action receives the selected entity id from the journey".

Rules:
- Every operation with priority now must be reachable from a landing through a workspace and/or edge.
- navigationEdges[] cannot be empty when there is more than one reachable step. Declare the minimal
  edges needed for the business journey: entity management list -> detail/action with the selected
  Entity.id transported, and workflow step -> next step with the workflow entity id transported.
- Required technical id inputs should come from selectedEntity, routeParam, activeLifecycleInstance,
  workflowState, previousStepOutput or local runtime context (actorSession/businessContext/
  currentWorkspace/systemDefault). Use businessContext.activeCompanyId for business company scope; do
  not use currentWorkspace as a company filter. Do not model "type a raw id manually" as a normal journey.
- For entityManagement workspaces, model the list-to-action transition explicitly. A self-edge is
  acceptable when the list/detail/action live in the same workspace, but its data[] must still carry
  the selected entity id using the source selectedEntity.
- routeParam and previousStepOutput inputs must have a matching inputResolution AND an edge data row
  that explains where the value travels from.
- selectedEntity, activeLifecycleInstance and workflowState technical ids must have inputResolution
  rows explaining the selection or lifecycle/workflow state that supplies the id.
- A workspace actor must be authorized for every operation it exposes.
- entityManagement is an experience grouping only; do not merge or delete operation contracts.
- Prefer simple, obvious workspaces over speculative UX structure.

`;
