/// <mls fileReference="_102020_/l2/agentDefsL2/steps/bff55/run.ts" enhancement="_blank"/>

import { displayPath, readJson, readSourceText, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import type { D2RunIdentity } from '/_102020_/l2/helpers/defsInput/contracts.js';
import { readD2Input, readD2InputBundle, assertD2InputSourcesStable } from '/_102020_/l2/helpers/defsInput/io.js';
import { d2WriteKey } from '/_102020_/l2/helpers/defsInput/writeKey.js';
import { parseD2Page11Definition, type D2Page11Definition, type D2Page11Device } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2Page11Needs, type D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import {
  buildD2BffDesign, checkD2Bff, d2BffAccess, d2ContractsTypeName, d2CoverageObligation, d2BffL4Slice, d2MenuPages, d2PageJourneySteps, d2PageSubmits, normalizeD2BffDesign, D2_BFF_TYPE_PATTERN,
  type D2BffDesign, type D2Grant, type D2Menu, type D2NeedPage,
} from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import type { D2PageRefusal } from '/_102020_/l2/agentDefsL2/helpers/d2PageSettle.js';
import { d2SharedDeriveIssues, deriveD2Shared } from '/_102020_/l2/agentDefsL2/helpers/d2SharedDerive.js';

export const D2_BFF_VERSION = '2026-10-04-agent-defs-l2-bff-v2' as const;
export const D2_BFF_REFUSAL_VERSION = '2026-10-04-agent-defs-l2-bff-refusal' as const;
export const D2_BFF_PROMPT_LIMIT_CHARS = 640_000;
export const D2_BFF_SYSTEM_PREFIX = `<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->
<!-- x-tool-strict: true -->`;

export interface D2BffContext {
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
  entities: Record<string, Ns5OntologyAnyEntity>;
  grants: D2Grant[];
  rules: Record<string, string>;
  /** The L4 journeys the menu links to this page. */
  journeys: Array<{ journeyId: string; business: unknown }>;
  prompt: string;
  /** The design approved before, when the page is redone (d2_71). */
  approved: D2BffDesign | null;
}

export interface D2BffReceipt {
  schemaVersion: typeof D2_BFF_VERSION;
  project: number;
  module: string;
  pageId: string;
  inputHash: string;
  unitInputHash: string;
  promptHash: string;
  promptChars: number;
  repairPromptChars: number;
  designHash: string;
}

export function bffDesignInfo(identity: D2RunIdentity, pageId: string): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2/bff`, shortName: pageId, extension: '.json' };
}
export function bffReceiptInfo(identity: D2RunIdentity, pageId: string): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2/bff55`, shortName: pageId, extension: '.json' };
}
function page11Info(identity: D2RunIdentity, pageId: string, device: D2Page11Device): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/web/${device}/page11`, shortName: pageId, extension: '.defs.ts' };
}
function draftInfo(identity: D2RunIdentity, pageId: string, device: D2Page11Device): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2/page11Needs`, shortName: `${pageId}${device === 'desktop' ? 'Desktop' : 'Mobile'}`, extension: '.json' };
}

/** The page grants as the prompt reads them: page actors only. */
function pageGrants(context: Pick<D2BffContext, 'grants' | 'need'>): unknown[] {
  return context.grants.filter(grant => context.need.actors.includes(grant.actorRef)).map(grant => ({
    grantId: grant.grantId, actor: grant.actorRef, entityRefs: grant.entityRefs, dataScope: grant.dataScope?.mode ?? '',
    disclosure: grant.disclosure.mode, ...(grant.disclosure.allowedFields ? { allowedFields: grant.disclosure.allowedFields } : {}),
    ...(grant.disclosure.deniedFields?.length ? { deniedFields: grant.disclosure.deniedFields } : {}),
  }));
}

function pageWrites(need: D2NeedPage): Array<{ key: string; operation: string; transitionRef?: string }> {
  return need.writes.flatMap(write => {
    try { return [{ key: d2WriteKey(write), operation: write.operation, ...(write.transitionRef ? { transitionRef: write.transitionRef } : {}) }]; } catch { return []; }
  });
}

/** Everything A reads except the prompt text: its hash decides reuse. */
function unitInput(context: D2BffContext): Record<string, unknown> {
  const pageOf = (device: D2Page11Device) => ({
    intent: context.page11[device].intent,
    sections: context.page11[device].sections.map(section => ({ id: section.id, priority: section.priority, purpose: section.purpose, organisms: section.organisms })),
    organisms: context.page11[device].organisms,
  });
  return {
    pageId: context.pageId,
    userLanguage: context.userLanguage,
    actors: context.need.actors,
    page11: { desktop: pageOf('desktop'), mobile: pageOf('mobile') },
    page11Needs: { desktop: context.drafts.desktop.organisms, mobile: context.drafts.mobile.organisms },
    writes: pageWrites(context.need),
    submits: [...d2PageSubmits(context)].map(([intent, write]) => ({ intent, write })),
    l4: d2BffL4Slice(context.entities, context.rules, context.need, [context.drafts.desktop, context.drafts.mobile]),
    coverage: d2CoverageObligation([context.drafts.desktop, context.drafts.mobile], context.entities),
    journeys: context.journeys,
    journeySteps: d2PageJourneySteps(context.need, context.menu),
    menuPages: d2MenuPages(context.menu),
    grants: pageGrants(context),
  };
}

export async function bffUnitInputHash(context: D2BffContext): Promise<string> {
  return sha256Text(JSON.stringify(unitInput(context)));
}

export function buildD2BffPrompt(context: D2BffContext, repair?: { diagnostic: string; previous: unknown }): { systemPrompt: string; humanPrompt: string; chars: number } {
  const humanPrompt = JSON.stringify({ ...unitInput(context), approved: context.approved, repair: repair ?? null });
  const systemPrompt = `${D2_BFF_SYSTEM_PREFIX}\n\n${context.prompt}`;
  const chars = systemPrompt.length + humanPrompt.length;
  if (chars > D2_BFF_PROMPT_LIMIT_CHARS) throw new Error(`D2_BFF_PROMPT_LIMIT: ${chars}`);
  return { systemPrompt, humanPrompt, chars };
}

/**
 * The tool schema says what the parser requires, no more and no less (d2_74). The host fills every property, so an
 * optional closed list carries the neutral '' (a page without writes gets [''], never a free string).
 */
export function bffSchemaFor(context: D2BffContext): Record<string, unknown> {
  const slice = d2BffL4Slice(context.entities, context.rules, context.need, [context.drafts.desktop, context.drafts.mobile]);
  const paths = Object.values(slice.entities).flatMap(entity => ((entity as { fields: Array<{ path: string }> }).fields).map(field => field.path));
  const branches = new Set<string>();
  for (const path of paths) { const parts = path.split('.'); for (let i = 2; i < parts.length; i += 1) branches.add(parts.slice(0, i).join('.')); }
  const enumOf = (values: readonly string[]) => (values.length ? { type: 'string', enum: [...new Set(values)] } : { type: 'string' });
  const optionalEnum = (values: readonly string[]) => ({ type: 'string', enum: ['', ...new Set(values)] });
  const origin = row(['kind', 'paths'], { kind: { type: 'string', enum: ['field', 'aggregate', 'context'] }, paths: { type: 'array', items: enumOf([...paths, ...branches]) } });
  const leaf = row(['name', 'type', 'origin'], { name: { type: 'string' }, type: { type: 'string', pattern: D2_BFF_TYPE_PATTERN }, optional: { type: 'boolean' }, origin });
  const submits = [...d2PageSubmits(context).keys()];
  const organisms = [...new Set([...Object.keys(context.page11.desktop.organisms), ...Object.keys(context.page11.mobile.organisms)])];
  const bindings = row(['organisms', 'commands', 'selections', 'journeys'], {
    organisms: { type: 'array', items: row(['organism', 'reads'], { organism: enumOf(organisms), reads: { type: 'string', pattern: '^[a-z][A-Za-z0-9]*\\.[a-z][A-Za-z0-9]*$' } }) },
    commands: { type: 'array', items: row(['endpoint', 'refreshes'], { endpoint: { type: 'string' }, refreshes: { type: 'array', items: { type: 'string' } } }) },
    selections: { type: 'array', items: row(['organism', 'via'], { organism: enumOf(organisms), via: row(['kind', 'ref'], { kind: { type: 'string', enum: ['query', 'list'] }, ref: { type: 'string' } }) }) },
    journeys: { type: 'array', items: row(['step', 'organisms', 'endpoints'], {
      step: enumOf(d2PageJourneySteps(context.need, context.menu)), organisms: { type: 'array', items: enumOf(organisms) },
      endpoints: { type: 'array', items: { type: 'string' } }, continuesIn: optionalEnum(d2MenuPages(context.menu)),
    }) },
  });
  return row(['types', 'endpoints', 'bindings'], {
    types: { type: 'array', items: row(['name', 'fields'], { name: { type: 'string' }, description: { type: 'string' }, fields: { type: 'array', items: leaf } }) },
    endpoints: { type: 'array', items: row(['id', 'kind', 'when', 'input', 'output', 'rules', 'jsdoc'], {
      id: { type: 'string' },
      kind: { type: 'string', enum: ['qry', 'cmd'] },
      when: enumOf(['onLoad', 'interaction', ...submits]),
      writes: optionalEnum(pageWrites(context.need).map(item => item.key)),
      input: { type: 'array', items: leaf },
      output: { type: 'array', items: leaf },
      rules: { type: 'array', items: enumOf(Object.keys(slice.rules)) },
      jsdoc: row(['purpose', 'input', 'processing', 'output'], { purpose: { type: 'string' }, input: { type: 'string' }, processing: { type: 'string' }, output: { type: 'string' } }),
    }) },
    bindings,
  });
}

const row = (required: string[], properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required, properties });

export interface D2BffWriter { writeJson(info: Ns5FileInfo, value: unknown): Promise<unknown> }
const productionWriter: D2BffWriter = { writeJson };

/**
 * B: the answer passes the tool format (field leaves take the ontology name and type) and the fact checks, and the
 * shared code derives from it passes D (d2_75): a binding that leaves an organism unfed goes back to A. Otherwise the
 * whole list of findings is the refusal.
 */
export function d2BffApproved(context: D2BffContext, raw: unknown): D2BffDesign {
  const design = normalizeD2BffDesign(buildD2BffDesign(raw), context.entities, d2ContractsTypeName(context.pageId));
  const issues = checkD2Bff(design, context);
  if (!issues.length) {
    const access = d2BffAccess(design, context.need, context.grants);
    const input = { ...context, design, access: { actors: access.actors, grants: access.grants }, siblings: [] };
    issues.push(...d2SharedDeriveIssues(input, deriveD2Shared(input)));
  }
  if (issues.length) throw new Error(issues.map(issue => `${issue.code}: ${issue.message}`).join(' | '));
  return design;
}

export async function approveD2BffUnit(context: D2BffContext, raw: unknown, promptChars: number, repairPromptChars = 0, writer: D2BffWriter = productionWriter): Promise<D2BffReceipt> {
  const design = d2BffApproved(context, raw);
  const receipt: D2BffReceipt = {
    schemaVersion: D2_BFF_VERSION, ...context.identity, pageId: context.pageId, inputHash: context.inputHash,
    unitInputHash: await bffUnitInputHash(context), promptHash: await sha256Text(context.prompt),
    promptChars, repairPromptChars, designHash: await sha256Text(JSON.stringify(design)),
  };
  await writer.writeJson(bffDesignInfo(context.identity, context.pageId), design);
  await writer.writeJson(bffReceiptInfo(context.identity, context.pageId), receipt);
  return receipt;
}

export async function readD2BffReceipt(identity: D2RunIdentity, pageId: string): Promise<D2BffReceipt | null> {
  const value = await readJson<D2BffReceipt>(bffReceiptInfo(identity, pageId));
  return value?.schemaVersion === D2_BFF_VERSION ? value : null;
}

export async function readD2BffRefusal(identity: D2RunIdentity, pageId: string): Promise<D2PageRefusal | null> {
  const value = await readJson<D2PageRefusal>(bffReceiptInfo(identity, pageId));
  return value?.schemaVersion === D2_BFF_REFUSAL_VERSION ? value : null;
}

/**
 * The design on disk as it was written (d2_77): it was normalized once, before writing, and is never parsed again (the
 * saved form is the design, not the tool answer). null only when no receipt approves a design; a missing, unreadable or
 * changed file is an error that names the cause.
 */
export async function readApprovedD2Bff(identity: D2RunIdentity, pageId: string, port: { readReceipt: typeof readD2BffReceipt; readDesign: (info: Ns5FileInfo) => Promise<unknown> } = { readReceipt: readD2BffReceipt, readDesign: readJson }): Promise<D2BffDesign | null> {
  const receipt = await port.readReceipt(identity, pageId);
  if (!receipt) return null;
  const where = displayPath(bffDesignInfo(identity, pageId));
  let design: unknown;
  try { design = await port.readDesign(bffDesignInfo(identity, pageId)); }
  catch (error) { throw new Error(`D2_BFF_APPROVED_UNREADABLE: ${where}: ${error instanceof Error ? error.message : String(error)}`); }
  if (design === null || design === undefined) throw new Error(`D2_BFF_APPROVED_MISSING: ${where} is absent although its receipt approves a design.`);
  const hash = await sha256Text(JSON.stringify(design));
  if (hash !== receipt.designHash) throw new Error(`D2_BFF_APPROVED_CHANGED: ${where} hashes to ${hash}, its receipt approves ${receipt.designHash}.`);
  return design as D2BffDesign;
}

export async function loadD2BffContext(identity: D2RunIdentity, pageId: string): Promise<D2BffContext> {
  const snapshot = await readD2Input(identity);
  if (!snapshot) throw new Error('D2_BFF_INPUT_MISSING');
  const bundle = await readD2InputBundle(identity);
  await assertD2InputSourcesStable(bundle);
  if (!snapshot.selection.writePageIds.includes(pageId)) throw new Error(`D2_BFF_PAGE_NOT_SELECTED: ${pageId}`);
  const devices = ['desktop', 'mobile'] as const;
  const texts = await Promise.all(devices.map(device => readSourceText(page11Info(identity, pageId, device))));
  const drafts = await Promise.all(devices.map(device => readJson<unknown>(draftInfo(identity, pageId, device))));
  if (texts.some(text => !text) || drafts.some(draft => !draft)) throw new Error(`D2_BFF_PAGE11_MISSING: ${pageId}`);
  const prompt = await readSourceText({ project: 102020, level: 2, folder: 'agentDefsL2/steps/bff55', shortName: 'prompt', extension: '.md' });
  const artifacts = bundle.artifacts;
  const need = (artifacts.needs as { pages: D2NeedPage[] }).pages.find(item => item.pageId === pageId);
  if (!need) throw new Error(`D2_BFF_NEEDS_PAGE: ${pageId}`);
  return {
    ...d2BffContextFrom({
      pageId, page11Text: { desktop: texts[0], mobile: texts[1] }, drafts: { desktop: drafts[0], mobile: drafts[1] },
      need, menu: artifacts.menu as D2Menu, module: artifacts.module, entities: artifacts.entities as Record<string, Ns5OntologyAnyEntity>,
      access: artifacts.access, rules: artifacts.rules, journeys: artifacts.journeys,
    }),
    identity, inputHash: snapshot.snapshotHash, prompt, approved: await readApprovedD2Bff(identity, pageId),
  };
}

/** The pure part of the context: the page pair and the L4 slices it needs. */
export function d2BffContextFrom(input: {
  pageId: string;
  page11Text: Record<D2Page11Device, string>;
  drafts: Record<D2Page11Device, unknown>;
  need: D2NeedPage;
  menu: D2Menu;
  module: unknown;
  entities: Record<string, Ns5OntologyAnyEntity>;
  access: unknown;
  rules: unknown;
  journeys: Record<string, unknown>;
}): Omit<D2BffContext, 'identity' | 'inputHash' | 'prompt' | 'approved'> {
  const linked = Object.entries(input.menu.meta?.journeys ?? {}).filter(([, pages]) => pages.includes(input.pageId)).map(([id]) => id).sort();
  const journeys = linked.flatMap(journeyId => {
    const value = input.journeys[journeyId] as { business?: unknown } | undefined;
    return value ? [{ journeyId, business: value.business ?? value }] : [];
  });
  return {
    pageId: input.pageId,
    userLanguage: input.menu.userLanguage || (input.module as { userLanguage?: string } | null)?.userLanguage || 'en',
    page11: { desktop: parseD2Page11Definition(input.page11Text.desktop).definition, mobile: parseD2Page11Definition(input.page11Text.mobile).definition },
    page11Text: input.page11Text,
    drafts: { desktop: buildD2Page11Needs(input.drafts.desktop), mobile: buildD2Page11Needs(input.drafts.mobile) },
    draftText: { desktop: JSON.stringify(input.drafts.desktop), mobile: JSON.stringify(input.drafts.mobile) },
    need: input.need,
    menu: input.menu,
    entities: input.entities,
    grants: ((input.access as { grants?: D2Grant[] } | null)?.grants ?? []),
    rules: ((input.rules as { rules?: Record<string, string> } | null)?.rules ?? {}),
    journeys,
  };
}
