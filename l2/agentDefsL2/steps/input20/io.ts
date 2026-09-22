/// <mls fileReference="_102020_/l2/agentDefsL2/steps/input20/io.ts" enhancement="_blank"/>

import { parseNs4ClassicDefsSource } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import {
  displayPath,
  readJson,
  readSourceText,
  writeJson,
  type Ns5FileInfo,
} from '/_102035_/l2/solution/fs.js';
import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import {
  D2_INPUT_REPORT_VERSION,
  type D2InputArtifacts,
  type D2InputProblem,
  type D2InputReport,
  type D2InputSnapshot,
  type D2SourceDigest,
} from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';

interface ReadSource {
  info: Ns5FileInfo;
  source: string;
  parsed: unknown;
  digest: D2SourceDigest;
}

export interface D2ReadBundle {
  artifacts: D2InputArtifacts;
  files: Array<{ info: Ns5FileInfo; digest: D2SourceDigest }>;
}

export function d2InputFile(identity: D2RunIdentity): Ns5FileInfo {
  return ownedFile(identity, 'input');
}

export function d2InputReportFile(identity: D2RunIdentity): Ns5FileInfo {
  return ownedFile(identity, 'inputReport');
}

export async function readD2Input(identity: D2RunIdentity): Promise<D2InputSnapshot | null> {
  const value = await readJson<D2InputSnapshot>(d2InputFile(identity));
  return value && value.project === identity.project && value.module === identity.module ? value : null;
}

/** Named reader for finalize60 and the supervisor. */
export async function readD2InputProblems(identity: D2RunIdentity): Promise<D2InputProblem[]> {
  const report = await readJson<D2InputReport>(d2InputReportFile(identity));
  if (report?.project === identity.project && report.module === identity.module) return report.problems;
  return (await readD2Input(identity))?.problems || [];
}

export async function writeAcceptedD2Input(identity: D2RunIdentity, snapshot: D2InputSnapshot): Promise<{ reused: boolean }> {
  const existing = await readD2Input(identity);
  const reused = existing?.snapshotHash === snapshot.snapshotHash;
  if (!reused) await writeJson(d2InputFile(identity), snapshot);
  const report: D2InputReport = {
    schemaVersion: D2_INPUT_REPORT_VERSION,
    project: identity.project,
    module: identity.module,
    outcome: 'accepted',
    snapshotHash: snapshot.snapshotHash,
    problems: snapshot.problems,
  };
  if (JSON.stringify(await readJson<D2InputReport>(d2InputReportFile(identity))) !== JSON.stringify(report)) {
    await writeJson(d2InputReportFile(identity), report);
  }
  return { reused };
}

export async function writeRefusedD2Input(identity: D2RunIdentity, problems: D2InputProblem[]): Promise<void> {
  await writeJson(d2InputReportFile(identity), {
    schemaVersion: D2_INPUT_REPORT_VERSION,
    project: identity.project,
    module: identity.module,
    outcome: 'refused',
    problems,
  } satisfies D2InputReport);
}

export async function readD2InputBundle(identity: D2RunIdentity): Promise<D2ReadBundle> {
  const fixedInfos = sourceInfos(identity);
  const fixed = await Promise.all(fixedInfos.map(readOne));
  const parsed = new Map(fixed.map(source => [displayPath(source.info), source.parsed]));
  const journeyIndex = record(parsed.get(`l4/${identity.module}/journeys/index.defs.ts`));
  const ontologyIndex = record(parsed.get(`l4/${identity.module}/ontology/index.defs.ts`));
  const journeyIds = idList(journeyIndex.journeys, 'journeyId');
  const entityIds = idList(ontologyIndex.entities, 'entityId');
  const dynamicInfos = [
    ...journeyIds.map(id => defsInfo(identity, `${identity.module}/journeys`, id)),
    ...entityIds.map(id => defsInfo(identity, `${identity.module}/ontology`, id)),
  ];
  const dynamic = await Promise.all(dynamicInfos.map(readOne));
  const all = [...fixed, ...dynamic];
  const byPath = new Map(all.map(source => [displayPath(source.info), source]));
  const get = (path: string): unknown => byPath.get(path)?.parsed ?? null;
  const journeys: Record<string, unknown> = {};
  const entities: Record<string, unknown> = {};
  for (const id of journeyIds) journeys[id] = get(`l4/${identity.module}/journeys/${id}.defs.ts`);
  for (const id of entityIds) entities[id] = get(`l4/${identity.module}/ontology/${id}.defs.ts`);
  const artifacts: D2InputArtifacts = {
    sources: all.map(source => source.digest),
    module: get(`l4/${identity.module}/module.defs.ts`),
    journeyIndex,
    journeys,
    ontologyIndex,
    entities,
    rules: get(`l4/${identity.module}/rules.defs.ts`),
    workflows: get(`l4/${identity.module}/workflows.defs.ts`),
    access: get(`l4/${identity.module}/access.defs.ts`),
    integration: get(`l4/${identity.module}/integration.defs.ts`),
    menu: get(`l4/${identity.module}/pool/l2/web/menu.json`),
    needs: get(`l4/${identity.module}/pool/l1/web/needs.json`),
    backend: get(`l4/${identity.module}/pool/l2/web/backend.json`),
    effort: get(`l4/${identity.module}/pool/l2/web/effort.json`),
  };
  return { artifacts, files: all.map(source => ({ info: source.info, digest: source.digest })) };
}

export async function assertD2InputSourcesStable(bundle: D2ReadBundle): Promise<void> {
  for (const file of bundle.files) {
    const source = await readSourceText(file.info);
    const hash = await sha256Text(source);
    if (hash !== file.digest.sha256) throw new Error(`SOURCE_CHANGED_DURING_INPUT: ${file.digest.path}`);
  }
}

async function readOne(info: Ns5FileInfo): Promise<ReadSource> {
  const source = await readSourceText(info);
  const parsed = info.extension === '.json' ? parseJson(source, displayPath(info)) : parseDefs(source, displayPath(info));
  return {
    info,
    source,
    parsed,
    digest: {
      path: displayPath(info),
      sha256: await sha256Text(source),
      bytes: new TextEncoder().encode(source).length,
      schemaVersion: text(record(parsed).schemaVersion),
    },
  };
}

function sourceInfos(identity: D2RunIdentity): Ns5FileInfo[] {
  const module = identity.module;
  return [
    defsInfo(identity, module, 'module'),
    defsInfo(identity, `${module}/journeys`, 'index'),
    defsInfo(identity, `${module}/ontology`, 'index'),
    defsInfo(identity, module, 'rules'),
    defsInfo(identity, module, 'workflows'),
    defsInfo(identity, module, 'access'),
    defsInfo(identity, module, 'integration'),
    jsonInfo(identity, `${module}/pool/l2/web`, 'menu'),
    jsonInfo(identity, `${module}/pool/l1/web`, 'needs'),
    jsonInfo(identity, `${module}/pool/l2/web`, 'backend'),
    jsonInfo(identity, `${module}/pool/l2/web`, 'effort'),
  ];
}

function defsInfo(identity: D2RunIdentity, folder: string, shortName: string): Ns5FileInfo {
  return { project: identity.project, level: 4, folder, shortName: safeToken(shortName), extension: '.defs.ts' };
}

function jsonInfo(identity: D2RunIdentity, folder: string, shortName: string): Ns5FileInfo {
  return { project: identity.project, level: 4, folder, shortName, extension: '.json' };
}

function ownedFile(identity: D2RunIdentity, shortName: string): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2`, shortName, extension: '.json' };
}

function parseJson(source: string, path: string): unknown {
  try { return JSON.parse(source); } catch { throw new Error(`INVALID_JSON_SOURCE: ${path}`); }
}

function parseDefs(source: string, path: string): unknown {
  const parsed = parseNs4ClassicDefsSource<unknown>(source);
  if (!parsed) throw new Error(`INVALID_DEFS_SOURCE: ${path}`);
  return parsed;
}

function idList(value: unknown, key: string): string[] {
  return Array.isArray(value) ? value.map(item => safeToken(text(record(item)[key]))) : [];
}

function safeToken(value: string): string {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) throw new Error(`UNSAFE_SOURCE_ID: ${value || '(missing)'}`);
  return value;
}

async function sha256Text(source: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
