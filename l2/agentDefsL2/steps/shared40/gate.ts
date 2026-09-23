/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/gate.ts" enhancement="_blank"/>

import type { D2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';
import type { D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { D2_SHARED_JUDGMENT_VERSION, D2_SHARED_KEYS, D2_SHARED_RUNTIME_CONTEXT, D2_SHARED_SKILL, buildD2SharedDefinition, flatten, inputStateKey, isObviouslyDestructive, type D2SharedDefinition, type D2SharedJudgment } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { parseD2RenderedShared } from '/_102020_/l2/agentDefsL2/steps/shared40/render.js';

export function parseD2SharedJudgment(value: unknown): D2SharedJudgment {
  const root = record(value);
  if (root.schemaVersion !== D2_SHARED_JUDGMENT_VERSION) fail('D2_SHARED_SCHEMA_VERSION');
  for (const key of Object.keys(root)) if (!['schemaVersion', 'pageId', 'scenaries', 'initialLoadActionIds', 'actionBehaviors'].includes(key)) fail(`D2_SHARED_SCHEMA_UNKNOWN_KEY: ${key}`);
  if (!Array.isArray(root.scenaries) || !Array.isArray(root.initialLoadActionIds) || !Array.isArray(root.actionBehaviors)) fail('D2_SHARED_SCHEMA_TRUNCATED');
  return root as unknown as D2SharedJudgment;
}

export function gateD2Shared(moduleName: string, page: D2SelectedPage, contract: D2PageContract, judgment: D2SharedJudgment): D2SharedDefinition {
  const errors: string[] = [];
  const callById = new Map(contract.calls.map(call => [call.callName, call]));
  const behaviorById = new Map(judgment.actionBehaviors.map(item => [item.actionId, item]));
  if (judgment.pageId !== page.pageId) errors.push('D2_SHARED_PAGE_CHANGED');
  if (behaviorById.size !== contract.calls.length || contract.calls.some(call => !behaviorById.has(call.callName))) errors.push('D2_SHARED_ACTION_COVERAGE');
  for (const behavior of judgment.actionBehaviors) {
    const call = callById.get(behavior.actionId);
    if (!call) errors.push(`D2_SHARED_ACTION_UNKNOWN: ${behavior.actionId}`);
    for (const refresh of behavior.refreshActionIds) {
      const cited = callById.get(refresh);
      if (!cited || (cited.operation !== 'list' && cited.operation !== 'get')) errors.push(`D2_SHARED_REFRESH_NOT_QUERY: ${behavior.actionId} -> ${refresh}`);
    }
    if (behavior.destructive && (!behavior.confirmation?.title || !behavior.confirmation.description)) errors.push(`D2_SHARED_DESTRUCTIVE_CONFIRMATION: ${behavior.actionId}`);
    if (isObviouslyDestructive(behavior.actionId) && !behavior.destructive) errors.push(`D2_SHARED_DESTRUCTIVE_UNMARKED: ${behavior.actionId}`);
    if (!behavior.destructive && behavior.confirmation) errors.push(`D2_SHARED_CONFIRMATION_UNUSED: ${behavior.actionId}`);
  }
  const scenes = new Set<string>();
  if (!judgment.scenaries.some(item => item.kind === 'base' && item.value === 'base')) errors.push('D2_SHARED_BASE_SCENARY_MISSING');
  for (const scene of judgment.scenaries) {
    if (!scene.value || scenes.has(scene.value)) errors.push(`D2_SHARED_SCENARY_DUPLICATE: ${scene.value}`);
    scenes.add(scene.value);
    if (!callById.has(scene.actionId)) errors.push(`D2_SHARED_SCENARY_ACTION_UNKNOWN: ${scene.actionId}`);
    if (behaviorById.get(scene.actionId)?.destructive && scene.kind === 'command') errors.push(`D2_SHARED_DESTRUCTIVE_SCENARY: ${scene.actionId}`);
    const sceneCall = callById.get(scene.actionId);
    const knownStates = new Set(sceneCall ? flatten(sceneCall.input).map(field => inputStateKey(page.pageId, sceneCall, field)) : []);
    for (const state of scene.preconditions) if (!knownStates.has(state)) errors.push(`D2_SHARED_PRECONDITION_UNKNOWN: ${state}`);
  }
  for (const actionId of judgment.initialLoadActionIds) {
    const call = callById.get(actionId);
    if (!call || (call.operation !== 'list' && call.operation !== 'get')) { errors.push(`D2_SHARED_INITIAL_LOAD_NOT_QUERY: ${actionId}`); continue; }
    const unavailable = flatten(call.input).filter(field => field.required);
    if (unavailable.length) errors.push(`D2_SHARED_INITIAL_LOAD_INPUT_UNAVAILABLE: ${actionId} ${unavailable.map(field => field.path).join(',')}`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  const definition = buildD2SharedDefinition(moduleName, page, contract, judgment);
  if (Object.keys(definition).join('\0') !== D2_SHARED_KEYS.join('\0')) fail('D2_SHARED_DEFINITION_KEYS');
  assertUnique(definition.states.map(item => item.stateKey), 'D2_SHARED_STATE_ID_DUPLICATE', errors);
  assertUnique(definition.actions.map(item => item.actionId), 'D2_SHARED_ACTION_ID_DUPLICATE', errors);
  const actions = new Set(definition.actions.map(item => item.actionId));
  for (const binding of definition.dataBindings) if (!actions.has(binding.actionId)) errors.push(`D2_SHARED_BINDING_ACTION_UNKNOWN: ${binding.actionId}`);
  if (errors.length) throw new Error(errors.join('\n'));
  return definition;
}

export function assertD2RenderedShared(source: string): void {
  const exports = [...source.matchAll(/export const\s+([A-Za-z0-9_]+)/gu)].map(match => match[1]);
  if (exports.join(',') !== 'definition,pipeline') fail('D2_SHARED_RENDER_EXPORTS');
  const { definition, pipeline } = parseD2RenderedShared(source);
  if (pipeline.length !== 1) fail('D2_SHARED_PIPELINE_COUNT');
  const renderedDefinition = record(definition);
  const renderedContract = record(renderedDefinition.contractRef);
  const moduleName = typeof renderedDefinition.moduleName === 'string' ? renderedDefinition.moduleName : '';
  const pageId = typeof renderedDefinition.pageId === 'string' ? renderedDefinition.pageId : '';
  const contractPath = typeof renderedContract.defPath === 'string' ? renderedContract.defPath : '';
  if (!moduleName || !pageId || contractPath !== `l2/${moduleName}/web/contracts/${pageId}.defs.ts`) fail('D2_SHARED_DEFINITION_SHAPE');
  const item = record(pipeline[0]);
  const keys = Object.keys(item);
  if (keys.some(key => !['id', 'type', 'defPath', 'outputPath', 'dependsFiles', 'dependsOn', 'skills'].includes(key)) || keys.length !== 7) fail('D2_SHARED_PIPELINE_SHAPE');
  if (item.type !== 'l2_shared' || item.id !== `${pageId}__l2_shared` || item.defPath !== `l2/${moduleName}/web/shared/${pageId}.defs.ts` || item.outputPath !== `l2/${moduleName}/web/shared/${pageId}.ts`) fail('D2_SHARED_PIPELINE_ID');
  if (!Array.isArray(item.dependsOn) || item.dependsOn.length || !Array.isArray(item.dependsFiles) || item.dependsFiles.join('\0') !== `${contractPath}\0${D2_SHARED_RUNTIME_CONTEXT}`) fail('D2_SHARED_PIPELINE_CONTEXT');
  if (!Array.isArray(item.skills) || item.skills.join('\0') !== D2_SHARED_SKILL) fail('D2_SHARED_PIPELINE_SKILL');
  if (/layoutRef|\bsections\b|\blayout\b/.test(source)) fail('D2_SHARED_LAYOUT_FORBIDDEN');
}
function fail(message: string): never { throw new Error(message); }
function assertUnique(values: string[], code: string, errors: string[]): void { const seen = new Set<string>(); for (const value of values) { if (seen.has(value)) errors.push(`${code}: ${value}`); seen.add(value); } }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
