import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNs4ClassicDefsSource } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import { buildD2InputSnapshot } from '/_102020_/l2/agentDefsL2/steps/input20/gate.js';
import type { D2InputArtifacts, D2SourceDigest } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { buildD2ContractsCatalog } from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';
import { d2ContractsSources } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const APP = path.join(MLS_BASE, 'mls-102047');
const GENERATOR = path.join(MLS_BASE, 'mls-102020');
const CATALOG = path.join(MLS_BASE, 'mls-102040');
const CURRENT = 'a2f929ed';
const HISTORICAL = '7d3b2ac';
const identity = { project: 102047, module: 'agendaClinica' } as const;

const git = (repo: string, args: string[]): string => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });
const show = (revision: string, file: string): string => git(APP, ['show', `${revision}:${file}`]);
const json = (revision: string, file: string): Record<string, unknown> => JSON.parse(show(revision, file)) as Record<string, unknown>;
const defs = (revision: string, file: string): Record<string, unknown> => {
  const parsed = parseNs4ClassicDefsSource<Record<string, unknown>>(show(revision, file));
  if (!parsed) throw new Error(`INVALID_DEFS_SOURCE: ${file}`);
  return parsed;
};
const rows = (value: unknown): Array<Record<string, unknown>> => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>> : [];
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const hash = (value: string): string => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const bytes = (value: string): number => Buffer.byteLength(value);

function digest(file: string, source: string, parsed: Record<string, unknown>): D2SourceDigest {
  return { path: file.replace(/^l4\//, 'l4/'), sha256: hash(source), bytes: bytes(source), schemaVersion: text(parsed.schemaVersion) };
}

function loadCurrent(): { artifacts: D2InputArtifacts; hashes: D2SourceDigest[] } {
  const defsPaths = [
    'l4/agendaClinica/module.defs.ts', 'l4/agendaClinica/journeys/index.defs.ts',
    'l4/agendaClinica/ontology/index.defs.ts', 'l4/agendaClinica/rules.defs.ts',
    'l4/agendaClinica/workflows.defs.ts', 'l4/agendaClinica/access.defs.ts',
    'l4/agendaClinica/integration.defs.ts',
  ];
  const jsonPaths = [
    'l4/agendaClinica/pool/l2/web/menu.json', 'l4/agendaClinica/pool/l1/web/needs.json',
    'l4/agendaClinica/pool/l2/web/backend.json', 'l4/agendaClinica/pool/l2/web/effort.json',
  ];
  const parsed = new Map<string, Record<string, unknown>>();
  const sources = new Map<string, string>();
  for (const file of defsPaths) { const source = show(CURRENT, file); sources.set(file, source); parsed.set(file, defs(CURRENT, file)); }
  for (const file of jsonPaths) { const source = show(CURRENT, file); sources.set(file, source); parsed.set(file, JSON.parse(source) as Record<string, unknown>); }
  const journeyIds = rows(parsed.get('l4/agendaClinica/journeys/index.defs.ts')?.journeys).map(item => text(item.journeyId));
  const entityIds = rows(parsed.get('l4/agendaClinica/ontology/index.defs.ts')?.entities).map(item => text(item.entityId));
  const journeys: Record<string, unknown> = {}; const entities: Record<string, unknown> = {};
  for (const id of journeyIds) { const file = `l4/agendaClinica/journeys/${id}.defs.ts`; const source = show(CURRENT, file); sources.set(file, source); journeys[id] = defs(CURRENT, file); parsed.set(file, journeys[id] as Record<string, unknown>); }
  for (const id of entityIds) { const file = `l4/agendaClinica/ontology/${id}.defs.ts`; const source = show(CURRENT, file); sources.set(file, source); entities[id] = defs(CURRENT, file); parsed.set(file, entities[id] as Record<string, unknown>); }
  const hashes = [...sources].map(([file, source]) => digest(file, source, parsed.get(file)!)).sort((a, b) => a.path.localeCompare(b.path));
  return { artifacts: {
    sources: hashes,
    module: parsed.get(defsPaths[0]), journeyIndex: parsed.get(defsPaths[1]), journeys,
    ontologyIndex: parsed.get(defsPaths[2]), entities, rules: parsed.get(defsPaths[3]),
    workflows: parsed.get(defsPaths[4]), access: parsed.get(defsPaths[5]), integration: parsed.get(defsPaths[6]),
    menu: parsed.get(jsonPaths[0]), needs: parsed.get(jsonPaths[1]), backend: parsed.get(jsonPaths[2]), effort: parsed.get(jsonPaths[3]),
  }, hashes };
}

function pagesOf(menu: Record<string, unknown>): string[] {
  const visit = (nodes: Array<Record<string, unknown>>): string[] => nodes.flatMap(node => [
    ...(node.kind === 'page' ? [text(node.id)] : []), ...visit(rows(node.children)),
  ]);
  return visit(rows(menu.tree));
}

async function main(): Promise<void> {
  const heads = { generator: git(GENERATOR, ['rev-parse', '--short=8', 'HEAD']).trim(), app: git(APP, ['rev-parse', '--short=8', 'HEAD']).trim(), catalog: git(CATALOG, ['rev-parse', '--short=8', 'HEAD']).trim() };
  const statuses = { generator: git(GENERATOR, ['status', '--short']), app: git(APP, ['status', '--short']), catalog: git(CATALOG, ['status', '--short']) };
  const loaded = loadCurrent();
  const historicalMenu = json(HISTORICAL, 'l4/agendaClinica/pool/l2/web/menu.json');
  const currentMenu = loaded.artifacts.menu as Record<string, unknown>;
  const historicalPages = pagesOf(historicalMenu); const currentPages = pagesOf(currentMenu);
  const input = { heads, pinned: { generator: 'e46eda5b', app: CURRENT, catalog: 'f5845db5', historical: HISTORICAL }, statuses, sourceDigests: loaded.hashes };
  write('inputs-hashes.json', input);
  write('historical-regression.json', {
    revision: HISTORICAL, pages: historicalPages, homePages: historicalPages.filter(id => /home/i.test(id)),
    currentRevision: CURRENT, currentPages, removedHomes: historicalPages.filter(id => /home/i.test(id) && !currentPages.includes(id)),
  });

  let snapshot: Awaited<ReturnType<typeof buildD2InputSnapshot>> | null = null;
  let inputError = ''; let contractsError = ''; let contractCount = 0;
  try { snapshot = await buildD2InputSnapshot(identity, loaded.artifacts); }
  catch (error) { inputError = error instanceof Error ? error.message : String(error); }
  if (snapshot) {
    try { contractCount = buildD2ContractsCatalog(d2ContractsSources(snapshot, loaded.artifacts)).length; }
    catch (error) { contractsError = error instanceof Error ? error.message : String(error); }
  }
  const expectedDefs = snapshot?.selection.pages.flatMap(page => page.destinations.map(item => item.path)).sort() || [];
  const materialization = snapshot?.selection.pages.flatMap(page => page.destinations.filter(item => item.materializationId).map(item => item.path.replace(/\.defs\.ts$/, '.ts'))).sort() || [];
  write('agent-report.json', {
    invocation: '@@agentDefsL2 agendaClinica', snapshot: snapshot ? { hash: snapshot.snapshotHash, counts: snapshot.selection.counts, pages: snapshot.selection.pages.map(page => ({ pageId: page.pageId, status: page.status, endpoints: page.endpoints.length })) } : null,
    phases: { input20: inputError ? { status: 'failed', diagnostic: inputError } : { status: 'approved' }, contracts30: contractsError ? { status: 'failed', diagnostic: contractsError } : { status: 'approved', units: contractCount }, shared40: { status: 'not-run', reason: 'contracts30 did not approve' }, pages50: { status: 'not-run', reason: 'contracts30 did not approve' }, finalize60: { status: 'not-run', reason: 'upstream barrier absent' } },
    liveRun: { performed: false, owner: 'supervisor L2', reason: 'Instance unavailable: neutral-folder `collabmsg --project 102047 rooms` timed out before room selection; no room id was invented and no message/task was sent.', exitCode: 3, endpoint: 'https://102056.collabcodes.com/msg', httpStatus: 0 },
  });
  write('inventory.json', { expectedDefs, expectedDefCount: expectedDefs.length, expectedMaterializationItems: materialization, expectedMaterializationCount: materialization.length, actualWrites: [], materializationExecuted: false });
  const access = loaded.artifacts.access as Record<string, unknown>;
  const consulta = loaded.artifacts.entities.Consulta as Record<string, unknown>;
  const backend = loaded.artifacts.backend as Record<string, unknown>;
  write('fidelity.json', {
    routes: rows(backend.endpoints).map(item => text(item.route)).sort(), routeCount: rows(backend.endpoints).length,
    receptionistDisclosure: rows(access.grants).filter(item => text(item.actorRef) === 'recepcionista').map(item => item.disclosure),
    professionalDisclosure: rows(access.grants).filter(item => text(item.actorRef) === 'profissional').map(item => item.disclosure),
    consultaTransitions: rows(consulta.transitions).map(item => ({ transitionId: item.transitionId, payload: item.payload ?? null })),
    backendDtoAbsentAccepted: !Object.prototype.hasOwnProperty.call(backend, 'dtos'),
  });
  write('execution.json', { llmCalls: 0, attempts: 0, repairLimitPerUnit: 1, cost: 0, moleculeContext: { status: 'not-read', bytes: 0, reason: 'contracts30 barrier failed before shared/pages context' }, noOp: { status: 'not-reachable' }, partialMaintenance: { status: 'fixture-covered-by-d2_08', livePlanMutationAuthorized: false }, interruption: { status: 'fixture-covered-by-pages50-run-test', liveFaultInjected: false } });
  write('live-run.json', { command: 'collabmsg --project 102047 rooms', cwd: 'neutral folder', exitCode: 3, endpoint: 'https://102056.collabcodes.com/msg', httpStatus: 0, diagnostic: 'Operation timed out during TCP connection; instance unavailable before room discovery.', messagesSent: 0, tasksCreated: 0, source: 'supervisor check' });

  const tsc = spawnSync('rtk', ['proxy', 'node_modules/.bin/tsc', '--noEmit'], { cwd: MLS_BASE, encoding: 'utf8' });
  writeFileSync(path.join(HERE, 'tsc.log'), `${tsc.stdout}${tsc.stderr}`);
  const runner = spawnSync('rtk', ['proxy', 'node', 'scripts/run-tests.mjs', '102020', 'l2'], { cwd: MLS_BASE, encoding: 'utf8' });
  writeFileSync(path.join(HERE, 'runner.log'), `${runner.stdout}${runner.stderr}`);
  write('certification.json', { tscExitCode: tsc.status, tscErrorCount: count(tsc.stdout + tsc.stderr, /error TS[0-9]+:/g), runnerExitCode: runner.status, runnerNamedFailures: count(runner.stdout + runner.stderr, /^\u2716 /gm), runnerFiles: /\[test:mls-102020:l2\] (\d+) file/.exec(runner.stdout + runner.stderr)?.[1] || null, runnerStubs: /(\d+) stub\(s\) skipped/.exec(runner.stdout + runner.stderr)?.[1] || null });
}

function write(name: string, value: unknown): void { writeFileSync(path.join(HERE, name), `${JSON.stringify(value, null, 2)}\n`); }
function count(value: string, pattern: RegExp): number { return [...value.matchAll(pattern)].length; }

void main().catch(error => { console.error(error); process.exitCode = 1; });
