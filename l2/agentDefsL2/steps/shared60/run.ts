/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared60/run.ts" enhancement="_blank"/>

import { readJson, readSourceText, writeJson, writeSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import type { D2RunIdentity } from '/_102020_/l2/helpers/defsInput/contracts.js';
import { readD2Input, readD2InputBundle, assertD2InputSourcesStable } from '/_102020_/l2/helpers/defsInput/io.js';
import { parseD2Page11Definition, type D2Page11Definition, type D2Page11Device } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2Page11Needs, type D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import { d2BffAccess, d2PageSubmits, type D2BffDesign, type D2Grant, type D2Menu, type D2NeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { d2SharedNavigablePages, gateD2SharedV2, parseD2SharedV2, renderD2SharedV2, type D2SharedV2Definition } from '/_102020_/l2/agentDefsL2/helpers/d2SharedV2.js';
import type { D2PageRefusal } from '/_102020_/l2/agentDefsL2/helpers/d2PageSettle.js';
import { readApprovedD2Bff } from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';

export const D2_SHARED_VERSION = '2026-10-04-agent-defs-l2-shared-v3' as const;
export const D2_SHARED_REFUSAL_VERSION = '2026-10-04-agent-defs-l2-shared-refusal' as const;
export const D2_SHARED_PROMPT_LIMIT_CHARS = 640_000;
export const D2_SHARED_SYSTEM_PREFIX = `<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->
<!-- x-tool-strict: true -->`;

/** C answers the page motor; requests, rules and access are copied from the approved BFF by code. */
export interface D2SharedLlmResponse {
  entry: Array<{ name: string; type: string; sources: Array<'url' | 'localStorage'>; effect: string; persist: boolean }>;
  forms: Array<{ submit: string; organism: string }>;
  states: Array<{ id: string; source: string; description: string }>;
  functions: Array<{ id: string; description: string; calls?: string; sets?: string; updates?: string[]; navigate?: string; carries?: Array<{ key: string; from: string }> }>;
  journeys: Array<{ step: string; organisms: string[]; functions: string[]; continuesIn?: string }>;
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
  designHash: string;
  skillHash: string;
  promptHash: string;
  promptChars: number;
  repairPromptChars: number;
  sourceHash: string;
}

export interface D2SharedContext {
  identity: D2RunIdentity;
  inputHash: string;
  pageId: string;
  userLanguage: string;
  page11: Record<D2Page11Device, D2Page11Definition>;
  page11Text: Record<D2Page11Device, string>;
  drafts: Record<D2Page11Device, D2Page11Needs>;
  draftText: Record<D2Page11Device, string>;
  need: D2NeedPage;
  menu: D2Menu;
  design: D2BffDesign;
  access: { actors: string[]; grants: string[]; scope: string };
  skill: string;
  prompt: string;
  /** The shared approved before by this flow, when the page is redone (d2_71). */
  approved: D2SharedV2Definition | null;
}

export function d2SharedJourneySteps(need: D2NeedPage, menu: D2Menu): string[] {
  const linked = new Set(Object.entries(menu.meta?.journeys ?? {}).filter(([, pages]) => pages.includes(need.pageId)).map(([id]) => id));
  const steps = need.reads.flatMap(read => read.from.filter(item => item.startsWith('journey:')).map(item => item.slice('journey:'.length)));
  return [...new Set(steps.filter(step => linked.has(step.split('/')[0])))];
}

function menuPages(menu: D2Menu): string[] {
  const ids: string[] = [];
  const walk = (nodes: D2Menu['tree']): void => { for (const node of nodes) { if (node.kind === 'page') ids.push(node.id); walk(node.children ?? []); } };
  walk(menu.tree);
  return ids;
}

/** The approved endpoints as C reads them: types and JSDoc, never the origins (those stay in the pipeline). */
export function d2BffWithoutOrigins(design: D2BffDesign): unknown {
  const leaves = (rows: D2BffDesign['types'][number]['fields']) => rows.map(leaf => ({ name: leaf.name, type: leaf.type, ...(leaf.optional ? { optional: true } : {}) }));
  return {
    types: design.types.map(type => ({ name: type.name, description: type.description, fields: leaves(type.fields) })),
    endpoints: design.endpoints.map(endpoint => ({
      id: endpoint.id, kind: endpoint.kind, when: endpoint.when, ...(endpoint.writes ? { writes: endpoint.writes } : {}),
      input: leaves(endpoint.input), output: leaves(endpoint.output), rules: endpoint.rules, jsdoc: endpoint.jsdoc,
    })),
  };
}

/** Everything C reads except the prompt text and the approved shared: its hash decides reuse. */
function unitInput(context: D2SharedContext): Record<string, unknown> {
  const pageOf = (device: D2Page11Device) => ({
    intent: context.page11[device].intent,
    sections: context.page11[device].sections.map(section => ({ id: section.id, purpose: section.purpose, organisms: section.organisms })),
    organisms: Object.fromEntries(Object.entries(context.page11[device].organisms).map(([id, row]) => [id, { kind: row.kind, text: row.text, intents: row.intents }])),
  });
  return {
    pageId: context.pageId,
    userLanguage: context.userLanguage,
    page11: { desktop: pageOf('desktop'), mobile: pageOf('mobile') },
    page11Needs: { desktop: context.drafts.desktop.organisms, mobile: context.drafts.mobile.organisms },
    bff: d2BffWithoutOrigins(context.design),
    submits: [...d2PageSubmits(context).keys()],
    journeySteps: d2SharedJourneySteps(context.need, context.menu),
    navigablePages: d2SharedNavigablePages(context.menu, context.need.actors),
    menuPages: menuPages(context.menu),
  };
}

export async function sharedUnitInputHash(context: D2SharedContext): Promise<string> {
  return sha256Text(JSON.stringify(unitInput(context)));
}

export function buildD2SharedPrompt(context: D2SharedContext, repair?: { diagnostic: string; previous: unknown }): { systemPrompt: string; humanPrompt: string; chars: number } {
  const humanPrompt = JSON.stringify({ ...unitInput(context), approved: context.approved, repair: repair ?? null });
  const systemPrompt = `${D2_SHARED_SYSTEM_PREFIX}\n\n${context.prompt}\n${context.skill}`;
  const chars = systemPrompt.length + humanPrompt.length;
  if (chars > D2_SHARED_PROMPT_LIMIT_CHARS) throw new Error(`D2_SHARED_PROMPT_LIMIT: ${chars}`);
  return { systemPrompt, humanPrompt, chars };
}

/** The shared v2 of the page: the answer's motor plus requests, rules and access copied from the approved BFF. */
export function applyD2SharedLlm(context: D2SharedContext, raw: D2SharedLlmResponse): D2SharedV2Definition {
  if (!raw || !Array.isArray(raw.entry) || !Array.isArray(raw.forms) || !Array.isArray(raw.states) || !Array.isArray(raw.functions) || !Array.isArray(raw.journeys)) throw new Error('D2_SHARED_LLM_SHAPE');
  const unique = <T>(rows: T[], key: (row: T) => string, code: string): void => {
    const seen = new Set<string>();
    for (const row of rows) { if (seen.has(key(row))) throw new Error(`${code}: ${key(row)}`); seen.add(key(row)); }
  };
  unique(raw.entry, row => row.name, 'D2_SHARED_ENTRY_ID');
  unique(raw.forms, row => row.submit, 'D2_SHARED_FORM_ID');
  unique(raw.states, row => row.id, 'D2_SHARED_STATE_ID');
  unique(raw.functions, row => row.id, 'D2_SHARED_FUNCTION_ID');
  const requests: D2SharedV2Definition['requests'] = {};
  const rules: D2SharedV2Definition['rules'] = {};
  for (const endpoint of context.design.endpoints) {
    requests[endpoint.id] = {
      kind: endpoint.kind,
      trigger: endpoint.when === 'interaction' ? endpoint.id : endpoint.when,
      ...(endpoint.writes ? { writes: endpoint.writes } : {}),
      returns: endpoint.output.map(leaf => leaf.name),
    };
    rules[endpoint.id] = endpoint.rules;
  }
  return {
    entry: { params: Object.fromEntries(raw.entry.map(row => [row.name, { type: row.type, sources: row.sources, effect: row.effect, persist: row.persist }])) },
    forms: Object.fromEntries(raw.forms.map(row => [row.submit, { organism: row.organism, submit: row.submit }])),
    requests,
    states: Object.fromEntries(raw.states.map(row => [row.id, { source: row.source, description: row.description }])),
    functions: Object.fromEntries(raw.functions.map(row => [row.id, {
      description: row.description,
      ...(row.calls ? { calls: row.calls } : {}),
      ...(row.sets ? { sets: row.sets } : {}),
      ...(row.updates?.length ? { updates: row.updates } : {}),
      ...(row.navigate ? { navigate: row.navigate } : {}),
      ...(row.carries?.length ? { carries: Object.fromEntries(row.carries.map(item => [item.key, item.from])) } : {}),
    }])),
    journeys: raw.journeys.map(row => ({ step: row.step, organisms: row.organisms, functions: row.functions, ...(row.continuesIn ? { continuesIn: row.continuesIn } : {}) })),
    rules,
    access: { actors: context.access.actors, grants: context.access.grants },
  };
}

export interface D2SharedWriter { writeSource(info: Ns5FileInfo, source: string): Promise<void>; writeJson(info: Ns5FileInfo, value: unknown): Promise<unknown> }
const productionWriter: D2SharedWriter = { writeSource: writeSourceText, writeJson };

/** D: the assembled shared passes the fact checks, or the whole list of findings is the refusal. */
export function d2SharedApproved(context: D2SharedContext, raw: D2SharedLlmResponse): D2SharedV2Definition {
  const definition = applyD2SharedLlm(context, raw);
  const issues = gateD2SharedV2(definition, { page11: context.page11, drafts: context.drafts, need: context.need, menu: context.menu, design: context.design });
  if (issues.length) throw new Error(issues.map(issue => `${issue.code}: ${issue.message}`).join(' | '));
  return definition;
}

export async function approveD2SharedUnit(context: D2SharedContext, raw: D2SharedLlmResponse, promptChars: number, repairPromptChars = 0, writer: D2SharedWriter = productionWriter): Promise<D2SharedReceipt> {
  const definition = d2SharedApproved(context, raw);
  const source = renderD2SharedV2({ ...context.identity, pageId: context.pageId }, definition);
  const receipt: D2SharedReceipt = {
    schemaVersion: D2_SHARED_VERSION, ...context.identity, pageId: context.pageId,
    inputHash: context.inputHash, unitInputHash: await sharedUnitInputHash(context),
    page11Hashes: { desktop: await sha256Text(context.page11Text.desktop), mobile: await sha256Text(context.page11Text.mobile) },
    draftHashes: { desktop: await sha256Text(context.draftText.desktop), mobile: await sha256Text(context.draftText.mobile) },
    designHash: await sha256Text(JSON.stringify(context.design)),
    skillHash: await sha256Text(context.skill), promptHash: await sha256Text(context.prompt),
    promptChars, repairPromptChars, sourceHash: await sha256Text(source),
  };
  await writer.writeSource(sharedInfo(context.identity, context.pageId), source);
  await writer.writeJson(receiptInfo(context.identity, context.pageId), receipt);
  return receipt;
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
  const value = await readJson<D2SharedReceipt>(receiptInfo(identity, pageId));
  return value?.schemaVersion === D2_SHARED_VERSION ? value : null;
}
export async function readD2SharedRefusal(identity: D2RunIdentity, pageId: string): Promise<D2PageRefusal | null> {
  const value = await readJson<D2PageRefusal>(receiptInfo(identity, pageId));
  return value?.schemaVersion === D2_SHARED_REFUSAL_VERSION ? value : null;
}

/** The pure part of the context: the page pair, the approved BFF and the access it implies. */
export function d2SharedContextFrom(input: {
  pageId: string;
  page11Text: Record<D2Page11Device, string>;
  drafts: Record<D2Page11Device, unknown>;
  need: D2NeedPage;
  menu: D2Menu;
  module: unknown;
  grants: readonly D2Grant[];
  design: D2BffDesign;
}): Omit<D2SharedContext, 'identity' | 'inputHash' | 'skill' | 'prompt' | 'approved'> {
  return {
    pageId: input.pageId,
    userLanguage: input.menu.userLanguage || (input.module as { userLanguage?: string } | null)?.userLanguage || 'en',
    page11: { desktop: parseD2Page11Definition(input.page11Text.desktop).definition, mobile: parseD2Page11Definition(input.page11Text.mobile).definition },
    page11Text: input.page11Text,
    drafts: { desktop: buildD2Page11Needs(input.drafts.desktop), mobile: buildD2Page11Needs(input.drafts.mobile) },
    draftText: { desktop: JSON.stringify(input.drafts.desktop), mobile: JSON.stringify(input.drafts.mobile) },
    need: input.need,
    menu: input.menu,
    design: input.design,
    access: d2BffAccess(input.design, input.need, input.grants),
  };
}

export async function loadD2SharedContext(identity: D2RunIdentity, pageId: string): Promise<D2SharedContext> {
  const snapshot = await readD2Input(identity);
  if (!snapshot) throw new Error('D2_SHARED_INPUT_MISSING');
  const bundle = await readD2InputBundle(identity);
  await assertD2InputSourcesStable(bundle);
  if (!snapshot.selection.writePageIds.includes(pageId)) throw new Error(`D2_SHARED_PAGE_NOT_SELECTED: ${pageId}`);
  const devices = ['desktop', 'mobile'] as const;
  const texts = await Promise.all(devices.map(device => readSourceText(page11File(identity, pageId, device))));
  const drafts = await Promise.all(devices.map(device => readJson<unknown>(draftFile(identity, pageId, device))));
  if (texts.some(text => !text) || drafts.some(draft => !draft)) throw new Error(`D2_SHARED_PAGE11_MISSING: ${pageId}`);
  const design = await readApprovedD2Bff(identity, pageId);
  if (!design) throw new Error(`D2_SHARED_BFF_MISSING: ${pageId} has no approved BFF design; bff55 runs first.`);
  const need = (bundle.artifacts.needs as { pages: D2NeedPage[] }).pages.find(item => item.pageId === pageId);
  if (!need) throw new Error(`D2_SHARED_NEEDS_PAGE: ${pageId}`);
  const [skill, prompt] = await Promise.all([
    readSourceText({ project: 102020, level: 2, folder: 'agentDefsL2/skills', shortName: 'genD2SharedDefinition', extension: '.ts' }),
    readSourceText({ project: 102020, level: 2, folder: 'agentDefsL2/steps/shared60', shortName: 'prompt', extension: '.md' }),
  ]);
  let approved: D2SharedV2Definition | null = null;
  const receipt = await readD2SharedReceipt(identity, pageId);
  if (receipt) {
    try {
      const source = await readSourceText(sharedInfo(identity, pageId));
      if (await sha256Text(source) === receipt.sourceHash) approved = parseD2SharedV2(source).definition;
    } catch { approved = null; }
  }
  return {
    ...d2SharedContextFrom({
      pageId, page11Text: { desktop: texts[0], mobile: texts[1] }, drafts: { desktop: drafts[0], mobile: drafts[1] }, need,
      menu: bundle.artifacts.menu as D2Menu, module: bundle.artifacts.module, grants: (bundle.artifacts.access as { grants?: D2Grant[] } | null)?.grants ?? [], design,
    }),
    identity, inputHash: snapshot.snapshotHash, skill, prompt, approved,
  };
}
