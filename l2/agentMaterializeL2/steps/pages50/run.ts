/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/pages50/run.ts" enhancement="_blank"/>

// pages50, one page × device: context and prompt for the LLM, then approval of its answer.
// The page sees the shared only through the declaration shared40 saved (web/shared/<pageId>Dts.txt).
// Approval = gate → write web/<device>/page11/<pageId>.ts → Studio compile → receipt. The receipt holds
// the hash of the whole prompt context: any change in the declaration, page11, template, tokens, molecule
// contracts, locales or prompt regenerates the page; an unchanged context reuses it with no LLM call.

import { displayPath, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { sha256Text } from '/_102020_/l2/agentMaterializeL2/helpers/hash.js';
import { readL4Module, renderL4Slice, resolveL4Refs } from '/_102020_/l2/agentMaterializeL2/helpers/l4/context.js';
import { compileWithDeclaration } from '/_102020_/l2/agentMaterializeL2/helpers/studioDeclaration.js';
import { moleculeGroupFolder, parseL2Page11, type L2Page11Device } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { parseL2Shared } from '/_102020_/l2/agentMaterializeL2/helpers/defs/shared.js';
import { parseL2Contract } from '/_102020_/l2/agentMaterializeL2/helpers/defs/contract.js';
import { m4OwnedFile, type M4RunIdentity } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import type { M4InputSnapshot } from '/_102020_/l2/agentMaterializeL2/steps/input20/run.js';
import { m4DefsInfo, moleculeIndexInfo, templateInfo } from '/_102020_/l2/agentMaterializeL2/steps/input20/io.js';
import { m4SharedReuseBlocker, readM4Snapshot, sharedDeclarationInfo, sharedSourceInfo, storedHash, studioSharedPort, type M4SharedPort } from '/_102020_/l2/agentMaterializeL2/steps/shared40/run.js';
import { m4SharedClassName } from '/_102020_/l2/agentMaterializeL2/steps/shared40/gate.js';
import {
  M4_SCENARY_IMPORT, M4_SCENARY_TAG, gateM4PageSource, m4MoleculeEvents, m4MoleculeImport, m4PageJourneyFunctions, m4PageClassName, m4PageMoleculeTags, m4PagePath, m4PageTag, m4SharedImport, type M4PageTarget,
} from '/_102020_/l2/agentMaterializeL2/steps/pages50/gate.js';

export const M4_PAGE_VERSION = '2026-10-05-materialize-l2-v4-page-v1' as const;
export const M4_PAGE_TOOL = 'submitPageTs' as const;
/**
 * Off by decision of Guilherme (01/10/2026): he judges the final page himself. The gate still runs and
 * every issue is recorded in the receipt and the trace; only the Studio compile refuses a page.
 * Set to true to make the contract errors refuse again.
 */
export const M4_PAGE_GATE_ENFORCED = false;
/** One generation plus up to three focused repairs (agentFix style, as shared40); an environment failure stops at once. */
export const M4_PAGE_MAX_ATTEMPTS = 4;
export const M4_DEVICES: readonly L2Page11Device[] = ['desktop', 'mobile'];

export interface M4PageContext {
  identity: M4RunIdentity;
  pageId: string;
  device: L2Page11Device;
  prompt: string;
  target: M4PageTarget;
  humanPrompt: string;
  contextHash: string;
  /** The shared declaration the page codes against; the repair prompt sends it again. */
  declaration: string;
  /**
   * The row types (contract projections) the declaration only imports. Without them the page saw
   * `MovimentacaoEstoqueLoad` by name and guessed `dataHora` from the organism text ("data e hora") for
   * `movimentadoEm`, in every run and every repair (controleEstoque, 02/10/2026).
   */
  rowTypes: string;
}
export interface M4PageReceipt {
  schemaVersion: typeof M4_PAGE_VERSION;
  project: number;
  module: string;
  pageId: string;
  device: L2Page11Device;
  contextHash: string;
  sourcePath: string;
  sourceHash: string;
  attempt: number;
  /** The design decisions the LLM returned with the page (concept, views, decisions). */
  design: M4PageDesign | null;
  /** Design observations of the gate: recorded, never a refusal. */
  advisories: Array<{ code: string; message: string }>;
}

export interface M4PageDesign { concept: string; views: Array<{ id: string; purpose: string }>; decisions: string }

/** The shared40 port plus a compile that does not require a declaration. */
export type M4PagePort = M4SharedPort;
export const studioPagePort: M4PagePort = { ...studioSharedPort, compile: (info, source) => compileWithDeclaration(info, source, false) };

export const pagePromptInfo: Ns5FileInfo = { project: 102020, level: 2, folder: 'agentMaterializeL2/steps/pages50', shortName: 'prompt', extension: '.md' };
export const pageRepairPromptInfo: Ns5FileInfo = { ...pagePromptInfo, shortName: 'promptRepair' };
export function pageSourceInfo(identity: M4RunIdentity, pageId: string, device: L2Page11Device): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/web/${device}/page11`, shortName: pageId, extension: '.ts' };
}
const ownedFolder = (identity: M4RunIdentity) => `${identity.module}/pipeline/agentMaterializeL2/pages50`;
const unitName = (pageId: string, device: L2Page11Device) => `${pageId}${device === 'desktop' ? 'Desktop' : 'Mobile'}`;
export function pageReceiptInfo(identity: M4RunIdentity, pageId: string, device: L2Page11Device): Ns5FileInfo {
  return { ...m4OwnedFile(identity, unitName(pageId, device)), folder: ownedFolder(identity) };
}
export function pageAttemptInfo(identity: M4RunIdentity, pageId: string, device: L2Page11Device, attempt: number): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: ownedFolder(identity), shortName: `${unitName(pageId, device)}Attempt${attempt}`, extension: '.txt' };
}

/** Base color token names of the first theme of l2/designSystem.ts (variants and _dark- keys dropped). */
export function designTokenNames(source: string): string[] {
  const start = source.indexOf('color: {');
  if (start < 0) return [];
  const block = source.slice(start, source.indexOf('}', start));
  return [...new Set([...block.matchAll(/"([a-z0-9-]+)"\s*:/gu)].map(match => match[1]).filter(name => !/-(?:hover|focus|disabled)$/u.test(name) && !name.startsWith('_dark-')))];
}

/** Two-letter catalogue keys of module.defs.ts productLanguages, default first ('pt-BR' → 'pt'). */
export function productLocales(moduleSource: string): string[] {
  const list = /"productLanguages"\s*:\s*\[([^\]]*)\]/u.exec(moduleSource)?.[1] ?? '';
  const languages = [...list.matchAll(/"([^"]+)"/gu)].map(match => match[1]);
  const fallback = /"defaultLanguage"\s*:\s*"([^"]+)"/u.exec(moduleSource)?.[1];
  const ordered = [fallback, ...languages].filter((item): item is string => Boolean(item));
  const keys = [...new Set(ordered.map(language => language.slice(0, 2).toLowerCase()))];
  return keys.length ? keys : ['en'];
}

export async function buildM4PageContext(identity: M4RunIdentity, pageId: string, device: L2Page11Device, port: M4PagePort = studioPagePort, snapshot?: M4InputSnapshot): Promise<M4PageContext> {
  const snap = snapshot ?? await readM4Snapshot(identity, port);
  const page = snap.pages.find(item => item.pageId === pageId);
  if (!page || page.status !== 'accepted') throw new Error(`M4_PAGE_NOT_ACCEPTED: ${pageId}`);
  const blocker = await m4SharedReuseBlocker(identity, pageId, port, snap);
  if (blocker) throw new Error(`M4_PAGE_SHARED_NOT_READY: the shared of ${pageId} is not reusable (${blocker}); shared40 must approve it first.`);

  const page11Source = await port.read(m4DefsInfo(identity, device, pageId));
  if (await sha256Text(page11Source) !== page.inputs[device]?.sha256) throw new Error(`M4_PAGE_INPUT_STALE: ${pageId} ${device} changed after input20; run the agent again.`);
  const page11 = parseL2Page11(page11Source).definition;
  const shared = parseL2Shared(await port.read(m4DefsInfo(identity, 'shared', pageId))).definition;
  const declaration = await port.read(sharedDeclarationInfo(identity, pageId));
  // What the shared starts by itself is read from its code; the rest of each journey is the page's to start.
  const sharedInfo = sharedSourceInfo(identity, pageId);
  const journeyFunctions = m4PageJourneyFunctions(shared, port.exists(sharedInfo) ? await port.read(sharedInfo) : '');
  const rowTypes = m4RowTypes(await port.read(m4DefsInfo(identity, 'contract', pageId)));
  const template = templateInfo(page11.template.category);
  const templateText = template && port.exists(template) ? await port.read(template) : '';
  const designSystem: Ns5FileInfo = { project: identity.project, level: 2, folder: '', shortName: 'designSystem', extension: '.ts' };
  const tokens = port.exists(designSystem) ? designTokenNames(await port.read(designSystem)) : [];
  const moduleInfo: Ns5FileInfo = { project: identity.project, level: 4, folder: identity.module, shortName: 'module', extension: '.defs.ts' };
  const locales = port.exists(moduleInfo) ? productLocales(await port.read(moduleInfo)) : ['en'];

  const tags = m4PageMoleculeTags(page11);
  const groups = new Map<string, { index: string; usage: string }>();
  for (const tag of tags) {
    const folder = moleculeGroupFolder(tag);
    if (groups.has(folder)) continue;
    const index = await port.read(moleculeIndexInfo(tag));
    const usageRef = /usageContract\s*=\s*'\/_(\d+)_\/l(\d)\/([^']+)\/([^'/]+)'/u.exec(index);
    const usage = usageRef ? await port.read({ project: Number(usageRef[1]), level: Number(usageRef[2]), folder: usageRef[3], shortName: usageRef[4], extension: '.ts' }) : '';
    groups.set(folder, { index, usage });
  }
  // The skill of each recommended molecule (its own .defs.ts), next to the group usage contract: the group
  // contract only says what the siblings share; the skill says what this tag does (06/10/2026: atendimento,
  // desktop and mobile guessed differently what ml-search-bar emits when its text is cleared).
  const skills: Array<{ tag: string; skill: string }> = [];
  for (const tag of tags) {
    const info = { ...moleculeIndexInfo(tag), shortName: tag.slice(tag.indexOf('--') + 2) };
    const source = port.exists(info) ? await port.read(info) : '';
    const skill = /export const skill = `([\s\S]*?)`;/u.exec(source)?.[1]?.trim() ?? '';
    if (skill) skills.push({ tag, skill });
  }

  const l4Context = page.l4 ? await readL4Module(identity.project, identity.module, { listDefs: (project, folder) => port.listDefs(project, folder, 4), exists: port.exists, read: port.read }) : null;
  const l4 = l4Context && page.l4 ? renderL4Slice(resolveL4Refs(l4Context, page.l4)) : '';

  const scenaryInfo: Ns5FileInfo = { project: 102020, level: 2, folder: 'molecules', shortName: 'ml-scenary', extension: '.defs.ts' };
  const scenarySource = port.exists(scenaryInfo) ? await port.read(scenaryInfo) : '';
  const scenaryContract = /export const skill = `([\s\S]*?)`;/u.exec(scenarySource)?.[1]?.trim() ?? '';

  const target: M4PageTarget = {
    ...identity, pageId, device, page11,
    sharedClassName: m4SharedClassName(identity.module, pageId),
    locales, tokens,
    methods: page.methods ?? {},
    moleculeEvents: await m4PageMoleculeEvents(tags, port),
    journeyFunctions,
  };
  const prompt = await port.read(pagePromptInfo);
  const parts = [
    '# Target',
    `- path: ${m4PagePath(target)}`,
    `- device: ${device}`,
    `- tag: ${m4PageTag(identity.project, identity.module, device, pageId)}`,
    `- class: ${m4PageClassName(identity.module, device, pageId)} extends ${target.sharedClassName}`,
    `- shared import: ${m4SharedImport(target)}`,
    `- locales (default first): ${locales.join(', ')}`,
    '',
    '# Intents → the shared method each one calls',
    ...(Object.keys(target.methods ?? {}).length ? Object.entries(target.methods ?? {}).map(([intent, method]) => `- ${intent} → this.${method}(…)`) : ['- none']),
    '',
    `# Shared declaration — web/shared/${pageId}.d.ts`,
    '```ts', declaration.trim(), '```',
    '',
    `# Row types — web/contracts/${pageId}.defs.ts (the only fields a row has)`,
    '```ts', rowTypes, '```',
    '',
    `# Page definition — web/${device}/page11/${pageId}.defs.ts`,
    '```ts', page11Source.trim(), '```',
    '',
    '# Journeys',
    '```json', JSON.stringify(shared.journeys, null, 2), '```',
    '',
    '# Business context (L4): labels, meanings, rules, journeys, actors',
    l4 || '(the module has no L4 context)',
    '',
    `# Template — ${page11.template.category}`,
    templateText.trim() || '(template not found)',
    '',
    '# Design tokens (color)',
    tokens.length ? tokens.join(', ') : '(no design system: use neutral structural utilities only)',
    '',
    '# Molecules of this page',
    ...(tags.length ? tags.map(tag => `- <${tag}> — import '${m4MoleculeImport(tag)}'`) : ['(none: this page has no molecule recommendation. Build it with semantic HTML and Tailwind only, and import no molecule.)']),
    '',
    ...[...groups.entries()].flatMap(([folder, group]) => [`## Usage contract — ${folder}`, group.usage.trim() || '(usage contract not found)', '']),
    ...skills.flatMap(item => [`## Molecule — <${item.tag}>`, item.skill, '']),
    `## Scene host (optional, your decision) — <${M4_SCENARY_TAG}>, import '${M4_SCENARY_IMPORT}'`,
    scenaryContract || '(scene host contract not found: do not use scenes)',
  ];
  const humanPrompt = parts.join('\n');
  return { identity, pageId, device, prompt, target, humanPrompt, contextHash: await sha256Text(`${prompt}\n---\n${humanPrompt}`), declaration, rowTypes };
}

/**
 * The events each molecule of the page dispatches, read from its .ts (the code, not the description, decides what
 * reaches the page), plus the scene host. A molecule whose source cannot be read is left out, so it is not checked.
 */
export async function m4PageMoleculeEvents(tags: string[], port: Pick<M4PagePort, 'exists' | 'read'>): Promise<Record<string, string[]>> {
  const sources: Array<[string, Ns5FileInfo]> = [
    ...tags.map(tag => [tag, { ...moleculeIndexInfo(tag), shortName: tag.slice(tag.indexOf('--') + 2), extension: '.ts' }] as [string, Ns5FileInfo]),
    [M4_SCENARY_TAG, { project: 102020, level: 2, folder: 'molecules', shortName: 'ml-scenary', extension: '.ts' }],
  ];
  const events: Record<string, string[]> = {};
  for (const [tag, info] of sources) {
    try { if (port.exists(info)) events[tag] = m4MoleculeEvents(await port.read(info)); } catch { /* unreadable: not checked */ }
  }
  return events;
}

/** The projection interfaces of the contract (no route map): the exact shape of every row the shared exposes. */
export function m4RowTypes(contractSource: string): string {
  const { definition } = parseL2Contract(contractSource);
  return definition.projections.map(item => `export interface ${item.name} {\n${item.body.replace(/\n$/u, '')}\n}`).join('\n\n') || '(the contract declares no row type)';
}

export function buildM4PagePrompt(context: M4PageContext): { systemPrompt: string; humanPrompt: string } {
  return { systemPrompt: context.prompt, humanPrompt: context.humanPrompt };
}

/**
 * A focused repair (agentFix style, as shared40): fix the listed errors in the refused file and change
 * nothing else, against the real shared declaration. Not the generation prompt again.
 */
export async function buildM4PageRepairPrompt(context: M4PageContext, repair: { diagnostic: string; previous: string; design?: unknown }, port: Pick<M4PagePort, 'read'> = studioPagePort): Promise<{ systemPrompt: string; humanPrompt: string }> {
  const { target } = context;
  const parts = [
    '# Target',
    `- path: ${m4PagePath(target)}`,
    `- tag: ${m4PageTag(target.project, target.module, target.device, target.pageId)}`,
    `- class: ${m4PageClassName(target.module, target.device, target.pageId)} extends ${target.sharedClassName}`,
    `- locales (every one needs every key): ${target.locales.join(', ')}`,
    '',
    '# Errors',
    '```text', repair.diagnostic.trim(), '```',
    '',
    '# Refused file',
    '```ts', repair.previous.trim() || '(the previous answer had no source)', '```',
    '',
    '# Design of the refused answer (keep it)',
    '```json', JSON.stringify(repair.design ?? null, null, 2), '```',
    '',
    `# Shared declaration — web/shared/${target.pageId}.d.ts`,
    '```ts', context.declaration.trim(), '```',
    '',
    `# Row types — web/contracts/${target.pageId}.defs.ts (the only fields a row has)`,
    '```ts', context.rowTypes, '```',
  ];
  return { systemPrompt: await port.read(pageRepairPromptInfo), humanPrompt: parts.join('\n') };
}

export async function approveM4Page(context: M4PageContext, source: unknown, attempt: number, port: M4PagePort = studioPagePort, design: unknown = null): Promise<M4PageReceipt> {
  if (typeof source !== 'string' || !source.trim()) throw new Error('M4_PAGE_EMPTY: submitPageTs.source must be the whole file.');
  const text = source.replace(/\r\n/gu, '\n').replace(/\n*$/u, '\n');
  const issues = gateM4PageSource(text, context.target);
  // While the gate is not enforced, nothing here refuses: every issue goes to the receipt.
  const errors = issues.filter(item => item.severity === 'error');
  // `always` issues refuse even while the gate is off (view switching by hand, 02/10/2026).
  const refusing = M4_PAGE_GATE_ENFORCED ? errors : errors.filter(item => item.always);
  if (refusing.length) throw new Error(`M4_PAGE_GATE:\n${refusing.map(item => `${item.code}: ${item.message}`).join('\n')}`);
  const info = pageSourceInfo(context.identity, context.pageId, context.device);
  await port.writeText(info, text);
  const compiled = await port.compile(info, text);
  if (compiled.errors.length) throw new Error(`M4_PAGE_COMPILE:\n${compiled.errors.join('\n')}`);
  const receipt: M4PageReceipt = {
    schemaVersion: M4_PAGE_VERSION, ...context.identity, pageId: context.pageId, device: context.device,
    contextHash: context.contextHash, sourcePath: displayPath(info), sourceHash: await storedHash(await port.read(info)), attempt,
    design: m4PageDesign(design),
    advisories: issues.filter(item => !M4_PAGE_GATE_ENFORCED || item.severity === 'advisory').map(item => ({ code: item.code, message: `${item.severity === 'error' ? '[contract] ' : ''}${item.message}` })),
  };
  await port.writeJson(pageReceiptInfo(context.identity, context.pageId, context.device), receipt);
  return receipt;
}

export async function reusableM4Page(identity: M4RunIdentity, pageId: string, device: L2Page11Device, port: M4PagePort = studioPagePort, snapshot?: M4InputSnapshot): Promise<boolean> {
  try {
    const receipt = await port.readJson<M4PageReceipt>(pageReceiptInfo(identity, pageId, device));
    if (!receipt || receipt.schemaVersion !== M4_PAGE_VERSION || receipt.project !== identity.project || receipt.module !== identity.module || receipt.pageId !== pageId || receipt.device !== device) return false;
    const info = pageSourceInfo(identity, pageId, device);
    if (!port.exists(info) || await storedHash(await port.read(info)) !== receipt.sourceHash) return false;
    return (await buildM4PageContext(identity, pageId, device, port, snapshot)).contextHash === receipt.contextHash;
  } catch {
    return false;
  }
}

export async function recordM4PageAttempt(identity: M4RunIdentity, pageId: string, device: L2Page11Device, attempt: number, source: unknown, diagnostic: string, port: Pick<M4PagePort, 'writeText'> = studioPagePort): Promise<void> {
  const body = typeof source === 'string' ? source : JSON.stringify(source ?? null, null, 2);
  await port.writeText(pageAttemptInfo(identity, pageId, device, attempt), `/* refused: ${diagnostic.replace(/\*\//gu, '* /')} */\n\n${body}\n`);
}

/** Same rule as shared40: a compile failure the generated code did not cause spends no repair. */
export function m4PageEnvironmentFailure(diagnostic: string): boolean {
  return diagnostic.startsWith('M4_PAGE_COMPILE:')
    && /Studio imports unavailable|Studio TypeScript compiler is unavailable|Studio model is unavailable|Studio compiler returned no result|Studio compile failed/u.test(diagnostic);
}

/** The tool arguments of the LLM answer: `{ design, source }`, as an object or a JSON string. */
export function m4PageToolAnswer(payload: unknown): { source: unknown; design: unknown } {
  const root = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const result = root.type === 'flexible' ? root.result as Record<string, unknown> | undefined : undefined;
  if (result && result.toolName !== M4_PAGE_TOOL) throw new Error(`M4_PAGE_TOOL_MISMATCH: expected ${M4_PAGE_TOOL}.`);
  let args: unknown = result ? result.arguments : root.arguments ?? root.payload ?? root;
  if (typeof args === 'string') {
    try { args = JSON.parse(args); } catch { throw new Error('M4_PAGE_TOOL_JSON: the tool arguments are not JSON.'); }
  }
  const row = args && typeof args === 'object' ? args as Record<string, unknown> : {};
  return { source: row.source, design: row.design ?? null };
}

export function m4PageToolSource(payload: unknown): unknown {
  return m4PageToolAnswer(payload).source;
}

/** Keeps the design answer only in its declared shape; anything else is recorded as null. */
export function m4PageDesign(value: unknown): M4PageDesign | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const views = Array.isArray(row.views) ? row.views.filter((item): item is { id: string; purpose: string } => Boolean(item) && typeof (item as { id?: unknown }).id === 'string' && typeof (item as { purpose?: unknown }).purpose === 'string') : [];
  return { concept: typeof row.concept === 'string' ? row.concept : '', views: views.map(view => ({ id: view.id, purpose: view.purpose })), decisions: typeof row.decisions === 'string' ? row.decisions : '' };
}

export const m4PageToolSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['design', 'source'],
  properties: {
    design: {
      type: 'object',
      additionalProperties: false,
      required: ['concept', 'views', 'decisions'],
      properties: {
        concept: { type: 'string', description: 'The idea of the screen in two or three sentences.' },
        views: {
          type: 'array',
          description: 'Each view or scene with its purpose; empty when the page is one view.',
          items: { type: 'object', additionalProperties: false, required: ['id', 'purpose'], properties: { id: { type: 'string' }, purpose: { type: 'string' } } },
        },
        decisions: { type: 'string', description: 'The design choices that matter and why: where you followed the template, departed from the section order, chose an alternative molecule.' },
      },
    },
    source: { type: 'string', description: 'The whole TypeScript file of the page, starting with the /// <mls fileReference …/> line.' },
  },
} as const;
