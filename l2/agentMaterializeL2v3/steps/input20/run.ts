/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/steps/input20/run.ts" enhancement="_blank"/>

import { fileExists, readJson, readSourceText, writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { parseDefsSource } from '/_102020_/l2/aura/helpers/moduleLanguages.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import type { M3Device, M3RunIdentity } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Invocation.js';
import { m3InfoForPath } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3CompileProof.js';
import { failM3Step, m3ErrorMessage, productionFailurePort, type M3FailurePort } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3StepFailure.js';
import { m3TraceFileInfo } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Trace.js';
import type { M3StepResult } from '/_102020_/l2/agentMaterializeL2v3/steps/entry10/run.js';

export const M3_INPUT_VERSION = '2026-10-01-m3-input-v1' as const;
const DEFS_FINALIZE_VERSION = '2026-09-30-agent-defs-l2-finalize-v2';
const ARTIFACT_KINDS = ['contract', 'shared', 'desktopPage', 'mobilePage'] as const;
type ArtifactKind = typeof ARTIFACT_KINDS[number];
const RESERVED_WORDS = new Set([
  'arguments', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else',
  'enum', 'eval', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'implements', 'import', 'in', 'instanceof',
  'interface', 'let', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'static', 'super', 'switch', 'this',
  'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
]);

export interface M3DefsRef { path: string; sha256: string }
export interface M3InputRequest { requestId: string; route: string }
export interface M3InputPage {
  pageId: string;
  defs: Record<ArtifactKind, M3DefsRef>;
  /** In the order of the contract interface. */
  requests: M3InputRequest[];
}
export interface M3Input {
  schemaVersion: typeof M3_INPUT_VERSION;
  project: number;
  module: string;
  runDir: string;
  defsSnapshotHash: string;
  devices: M3Device[];
  pages: M3InputPage[];
}

interface FinalizeReport {
  schemaVersion?: string; status?: string; scope?: string; snapshotHash?: string; pages?: string[]; pending?: unknown[];
  compilation?: Array<{ path?: string; status?: string }>;
}
interface FinalizeOwnership { artifacts?: Array<{ pageId: string; kind: string; path: string; sha256: string }> }

/** Paths are project-relative (`l2/<module>/...`). */
export interface M3InputPort {
  readText(path: string): Promise<string | null>;
  readJson<T>(path: string): Promise<T | null>;
  writeJson(info: Ns5FileInfo, value: unknown): Promise<unknown>;
  failure: M3FailurePort;
}

export function productionInputPort(identity: { project: number; module: string; runDir: string }): M3InputPort {
  return {
    readText: async path => {
      const info = m3InfoForPath(identity.project, path);
      if (!fileExists(info)) return null;
      try { return await readSourceText(info); } catch { return null; }
    },
    readJson: path => readJson(m3InfoForPath(identity.project, path)),
    writeJson,
    failure: productionFailurePort(identity.project, identity.module, identity.runDir),
  };
}

function pascal(pageId: string): string {
  return `${pageId.charAt(0).toUpperCase()}${pageId.slice(1)}`;
}

/** First-level route keys of `export interface <Pascal>Contracts {`, in declaration order. */
export function contractRoutes(contractSource: string, pageId: string): string[] | null {
  const lines = contractSource.split('\n');
  const start = lines.findIndex(line => line.trim() === `export interface ${pascal(pageId)}Contracts {`);
  if (start < 0) return null;
  const routes: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line === '}') break;
    const match = /^ {2}'([^']+)': \{/u.exec(line);
    if (match) routes.push(match[1]);
  }
  return routes;
}

export async function buildM3Input(port: M3InputPort, identity: M3RunIdentity & { runDir: string }): Promise<M3Input> {
  const { project, module, runDir } = identity;
  const base = `l2/${module}/pipeline/agentDefsL2/finalize80`;
  const report = await port.readJson<FinalizeReport>(`${base}/report.json`);
  if (!report) throw new Error(`M3_DEFS_NOT_FINAL: ${base}/report.json is missing or not JSON`);
  const ownership = await port.readJson<FinalizeOwnership>(`${base}/ownership.json`);
  if (!ownership || !Array.isArray(ownership.artifacts)) throw new Error(`M3_DEFS_NOT_FINAL: ${base}/ownership.json is missing or has no artifacts`);
  if (report.schemaVersion !== DEFS_FINALIZE_VERSION) throw new Error(`M3_DEFS_SCHEMA: expected ${DEFS_FINALIZE_VERSION} got ${String(report.schemaVersion)}`);
  if (report.status !== 'complete') throw new Error(`M3_DEFS_NOT_FINAL: report status is ${String(report.status)}`);
  if (report.scope !== 'all') throw new Error(`M3_DEFS_SCOPE: expected all got ${String(report.scope)}`);
  if (!Array.isArray(report.pending) || report.pending.length) throw new Error(`M3_DEFS_PENDING: ${JSON.stringify(report.pending)}`);
  const notPassed = (Array.isArray(report.compilation) ? report.compilation : []).filter(item => item.status !== 'passed');
  if (!Array.isArray(report.compilation) || notPassed.length) throw new Error(`M3_DEFS_NOT_COMPILED: ${notPassed.map(item => item.path).join(', ') || 'no compilation list'}`);

  const owned = new Set(ownership.artifacts.map(item => item.pageId));
  const pageIds = identity.pages ?? (Array.isArray(report.pages) ? report.pages : []);
  if (!pageIds.length) throw new Error('M3_NO_PAGES: the finalize80 report lists no page');
  const pages: M3InputPage[] = [];
  for (const pageId of pageIds) {
    if (!owned.has(pageId)) throw new Error(`M3_PAGE_NOT_OWNED: ${pageId}`);
    const defs = {} as Record<ArtifactKind, M3DefsRef>;
    const sources = {} as Record<ArtifactKind, string>;
    for (const kind of ARTIFACT_KINDS) {
      const artifact = ownership.artifacts.find(item => item.pageId === pageId && item.kind === kind);
      if (!artifact) throw new Error(`M3_OWNERSHIP_INCOMPLETE: ${pageId} has no ${kind} artifact`);
      const content = await port.readText(artifact.path);
      const got = content === null ? 'missing' : await sha256Text(content);
      if (content === null || got !== artifact.sha256) throw new Error(`M3_DEFS_DRIFT: ${artifact.path} expected ${artifact.sha256} got ${got}`);
      defs[kind] = { path: artifact.path, sha256: artifact.sha256 };
      sources[kind] = content;
    }
    pages.push({ pageId, defs, requests: routesAndRequests(module, pageId, sources.contract, sources.shared) });
  }
  return { schemaVersion: M3_INPUT_VERSION, project, module, runDir, defsSnapshotHash: String(report.snapshotHash || ''), devices: identity.devices, pages };
}

/** D-008: the contract routes `<module>.<pageId>.<requestId>` must be exactly the shared `requests` keys. */
function routesAndRequests(module: string, pageId: string, contractSource: string, sharedSource: string): M3InputRequest[] {
  const routes = contractRoutes(contractSource, pageId);
  if (!routes) throw new Error(`M3_CONTRACT_INTERFACE_MISSING: ${pascal(pageId)}Contracts in the contract defs of ${pageId}`);
  const prefix = `${module}.${pageId}.`;
  const badRoute = routes.find(route => !route.startsWith(prefix) || route.length === prefix.length);
  if (badRoute) throw new Error(`M3_ROUTES_NOT_REQUESTS: ${pageId} route ${badRoute} does not follow ${prefix}<requestId>`);
  const contractIds = routes.map(route => route.slice(prefix.length));
  const shared = parseDefsSource(sharedSource);
  const requests = shared?.data.requests;
  if (!requests || typeof requests !== 'object' || Array.isArray(requests)) throw new Error(`M3_SHARED_UNPARSEABLE: shared defs of ${pageId} have no requests object`);
  const sharedIds = Object.keys(requests);
  const onlyContract = contractIds.filter(id => !sharedIds.includes(id));
  const onlyShared = sharedIds.filter(id => !contractIds.includes(id));
  if (onlyContract.length || onlyShared.length) {
    throw new Error(`M3_ROUTES_NOT_REQUESTS: ${pageId} only-contract=[${onlyContract.join(',')}] only-shared=[${onlyShared.join(',')}]`);
  }
  const invalid = contractIds.find(id => !/^[a-z][A-Za-z0-9]*$/u.test(id) || RESERVED_WORDS.has(id));
  if (invalid) throw new Error(`M3_REQUEST_ID_INVALID: ${pageId} ${invalid}`);
  return contractIds.map(requestId => ({ requestId, route: `${prefix}${requestId}` }));
}

export async function executeM3Input(port: M3InputPort, identity: M3RunIdentity & { runDir: string }): Promise<M3StepResult & { input?: M3Input }> {
  try {
    const input = await buildM3Input(port, identity);
    await port.writeJson(m3TraceFileInfo(identity.project, identity.module, identity.runDir, 'input'), input);
    return { status: 'completed', summary: `input20 accepted ${input.pages.length} page(s)`, input };
  } catch (error) {
    return { status: 'failed', reason: await failM3Step(port.failure, { module: identity.module, runDir: identity.runDir, stepId: 'input20' }, m3ErrorMessage(error)) };
  }
}
