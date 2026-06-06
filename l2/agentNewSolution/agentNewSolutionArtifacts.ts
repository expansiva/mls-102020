/// <mls fileReference="_102020_/l2/agentNewSolution/agentNewSolutionArtifacts.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { createStorFile } from '/_102027_/l2/libStor.js';
import { getAgentStepByAgentName } from '/_102027_/l2/aiAgentHelper.js';
import {
  normalizeModuleFolderName,
  reserveModuleNameFromFolders,
} from '/_102020_/l2/agentNewSolution/agentNewSolutionPlan.js';

export { normalizeModuleFolderName };

export interface NewSolutionInitialArtifactInfo {
  moduleName?: string;
  requestKind?: string;
  userLanguage?: string;
  userPrompt?: string;
}

export function reserveAvailableModuleName(requestedName: unknown, fallbackPrompt: string): string {
  return reserveModuleNameFromFolders(requestedName, fallbackPrompt, getExistingModuleFolders());
}

export async function reserveNewSolutionModuleArtifacts(initial: NewSolutionInitialArtifactInfo): Promise<void> {
  const moduleName = normalizeModuleFolderName(initial.moduleName, initial.userPrompt || 'module');
  const source = `export const initial = ${JSON.stringify({
    moduleName,
    requestKind: initial.requestKind || 'module_solution',
    userLanguage: initial.userLanguage || 'pt-BR',
    userPrompt: initial.userPrompt || '',
    createdAt: new Date().toISOString(),
  }, null, 2)} as const;\n`;

  await saveStorContent({
    project: mls.actualProject || 0,
    level: 2,
    folder: moduleName,
    shortName: 'module',
    extension: '.defs.ts',
  }, source, false);
}

export async function saveNewSolutionAgentTracePayload(
  context: mls.msg.ExecutionContext,
  agentName: string,
  step: mls.msg.AIAgentStep,
  moduleNameOverride?: string,
): Promise<void> {
  try {
    const payload = step.interaction?.payload?.[0];
    if (!payload) return;

    const moduleName = normalizeModuleFolderName(moduleNameOverride || getPayloadModuleName(payload) || getInitialModuleName(context), 'module');
    const trace = {
      savedAt: new Date().toISOString(),
      agentName,
      stepId: step.stepId,
      planning: (step as any).planning || null,
      status: step.status,
      payload,
    };

    await saveStorContent({
      project: mls.actualProject || 0,
      level: 2,
      folder: `${moduleName}/trace`,
      shortName: getTraceShortName(agentName, step.stepId),
      extension: '.json',
    }, JSON.stringify(trace, null, 2), false);
  } catch (error) {
    console.warn(`[saveNewSolutionAgentTracePayload] failed for ${agentName}`, error);
  }
}

function getInitialModuleName(context: mls.msg.ExecutionContext): string {
  if (!context.task) return 'module';
  const agentStep = getAgentStepByAgentName(context.task, 'agentNewSolution') as mls.msg.AIAgentStep | null;
  const payload = agentStep?.interaction?.payload?.[0] as mls.msg.AIFlexibleResultStep | undefined;
  const result = payload?.type === 'flexible' && payload.result && typeof payload.result === 'object'
    ? payload.result as NewSolutionInitialArtifactInfo
    : undefined;

  return result?.moduleName || normalizeModuleFolderName(undefined, result?.userPrompt || 'module');
}

function getPayloadModuleName(payload: unknown): string | undefined {
  const value = parseMaybeJson(payload);
  const direct = getModuleNameFromPlannerResult(value);
  if (direct) return direct;
  if (!isRecord(value)) return undefined;

  const flexibleResult = parseMaybeJson(value.result);
  const flexibleModule = getModuleNameFromPlannerResult(flexibleResult);
  if (flexibleModule) return flexibleModule;
  if (!isRecord(flexibleResult)) return undefined;

  const toolArguments = parseMaybeJson(flexibleResult.arguments);
  const toolModule = getModuleNameFromPlannerResult(toolArguments);
  if (toolModule) return toolModule;
  if (!isRecord(toolArguments)) return undefined;

  const plannerEnvelope = parseMaybeJson(toolArguments.result);
  const envelopeModule = getModuleNameFromPlannerResult(plannerEnvelope);
  if (envelopeModule) return envelopeModule;
  if (!isRecord(plannerEnvelope)) return undefined;

  return getModuleNameFromPlannerResult(plannerEnvelope.result);
}

function getModuleNameFromPlannerResult(value: unknown): string | undefined {
  const record = parseMaybeJson(value);
  if (!isRecord(record)) return undefined;

  return readString(record.moduleName)
    || readString(getRecord(record.module)?.moduleName)
    || readString(getRecord(record.persistenceScope)?.moduleId)
    || readString(getRecord(record.tableDefinition)?.moduleId)
    || readString(getRecord(record.metricTableDefinition)?.moduleId)
    || readString(getRecord(record.defsPlan)?.moduleId);
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function getExistingModuleFolders(): Set<string> {
  const actualProject = mls.actualProject || 0;
  const folders = Object.values(mls.stor.files)
    .filter(f => f.project === actualProject && f.level !== 3 && f.folder)
    .map(f => f.folder);

  return new Set(folders);
}

function getTraceShortName(agentName: string, stepId: number): string {
  const safeAgentName = agentName
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${String(stepId).padStart(3, '0')}-${safeAgentName || 'agent'}`;
}

async function saveStorContent(
  fileInfo: Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>,
  source: string,
  needCreateModel: boolean,
): Promise<void> {
  const key = mls.stor.getKeyToFile(fileInfo);
  let storFile = mls.stor.files[key];

  if (!storFile) {
    storFile = await createStorFile({ ...fileInfo, source }, needCreateModel, needCreateModel, false);
  } else if (needCreateModel) {
    const model = await storFile.getOrCreateModel();
    if (model?.model) model.model.setValue(source);
  }

  await mls.stor.localStor.setContent(storFile, { contentType: 'string', content: source });
}
