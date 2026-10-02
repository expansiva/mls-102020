/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared60/run.ts" enhancement="_blank"/>

import { readJson, writeJson, writeSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import type { D2RunIdentity } from '/_102020_/l2/helpers/defsInput/contracts.js';
import { buildD2Page11Definition, type D2Page11Definition, type D2Page11Device } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2Page11Needs, type D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import { deriveD2PageRequests, type D2DerivedPageRequests, type D2PageRequestsInput, type D2PageRequestsMenu, type D2PageRequestsNeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2PageRequests.js';
import { gateD2SharedV2, renderD2SharedV2, sharedFromDerived, type D2SharedV2Definition } from '/_102020_/l2/agentDefsL2/helpers/d2SharedV2.js';

export const D2_SHARED_VERSION = '2026-10-01-agent-defs-l2-shared-v2.1' as const;
export const D2_SHARED_PROMPT_LIMIT_CHARS = 160_000;

export const D2_SHARED_SYSTEM_PREFIX = `<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->
<!-- x-tool-strict: true -->`;

export interface D2SharedStateInput { id: string; source: string; description: string }
export interface D2SharedFunctionInput {
  id: string;
  calls?: string;
  sets?: string;
  updates?: string[];
  navigate?: string;
  carries?: Record<string, string>;
  description: string;
}
export interface D2SharedJourneyInput { step: string; organisms: string[]; functions: string[]; continuesIn?: string }
export interface D2SharedLlmResponse {
  states: D2SharedStateInput[];
  functions: D2SharedFunctionInput[];
  journeys: D2SharedJourneyInput[];
  commandReturns: Array<{ requestId: string; returns: string[] }>;
  requestRules: Array<{ requestId: string; rules: string[] }>;
  formChoices?: Array<{ submit: string; organism: string }>;
}

export interface D2SharedReceipt {
  schemaVersion: typeof D2_SHARED_VERSION;
  project: number;
  module: string;
  pageId: string;
  inputHash: string;
  unitInputHash: string;
  page11Hashes: Record<D2Page11Device, string>;
  draftHashes: Record<D2Page11Device, string>;
  skillHash: string;
  promptHash: string;
  promptChars: number;
  repairPromptChars: number;
  sourceHash: string;
}

export interface D2SharedContext {
  identity: D2RunIdentity;
  inputHash: string;
  input: D2PageRequestsInput;
  derived: D2DerivedPageRequests;
  page11: Record<D2Page11Device, D2Page11Definition>;
  page11Text: Record<D2Page11Device, string>;
  drafts: Record<D2Page11Device, D2Page11Needs>;
  draftText: Record<D2Page11Device, string>;
  skill: string;
  prompt: string;
}

export function d2SharedValidSources(derived: D2DerivedPageRequests): string[] {
  const tokens: string[] = [];
  for (const request of derived.requests) {
    // load<Key> feeds the list state sourced from load, so its returns are not a state source.
    if (request.id !== 'load' && request.lists.length > 0) continue;
    for (const key of request.returns) tokens.push(`${request.id}.${key}`);
    if (request.kind === 'cmd') tokens.push(`${request.id}.input`);
  }
  for (const name of Object.keys(derived.entry.params)) tokens.push(`entry.params.${name}`);
  return tokens;
}

export function d2SharedJourneySteps(needs: D2PageRequestsNeedPage, menu: D2PageRequestsMenu): string[] {
  const linked = new Set(Object.entries(menu.meta?.journeys ?? {}).filter(([, pages]) => pages.includes(needs.pageId)).map(([id]) => id));
  const steps = (needs.reads ?? []).flatMap(read => read.from.filter(item => item.startsWith('journey:')).map(item => item.slice('journey:'.length)));
  return [...new Set(steps.filter(step => linked.has(step.split('/')[0])))];
}

export function buildD2SharedContext(input: D2PageRequestsInput, extra: Omit<D2SharedContext, 'input' | 'derived'>): D2SharedContext {
  const derived = deriveD2PageRequests(input);
  if (derived.issues.length) throw new Error(derived.issues.map(issue => `${issue.code}: ${issue.message}`).join(' | '));
  return { ...extra, input, derived };
}

export function buildD2SharedPrompt(context: D2SharedContext, repair?: { diagnostic: string; previous: unknown }): { systemPrompt: string; humanPrompt: string; chars: number } {
  const need = context.input.needsPages.find(item => item.pageId === context.input.pageId);
  if (!need) throw new Error('D2_SHARED_NEEDS_PAGE');
  const draftOf = (device: D2Page11Device) => Object.fromEntries(Object.entries(context.drafts[device].organisms).map(([id, row]) => [id, {
    reads: row.reads, edits: row.edits, selects: row.selects, submits: row.submits,
  }]));
  const pageOf = (device: D2Page11Device) => ({
    sections: context.page11[device].sections.map(section => ({ id: section.id, organisms: section.organisms })),
    organisms: Object.fromEntries(Object.entries(context.page11[device].organisms).map(([id, row]) => [id, { kind: row.kind, intents: row.intents }])),
  });
  const human = {
    pageId: context.input.pageId,
    entry: context.derived.entry,
    forms: context.derived.forms,
    requests: context.derived.requests.map(request => ({ id: request.id, kind: request.kind, trigger: request.trigger, writes: request.writes, returns: request.returns, organisms: request.organisms })),
    ruleCandidates: context.derived.rules,
    ruleTexts: Object.fromEntries([...new Set(Object.values(context.derived.rules).flat())].map(id => [id, context.input.rules.rules[id] ?? ''])),
    access: { actors: context.derived.access.actors, grants: context.derived.access.grants },
    validSources: d2SharedValidSources(context.derived),
    fixedFunctions: Object.entries(sharedFromDerived(context.derived).functions).map(([id, fn]) => ({ id, ...(fn.calls ? { calls: fn.calls } : {}) })),
    journeySteps: d2SharedJourneySteps(need, context.input.menu),
    page11: { desktop: pageOf('desktop'), mobile: pageOf('mobile') },
    readsAndEdits: { desktop: draftOf('desktop'), mobile: draftOf('mobile') },
    repair: repair ?? null,
  };
  const humanPrompt = JSON.stringify(human);
  const systemPrompt = `${D2_SHARED_SYSTEM_PREFIX}\n\n${context.prompt}\n${context.skill}`;
  const chars = systemPrompt.length + humanPrompt.length;
  if (chars > D2_SHARED_PROMPT_LIMIT_CHARS) throw new Error(`D2_SHARED_PROMPT_LIMIT: ${chars}`);
  return { systemPrompt, humanPrompt, chars };
}

export function applyD2SharedLlm(context: D2SharedContext, raw: D2SharedLlmResponse): D2SharedV2Definition {
  const response = normalizeLlm(raw);
  const base = sharedFromDerived(context.derived);
  const page = context.page11.desktop;
  const draft = mergeDraft(context.drafts.desktop, context.drafts.mobile);
  const forms: D2SharedV2Definition['forms'] = {};
  const used = new Set<string>();
  for (const form of Object.values(context.derived.forms)) {
    const organismId = form.ambiguous ? choiceFor(response, form.submit, page, draft, form.entity) : form.organism;
    if (!organismId || used.has(organismId)) throw new Error(`D2_SHARED_FORM_REUSE: ${form.submit}`);
    const organism = page.organisms[organismId];
    if (!organism) throw new Error(`D2_SHARED_FORM_MISSING: ${organismId}`);
    used.add(organismId);
    forms[organismId] = { organism: organismId, submit: form.submit };
  }
  const requests = { ...base.requests };
  for (const row of response.commandReturns) {
    const request = requests[row.requestId];
    if (!request || request.kind !== 'cmd') throw new Error(`D2_SHARED_RETURNS_REQUEST: ${row.requestId}`);
    requests[row.requestId] = { ...request, returns: row.returns };
  }
  const functions = { ...base.functions };
  for (const row of response.functions) {
    const current = functions[row.id];
    const calls = current?.calls ?? row.calls;
    const updates = row.updates ?? (calls && requests[calls]?.kind === 'cmd' ? requests[calls].returns : current?.updates);
    functions[row.id] = {
      description: row.description,
      ...(calls ? { calls } : {}),
      ...(row.sets ? { sets: row.sets } : current?.sets ? { sets: current.sets } : {}),
      ...(updates ? { updates } : {}),
      ...(row.navigate ? { navigate: row.navigate } : {}),
      ...(row.carries ? { carries: row.carries } : {}),
    };
  }
  const rules: D2SharedV2Definition['rules'] = {};
  for (const row of response.requestRules) {
    if (!requests[row.requestId] || rules[row.requestId]) throw new Error(`D2_SHARED_RULES_REQUEST: ${row.requestId}`);
    rules[row.requestId] = [...new Set(row.rules)];
  }
  const states: D2SharedV2Definition['states'] = {};
  for (const row of response.states) {
    if (states[row.id]) throw new Error(`D2_SHARED_STATE_ID: ${row.id}`);
    states[row.id] = { source: row.source, description: row.description };
  }
  return { ...base, forms, requests, states, functions, rules, journeys: response.journeys.map(row => ({
    step: row.step, organisms: row.organisms, functions: row.functions, ...(row.continuesIn ? { continuesIn: row.continuesIn } : {}),
  })) };
}

export interface D2SharedWriter { writeSource(info: Ns5FileInfo, source: string): Promise<void>; writeJson(info: Ns5FileInfo, value: unknown): Promise<unknown> }
const productionWriter: D2SharedWriter = { writeSource: writeSourceText, writeJson };

export async function approveD2SharedUnit(context: D2SharedContext, raw: D2SharedLlmResponse, promptChars: number, repairPromptChars = 0, writer: D2SharedWriter = productionWriter): Promise<D2SharedReceipt> {
  const definition = applyD2SharedLlm(context, raw);
  const need = context.input.needsPages.find(item => item.pageId === context.input.pageId);
  if (!need) throw new Error('D2_SHARED_NEEDS_PAGE');
  const issues = gateD2SharedV2(definition, {
    page11: context.page11.desktop, draft: context.drafts.desktop, needs: need, menu: context.input.menu, derived: context.derived,
  });
  if (issues.length) throw new Error(issues.map(issue => `${issue.code}: ${issue.message}`).join(' | '));
  const source = renderD2SharedV2({ ...context.identity, pageId: context.input.pageId }, definition);
  const receipt: D2SharedReceipt = {
    schemaVersion: D2_SHARED_VERSION, ...context.identity, pageId: context.input.pageId,
    inputHash: context.inputHash, unitInputHash: await sharedUnitInputHash(context),
    page11Hashes: { desktop: await sha256Text(context.page11Text.desktop), mobile: await sha256Text(context.page11Text.mobile) },
    draftHashes: { desktop: await sha256Text(context.draftText.desktop), mobile: await sha256Text(context.draftText.mobile) },
    skillHash: await sha256Text(context.skill), promptHash: await sha256Text(context.prompt),
    promptChars, repairPromptChars, sourceHash: await sha256Text(source),
  };
  await writer.writeSource(sharedInfo(context.identity, context.input.pageId), source);
  await writer.writeJson(receiptInfo(context.identity, context.input.pageId), receipt);
  return receipt;
}

export async function sharedUnitInputHash(context: D2SharedContext): Promise<string> {
  const need = context.input.needsPages.find(item => item.pageId === context.input.pageId) ?? null;
  return sha256Text(JSON.stringify({
    pageId: context.input.pageId,
    derived: context.derived,
    page11: context.page11Text,
    drafts: context.draftText,
    journeys: d2SharedJourneySteps(need ?? { pageId: context.input.pageId, actors: [], reads: [], writes: [] }, context.input.menu),
    menuJourneys: context.input.menu.meta?.journeys ?? {},
    userLanguage: context.input.menu.userLanguage ?? '',
  }));
}

export function sharedInfo(identity: D2RunIdentity, pageId: string): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/web/shared`, shortName: pageId, extension: '.defs.ts' };
}
export function receiptInfo(identity: D2RunIdentity, pageId: string): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2/shared60`, shortName: pageId, extension: '.json' };
}
export function page11File(identity: D2RunIdentity, pageId: string, device: D2Page11Device): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/web/${device}/page11`, shortName: pageId, extension: '.defs.ts' };
}
export function draftFile(identity: D2RunIdentity, pageId: string, device: D2Page11Device): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2/page11Needs`, shortName: `${pageId}${device === 'desktop' ? 'Desktop' : 'Mobile'}`, extension: '.json' };
}

export async function readD2SharedReceipt(identity: D2RunIdentity, pageId: string): Promise<D2SharedReceipt | null> {
  return readJson<D2SharedReceipt>(receiptInfo(identity, pageId));
}

function choiceFor(response: D2SharedLlmResponse, submit: string, page: D2Page11Definition, draft: D2Page11Needs, entity: string): string {
  const choices = (response.formChoices ?? []).filter(item => item.submit === submit);
  if (choices.length !== 1) throw new Error(`D2_SHARED_FORM_CHOICE: ${submit}`);
  const organismId = choices[0].organism;
  const edits = draft.organisms[organismId]?.edits ?? [];
  if (!page.organisms[organismId] || !edits.length || edits.some(path => path.split('.')[0] !== entity)) throw new Error(`D2_SHARED_FORM_ENTITY: ${submit}`);
  return organismId;
}

function mergeDraft(left: D2Page11Needs, right: D2Page11Needs): D2Page11Needs {
  const organisms: D2Page11Needs['organisms'] = { ...left.organisms };
  for (const [id, row] of Object.entries(right.organisms)) organisms[id] = organisms[id] ?? row;
  return { organisms };
}

function normalizeLlm(raw: D2SharedLlmResponse): D2SharedLlmResponse {
  if (!raw || !Array.isArray(raw.states) || !Array.isArray(raw.functions) || !Array.isArray(raw.journeys) || !Array.isArray(raw.commandReturns) || !Array.isArray(raw.requestRules)) throw new Error('D2_SHARED_LLM_SHAPE');
  return raw;
}
