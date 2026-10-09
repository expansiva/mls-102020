/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/shared40/run.ts" enhancement="_blank"/>

// shared40, one page: context and prompt for the LLM (defs, contract with its route comments, L4 slice),
// then approval of its answer. The gaps the LLM completed (V5) come back as findings in the receipt.
// Approval = gate → write web/shared/<pageId>.ts → Studio compile → write the declaration the Studio
// emitted (web/shared/<pageId>Dts.txt, the context of pages50) → receipt. A unit whose receipt still
// matches its inputs, prompt and files on disk is reused with no LLM call and no write.

import { displayPath, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { readStorText, storTextExists, writeStorText } from '/_102020_/l2/agentMaterializeL2/helpers/storText.js';
import { sha256Text } from '/_102020_/l2/agentMaterializeL2/helpers/hash.js';
import { compileWithDeclaration, declarationsOf, mlsImportsOf, type StudioDeclarationResult } from '/_102020_/l2/agentMaterializeL2/helpers/studioDeclaration.js';
import { parseL2Contract } from '/_102020_/l2/agentMaterializeL2/helpers/defs/contract.js';
import { parseL2Shared } from '/_102020_/l2/agentMaterializeL2/helpers/defs/shared.js';
import { parseL2Page11 } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { m4OwnedFile, type M4RunIdentity } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import type { M4InputSnapshot } from '/_102020_/l2/agentMaterializeL2/steps/input20/run.js';
import { m4DefsInfo } from '/_102020_/l2/agentMaterializeL2/steps/input20/io.js';
import { readL4Module, renderL4Slice, resolveL4Refs } from '/_102020_/l2/agentMaterializeL2/helpers/l4/context.js';
import { gateM4SharedSource, m4ContractImport, m4FillStateJsdoc, m4SharedClassName, m4SharedPath, type M4SharedTarget } from '/_102020_/l2/agentMaterializeL2/steps/shared40/gate.js';

export const M4_SHARED_VERSION = '2026-10-05-materialize-l2-v4-shared-v1' as const;
export const M4_SHARED_TOOL = 'submitSharedTs' as const;
/** One generation plus up to three focused repairs (agentFix style); an environment failure stops at once. */
export const M4_SHARED_MAX_ATTEMPTS = 4;
/** Runtime modules every shared may import; their declarations go into the generation prompt. */
export const M4_SHARED_RUNTIME_REFS = [
  '/_102029_/l2/stateLitElement.js',
  '/_102029_/l2/bffClient.js',
  '/_102029_/l2/collabState.js',
  '/_102029_/l2/interactionRuntime.js',
  '/_102033_/l2/shared/layout/auraNavigate.js',
];

export interface M4SharedContext {
  identity: M4RunIdentity;
  pageId: string;
  unitInputHash: string;
  prompt: string;
  target: M4SharedTarget;
  sources: { contract: string; shared: string; desktop: string };
  /** The L4 slice of the page, rendered for the prompt ('' when the module has no L4). */
  l4: string;
}
/** A gap of the defs the LLM completed (V5): a named finding for the L2 planner. */
export interface M4Finding { code: string; message: string }
export interface M4SharedReceipt {
  schemaVersion: typeof M4_SHARED_VERSION;
  project: number;
  module: string;
  pageId: string;
  unitInputHash: string;
  promptHash: string;
  /** The input20 warnings of the page: a rule change (agent code) must regenerate, like a defs change. */
  rulesHash: string;
  sourcePath: string;
  sourceHash: string;
  declarationPath: string;
  declarationHash: string;
  attempt: number;
  findings: M4Finding[];
}

/** Swappable IO, so the unit is testable without the Studio. */
export interface M4SharedPort {
  read(info: Ns5FileInfo): Promise<string>;
  exists(info: Ns5FileInfo): boolean;
  readJson<T>(info: Ns5FileInfo): Promise<T | null>;
  writeText(info: Ns5FileInfo, text: string): Promise<void>;
  writeJson(info: Ns5FileInfo, value: unknown): Promise<unknown>;
  compile(info: Ns5FileInfo, source: string): Promise<StudioDeclarationResult>;
  /** The Studio .d.ts of each `/_<project>_/…js` module (agentFix idea); a missing one is left out. */
  declarations(refs: string[]): Promise<Array<{ ref: string; declaration: string }>>;
  /** Short names of the `.defs.ts` files in a folder of the project at a level (the L4 is level 4). */
  listDefs(project: number, folder: string, level: number): string[];
}
/**
 * Studio IO through helpers/storText (the private copy): it reads files created moments ago (fs.readSourceText refuses a
 * new file with no local value, 01/10/2026) and writes the way the Studio expects (changed status, model).
 */
export const studioSharedPort: M4SharedPort = {
  read: readStorText,
  exists: storTextExists,
  readJson: async <T>(info: Ns5FileInfo): Promise<T | null> => {
    if (!storTextExists(info)) return null;
    const text = await readStorText(info);
    if (!text.trim()) return null;
    try { return JSON.parse(text) as T; } catch { return null; }
  },
  writeText: writeStorText,
  writeJson: (info, value) => writeStorText(info, `${JSON.stringify(value, null, 2)}\n`),
  compile: (info, source) => compileWithDeclaration(info, source),
  declarations: declarationsOf,
  listDefs: (project, folder, level) => Object.values(mls.stor.files)
    .filter(file => file.project === project && file.level === level && file.folder === folder && file.extension === '.defs.ts' && file.status !== 'deleted')
    .map(file => file.shortName),
};

export const promptInfo: Ns5FileInfo = { project: 102020, level: 2, folder: 'agentMaterializeL2/steps/shared40', shortName: 'prompt', extension: '.md' };
export const repairPromptInfo: Ns5FileInfo = { ...promptInfo, shortName: 'promptRepair' };
export function sharedSourceInfo(identity: M4RunIdentity, pageId: string): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/web/shared`, shortName: pageId, extension: '.ts' };
}
export function sharedDeclarationInfo(identity: M4RunIdentity, pageId: string): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/web/shared`, shortName: `${pageId}Dts`, extension: '.txt' };
}
export function sharedReceiptInfo(identity: M4RunIdentity, pageId: string): Ns5FileInfo {
  return { ...m4OwnedFile(identity, pageId), folder: `${identity.module}/pipeline/agentMaterializeL2/shared40` };
}

/** A refused LLM answer, kept for diagnosis only (never read back by the agent). */
export function sharedAttemptInfo(identity: M4RunIdentity, pageId: string, attempt: number): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentMaterializeL2/shared40`, shortName: `${pageId}Attempt${attempt}`, extension: '.txt' };
}

export async function recordM4SharedAttempt(identity: M4RunIdentity, pageId: string, attempt: number, source: unknown, diagnostic: string, port: Pick<M4SharedPort, 'writeText'> = studioSharedPort): Promise<void> {
  const body = typeof source === 'string' ? source : JSON.stringify(source ?? null, null, 2);
  await port.writeText(sharedAttemptInfo(identity, pageId, attempt), `/* refused: ${diagnostic.replace(/\*\//gu, '* /')} */\n\n${body}\n`);
}

export async function readM4Snapshot(identity: M4RunIdentity, port: Pick<M4SharedPort, 'readJson'>): Promise<M4InputSnapshot> {
  const snapshot = await port.readJson<M4InputSnapshot>(m4OwnedFile(identity, 'input'));
  if (!snapshot) throw new Error('M4_SHARED_INPUT_MISSING: input20 must run first.');
  return snapshot;
}

export async function buildM4SharedContext(identity: M4RunIdentity, pageId: string, port: M4SharedPort, snapshot?: M4InputSnapshot): Promise<M4SharedContext> {
  const snap = snapshot ?? await readM4Snapshot(identity, port);
  const page = snap.pages.find(item => item.pageId === pageId);
  if (!page || page.status !== 'accepted') throw new Error(`M4_SHARED_PAGE_NOT_ACCEPTED: ${pageId}`);
  const unit = page.units.find(item => item.kind === 'shared');
  if (!unit) throw new Error(`M4_SHARED_UNIT_MISSING: ${pageId}`);
  const [contract, shared, desktop, prompt] = await Promise.all([
    port.read(m4DefsInfo(identity, 'contract', pageId)),
    port.read(m4DefsInfo(identity, 'shared', pageId)),
    port.read(m4DefsInfo(identity, 'desktop', pageId)),
    port.read(promptInfo),
  ]);
  for (const [kind, text] of [['contract', contract], ['shared', shared], ['desktop', desktop]] as const) {
    if (await sha256Text(text) !== page.inputs[kind]?.sha256) throw new Error(`M4_SHARED_INPUT_STALE: ${pageId} ${kind} changed after input20; run the agent again.`);
  }
  const target: M4SharedTarget = {
    ...identity, pageId,
    className: m4SharedClassName(identity.module, pageId),
    shared: parseL2Shared(shared).definition,
    contract: parseL2Contract(contract).definition,
    rules: page.problems.filter(item => item.severity === 'warning'),
    methods: page.methods ?? {},
    contextInputs: page.contextInputs ?? [],
  };
  const l4Context = page.l4 ? await readL4Module(identity.project, identity.module, { listDefs: (project, folder) => port.listDefs(project, folder, 4), exists: port.exists, read: port.read }) : null;
  const l4 = l4Context && page.l4 ? renderL4Slice(resolveL4Refs(l4Context, page.l4)) : '';
  return { identity, pageId, unitInputHash: unit.inputHash, prompt, target, sources: { contract, shared, desktop }, l4 };
}

export async function buildM4SharedPrompt(context: M4SharedContext, port: Pick<M4SharedPort, 'declarations'> = studioSharedPort): Promise<{ systemPrompt: string; humanPrompt: string }> {
  const { target, sources } = context;
  const organisms = Object.entries(parseL2Page11(sources.desktop).definition.organisms)
    .map(([id, row]) => `- ${id} (${row.kind}): ${row.text}${row.intents.length ? ` Intents: ${row.intents.map(intent => `${intent.id}/${intent.kind}${intent.to ? `→${intent.to}` : ''}`).join(', ')}.` : ''}`);
  const runtime = await port.declarations(M4_SHARED_RUNTIME_REFS);
  const parts = [
    '# Target',
    `- path: ${m4SharedPath(target)}`,
    `- class: ${target.className}`,
    `- module: ${target.module}; pageId: ${target.pageId}; basePath: /${target.module}`,
    `- contract import: ${m4ContractImport(target)}`,
    '',
    `# Contract — web/contracts/${target.pageId}.defs.ts`,
    '```ts', sources.contract.trim(), '```',
    '',
    `# Shared definition — web/shared/${target.pageId}.defs.ts`,
    '```ts', sources.shared.trim(), '```',
    '',
    '# Organisms',
    ...organisms,
    '',
    '# Methods the pages call',
    ...methodLines(target),
    '',
    '# Business context (L4)',
    context.l4 || '(the module has no L4 context)',
    '',
    '# Notes on the defs',
    ...rulesLines(target),
    '',
    ...declarationSections('# Runtime declarations (the real types you code against)', runtime),
  ];
  return { systemPrompt: context.prompt, humanPrompt: parts.join('\n') };
}

/**
 * A focused repair (agentFix style): fix the listed errors in the refused file, change nothing else.
 * Context: errors, the refused file, the .d.ts of every module it imports, the contract, the shared
 * definition, the ids to keep and the page rules. Not the generation prompt again.
 */
export async function buildM4SharedRepairPrompt(context: M4SharedContext, repair: { diagnostic: string; previous: string }, port: Pick<M4SharedPort, 'declarations' | 'read'> = studioSharedPort): Promise<{ systemPrompt: string; humanPrompt: string }> {
  const { target, sources } = context;
  const imports = await port.declarations(mlsImportsOf(repair.previous));
  const parts = [
    '# Target',
    `- path: ${m4SharedPath(target)}`,
    `- class: ${target.className}`,
    '',
    '# Ids to keep',
    `- states: ${Object.keys(target.shared.states).join(', ')}, scenary`,
    `- functions: ${Object.keys(target.shared.functions).join(', ')}, setScenario`,
    `- routes: ${target.contract.routes.map(route => route.route).join(', ')}`,
    '',
    '# Errors',
    '```text', repair.diagnostic.trim(), '```',
    '',
    '# Refused file',
    '```ts', repair.previous.trim() || '(the previous answer had no source)', '```',
    '',
    ...declarationSections('# Import declarations', imports),
    `# Contract — web/contracts/${target.pageId}.defs.ts`,
    '```ts', sources.contract.trim(), '```',
    '',
    `# Shared definition — web/shared/${target.pageId}.defs.ts`,
    '```ts', sources.shared.trim(), '```',
    '',
    '# Methods the pages call',
    ...methodLines(target),
    '',
    '# Notes on the defs',
    ...rulesLines(target),
  ];
  return { systemPrompt: await port.read(repairPromptInfo), humanPrompt: parts.join('\n') };
}

/** Names the page11 intents and the forms use → the public method that serves them. */
function methodLines(target: M4SharedTarget): string[] {
  const rows = Object.entries(target.methods ?? {}).map(([ref, method]) => ref === method ? `- ${method}` : `- ${ref} → ${method} (the defs name it ${ref}; the method is ${method})`);
  return rows.length ? rows : ['- none'];
}

function rulesLines(target: M4SharedTarget): string[] {
  const rules = target.rules.map(rule => `- [${rule.code}] ${rule.path}: ${rule.message}`);
  return rules.length ? rules : ['- none'];
}

function declarationSections(title: string, declarations: Array<{ ref: string; declaration: string }>): string[] {
  if (!declarations.length) return [title, '(not available in this session)', ''];
  return [title, ...declarations.flatMap(item => [`## ${item.ref}`, '```ts', item.declaration.trim(), '```']), ''];
}

/** Gate, write, compile, declaration, receipt. Throws with a diagnostic the repair prompt can quote. */
export async function approveM4Shared(context: M4SharedContext, source: unknown, attempt: number, port: M4SharedPort = studioSharedPort, findings: M4Finding[] = []): Promise<M4SharedReceipt> {
  if (typeof source !== 'string' || !source.trim()) throw new Error('M4_SHARED_EMPTY: submitSharedTs.source must be the whole file.');
  // A missing state JSDoc is formatting the defs can write: it never costs a repair (agendaClinica/consultas, 07/10).
  const text = m4FillStateJsdoc(source.replace(/\r\n/gu, '\n').replace(/\n*$/u, '\n'), context.target);
  const issues = gateM4SharedSource(text, context.target);
  if (issues.length) throw new Error(`M4_SHARED_GATE:\n${issues.map(item => `${item.code}: ${item.message}`).join('\n')}`);
  const sourceInfo = sharedSourceInfo(context.identity, context.pageId);
  await port.writeText(sourceInfo, text);
  const compiled = await port.compile(sourceInfo, text);
  if (compiled.errors.length || !compiled.declaration) throw new Error(`M4_SHARED_COMPILE:\n${(compiled.errors.length ? compiled.errors : ['no declaration emitted']).join('\n')}`);
  const declarationInfo = sharedDeclarationInfo(context.identity, context.pageId);
  await port.writeText(declarationInfo, compiled.declaration);
  // V5: the LLM's own report, plus what the declaration proves it added (it may forget, 05/10: fechamento).
  const allFindings = mergeM4Findings(findings, m4AddedMemberFindings(compiled.declaration, context.target));
  // Hash what the Studio actually stored, read back after the compile: it is what the reuse check reads.
  const receipt: M4SharedReceipt = {
    schemaVersion: M4_SHARED_VERSION, ...context.identity, pageId: context.pageId,
    unitInputHash: context.unitInputHash,
    promptHash: await sha256Text(context.prompt),
    rulesHash: await rulesHashOf(context.target.rules),
    sourcePath: displayPath(sourceInfo), sourceHash: await storedHash(await port.read(sourceInfo)),
    declarationPath: displayPath(declarationInfo), declarationHash: await storedHash(await port.read(declarationInfo)),
    attempt,
    findings: allFindings,
  };
  await port.writeJson(sharedReceiptInfo(context.identity, context.pageId), receipt);
  return receipt;
}

export async function reusableM4Shared(identity: M4RunIdentity, pageId: string, port: M4SharedPort = studioSharedPort, snapshot?: M4InputSnapshot): Promise<boolean> {
  return await m4SharedReuseBlocker(identity, pageId, port, snapshot) === null;
}

/** Why the shared of a page cannot be reused, or null when it can. The reason is quoted by pages50. */
export async function m4SharedReuseBlocker(identity: M4RunIdentity, pageId: string, port: M4SharedPort = studioSharedPort, snapshot?: M4InputSnapshot): Promise<string | null> {
  try {
    const receipt = await port.readJson<M4SharedReceipt>(sharedReceiptInfo(identity, pageId));
    if (!receipt) return `no receipt at ${displayPath(sharedReceiptInfo(identity, pageId))}`;
    if (receipt.schemaVersion !== M4_SHARED_VERSION || receipt.project !== identity.project || receipt.module !== identity.module || receipt.pageId !== pageId) return `receipt of another version or identity (${receipt.schemaVersion})`;
    const snap = snapshot ?? await readM4Snapshot(identity, port);
    const page = snap.pages.find(item => item.pageId === pageId && item.status === 'accepted');
    const unit = page?.units.find(item => item.kind === 'shared');
    if (!page || !unit) return 'page not accepted by input20';
    if (unit.inputHash !== receipt.unitInputHash) return 'contract or shared defs changed (unit fingerprint)';
    if (await rulesHashOf(page.problems.filter(item => item.severity === 'warning')) !== receipt.rulesHash) return 'input20 rules of the page changed';
    if (await sha256Text(await port.read(promptInfo)) !== receipt.promptHash) return 'shared40 prompt.md changed';
    const sourceInfo = sharedSourceInfo(identity, pageId);
    const declarationInfo = sharedDeclarationInfo(identity, pageId);
    if (!port.exists(sourceInfo)) return `${displayPath(sourceInfo)} does not exist`;
    if (!port.exists(declarationInfo)) return `${displayPath(declarationInfo)} does not exist`;
    if (!await sameStored(await port.read(sourceInfo), receipt.sourceHash)) return `${displayPath(sourceInfo)} changed after approval`;
    if (!await sameStored(await port.read(declarationInfo), receipt.declarationHash)) return `${displayPath(declarationInfo)} changed after approval`;
    return null;
  } catch (error) {
    return `reuse check failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/** Receipts written before 01/10 hashed the raw text; both forms are accepted so they are not regenerated. */
async function sameStored(text: string, hash: string): Promise<boolean> {
  return await storedHash(text) === hash || await sha256Text(text) === hash;
}

/** Hash of a stored text, insensitive to CRLF and trailing whitespace the Studio may add on save. */
export async function storedHash(text: string): Promise<string> {
  return sha256Text(text.replace(/\r\n/gu, '\n').replace(/\s+$/u, ''));
}

/**
 * A compile failure the generated code did not cause: the Studio compiler or an imported project is not
 * available in this session (01/10: `_102033_ … fecthQl: Please connect to github!`). A repair would spend
 * an LLM call on correct code, so the worker fails at once with the environment to fix.
 */
export function m4SharedEnvironmentFailure(diagnostic: string): boolean {
  if (!diagnostic.startsWith('M4_SHARED_COMPILE:')) return false;
  return /Studio imports unavailable|Studio TypeScript compiler is unavailable|Studio model is unavailable|Studio compiler returned no result|Studio compile failed/u.test(diagnostic);
}

async function rulesHashOf(rules: Array<{ code: string; path: string; message: string }>): Promise<string> {
  return sha256Text(JSON.stringify(rules.map(rule => [rule.code, rule.path, rule.message])));
}

/**
 * Deterministic findings (V5): every public member of the compiled declaration that the defs do not declare.
 * Generic: the known set is the defs ids (states, functions, resolved methods), the status members of every
 * request, the scene state and the lifecycle of StateLitElement. Anything else was added by the generator.
 */
export function m4AddedMemberFindings(declaration: string, target: M4SharedTarget): M4Finding[] {
  const start = declaration.search(new RegExp(`export declare class ${target.className}\\b`, 'u'));
  const open = start < 0 ? -1 : declaration.indexOf('{', start);
  const close = open < 0 ? -1 : declaration.indexOf('\n}', open);
  const body = open < 0 || close < 0 ? '' : declaration.slice(open + 1, close);
  const requests = Object.keys(target.shared.requests);
  const known = new Set([
    ...Object.keys(target.shared.states), ...Object.keys(target.shared.functions), ...Object.values(target.methods ?? {}),
    ...requests.flatMap(id => [`${id}Status`, `${id}Error`]),
    'scenary', 'setScenario', 'pageStatus', 'connectedCallback', 'disconnectedCallback', 'handleIcaStateChange',
  ]);
  const added = new Set<string>();
  for (const line of body.split('\n')) {
    const member = /^(?: {4}|\t)(?![ \t])(?!private |protected |static )(?:readonly\s+)?(?:get\s+|set\s+)?([A-Za-z_$][\w$]*)\??\s*[(:<]/u.exec(line);
    if (member && !known.has(member[1])) added.add(member[1]);
  }
  return [...added].sort().map(name => ({ code: 'MEMBER_ADDED', message: `public ${name} is not declared by the defs; the shared added it so the pages can drive the page (a draft, a setter, a selection or a filter state).` }));
}

/** Union by code and message, first occurrence kept. */
export function mergeM4Findings(...lists: M4Finding[][]): M4Finding[] {
  const seen = new Set<string>();
  return lists.flat().filter(item => { const key = `${item.code}|${item.message}`; if (seen.has(key)) return false; seen.add(key); return true; });
}

/** The findings of the answer (V5): well-formed rows only; anything else is dropped. */
export function m4SharedToolFindings(payload: unknown): M4Finding[] {
  const args = toolArguments(payload);
  const rows = args && Array.isArray(args.findings) ? args.findings as unknown[] : [];
  return rows.flatMap(row => {
    const item = row && typeof row === 'object' ? row as Record<string, unknown> : {};
    return typeof item.code === 'string' && typeof item.message === 'string' ? [{ code: item.code, message: item.message }] : [];
  });
}

/** The LLM answer arrives as tool arguments; accept the object or its JSON string. */
export function m4SharedToolSource(payload: unknown): unknown {
  return toolArguments(payload)?.source;
}

function toolArguments(payload: unknown): Record<string, unknown> | null {
  const root = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const result = root.type === 'flexible' ? root.result as Record<string, unknown> | undefined : undefined;
  if (result && result.toolName !== M4_SHARED_TOOL) throw new Error(`M4_SHARED_TOOL_MISMATCH: expected ${M4_SHARED_TOOL}.`);
  let args: unknown = result ? result.arguments : root.arguments ?? root.payload ?? root;
  if (typeof args === 'string') {
    try { args = JSON.parse(args); } catch { throw new Error('M4_SHARED_TOOL_JSON: the tool arguments are not JSON.'); }
  }
  return args && typeof args === 'object' ? args as Record<string, unknown> : null;
}

export const m4SharedToolSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['source', 'findings'],
  properties: {
    source: { type: 'string', description: 'The whole TypeScript file of the shared class, starting with the /// <mls fileReference …/> line.' },
    findings: {
      type: 'array',
      description: 'Every gap of the defs you completed (a form draft, a selection setter…); empty when nothing was missing.',
      items: { type: 'object', additionalProperties: false, required: ['code', 'message'], properties: { code: { type: 'string' }, message: { type: 'string' } } },
    },
  },
} as const;
