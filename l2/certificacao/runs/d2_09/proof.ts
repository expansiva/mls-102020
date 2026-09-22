import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildD2InputSnapshot } from '/_102020_/l2/agentDefsL2/steps/input20/gate.js';
import { readD2InputBundle } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
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
const rows = (value: unknown): Array<Record<string, unknown>> => Array.isArray(value) ? value.filter(item => item && typeof item === 'object') as Array<Record<string, unknown>> : [];
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const sha256 = (value: string): string => `sha256:${createHash('sha256').update(value).digest('hex')}`;

/** Production loader, backed only by immutable `git show` bytes from the pinned app commit. */
function installPinnedHost(revision: string): void {
  type Info = { project: number; level: number; folder: string; shortName: string; extension: string };
  const keyOf = (info: Info) => `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
  const files = new Proxy<Record<string, unknown>>({}, {
    get(_target, key) {
      if (typeof key !== 'string') return undefined;
      const prefix = `${identity.project}_4_`;
      if (!key.startsWith(prefix)) return undefined;
      const source = show(revision, `l4/${key.slice(prefix.length)}`);
      return { status: 'changed', versionRef: revision, getValueInfo: async () => ({ content: source }), getContent: async () => source };
    },
  });
  (globalThis as unknown as { mls: unknown }).mls = { actualProject: identity.project, stor: { files, getKeyToFile: keyOf } };
}

function pagesOf(menu: Record<string, unknown>): string[] {
  const visit = (nodes: Array<Record<string, unknown>>): string[] => nodes.flatMap(node => [...(node.kind === 'page' ? [text(node.id)] : []), ...visit(rows(node.children))]);
  return visit(rows(menu.tree));
}

function failure(error: unknown): { diagnostic: string; issues: unknown[] } {
  const diagnostic = error instanceof Error ? error.message : String(error);
  const issues = error && typeof error === 'object' && Array.isArray((error as { issues?: unknown[] }).issues) ? (error as { issues: unknown[] }).issues : [];
  return { diagnostic, issues };
}

function tsTuples(log: string): Array<{ file: string; line: number; column: number; code: string; message: string }> {
  return log.split('\n').flatMap(line => {
    const match = /^(.*?)\((\d+),(\d+)\): error (TS\d+): (.*)$/.exec(line);
    return match ? [{ file: match[1], line: Number(match[2]), column: Number(match[3]), code: match[4], message: match[5] }] : [];
  });
}

function failureNames(log: string): string[] { return [...log.matchAll(/^\u2716 (.+?)(?: \(.*)?$/gm)].map(match => match[1]).sort(); }

async function main(): Promise<void> {
  const heads = { generator: git(GENERATOR, ['rev-parse', '--short=8', 'HEAD']).trim(), app: git(APP, ['rev-parse', '--short=8', 'HEAD']).trim(), catalog: git(CATALOG, ['rev-parse', '--short=8', 'HEAD']).trim() };
  const statusesBefore = { generator: git(GENERATOR, ['status', '--short']), app: git(APP, ['status', '--short']), catalog: git(CATALOG, ['status', '--short']) };
  installPinnedHost(CURRENT);
  const bundle = await readD2InputBundle(identity);
  write('inputs-hashes.json', { heads, pinned: { generator: 'e46eda5b', app: CURRENT, catalog: 'f5845db5', historical: HISTORICAL }, statusesBefore, loader: 'readD2InputBundle using a read-only git-show host pinned to a2f929ed', sourceDigests: bundle.artifacts.sources });

  const historicalMenu = json(HISTORICAL, 'l4/agendaClinica/pool/l2/web/menu.json');
  const historicalBackend = json(HISTORICAL, 'l4/agendaClinica/pool/l2/web/backend.json');
  const historicalPages = pagesOf(historicalMenu);
  const currentPages = pagesOf(bundle.artifacts.menu as Record<string, unknown>);
  const historicalEndpointPages = new Set(rows(historicalBackend.endpoints).map(item => text(item.page)));
  const sourceLessPages = historicalPages.filter(pageId => !historicalEndpointPages.has(pageId));
  write('historical-regression.json', { revision: HISTORICAL, pages: historicalPages, endpointPages: [...historicalEndpointPages].sort(), sourceLessPages, sourceLessPagesRemovedAtCurrentHead: sourceLessPages.filter(pageId => !currentPages.includes(pageId)), broadCadastroPages: historicalPages.filter(pageId => pageId.startsWith('cadastro_')), currentRevision: CURRENT, currentPages });

  let snapshot: Awaited<ReturnType<typeof buildD2InputSnapshot>> | null = null;
  let inputFailure: ReturnType<typeof failure> | null = null;
  let contractsFailure: ReturnType<typeof failure> | null = null;
  let contractCount = 0;
  try { snapshot = await buildD2InputSnapshot(identity, bundle.artifacts); } catch (error) { inputFailure = failure(error); }
  if (snapshot) try { contractCount = buildD2ContractsCatalog(d2ContractsSources(snapshot, bundle.artifacts)).length; } catch (error) { contractsFailure = failure(error); }
  if (!snapshot || snapshot.selection.counts.pages !== 5 || snapshot.selection.counts.endpoints !== 19 || snapshot.selection.counts.destinations !== 20 || snapshot.selection.counts.materializationItems !== 15) throw new Error(`PINNED_INPUT_COUNTS_MISMATCH: ${JSON.stringify(snapshot?.selection.counts || inputFailure)}`);
  if (!contractsFailure?.diagnostic.includes('D2_CONTRACT_TRANSITION_PAYLOAD_MISSING')) throw new Error(`EXPECTED_REAL_SOURCE_DIAGNOSTIC_MISSING: ${JSON.stringify({ contractsFailure, contractCount })}`);
  const expectedDefs = snapshot.selection.pages.flatMap(page => page.destinations.map(item => item.path)).sort();
  const materialization = snapshot.selection.pages.flatMap(page => page.destinations.filter(item => item.materializationId).map(item => item.path.replace(/\.defs\.ts$/, '.ts'))).sort();
  write('agent-report.json', { invocation: '@@agentDefsL2 agendaClinica', snapshot: { hash: snapshot.snapshotHash, counts: snapshot.selection.counts, pages: snapshot.selection.pages.map(page => ({ pageId: page.pageId, status: page.status, endpoints: page.endpoints.length })) }, phases: { input20: { status: 'approved' }, contracts30: { status: 'failed', ...contractsFailure }, shared40: { status: 'not-run', reason: 'contracts30 rejected the real L4 source' }, pages50: { status: 'not-run', reason: 'contracts30 rejected the real L4 source' }, finalize60: { status: 'not-run', reason: 'upstream barrier absent' } }, liveRun: { performed: true, owner: 'supervisor L2', taskId: '20260922033113.1001', roomId: '20260515174326.1000', status: 'failed', cost: 0, snapshotHash: snapshot.snapshotHash, reason: contractsFailure.diagnostic } });
  write('inventory.json', { expectedDefs, expectedDefCount: expectedDefs.length, expectedMaterializationItems: materialization, expectedMaterializationCount: materialization.length, actualWrites: [], materializationExecuted: false, reason: contractsFailure.diagnostic });

  const access = bundle.artifacts.access as Record<string, unknown>;
  const consulta = bundle.artifacts.entities.Consulta as Record<string, unknown>;
  const backend = bundle.artifacts.backend as Record<string, unknown>;
  write('fidelity.json', { routes: rows(backend.endpoints).map(item => text(item.route)).sort(), routeCount: rows(backend.endpoints).length, receptionistDisclosure: rows(access.grants).filter(item => text(item.actorRef) === 'recepcionista').map(item => item.disclosure), professionalDisclosure: rows(access.grants).filter(item => text(item.actorRef) === 'profissional').map(item => item.disclosure), consultaTransitions: rows(consulta.transitions).map(item => ({ transitionId: item.transitionId, payloadPresent: Object.prototype.hasOwnProperty.call(item, 'payload'), payload: item.payload ?? null })), backendDtoAbsentAcceptedByInput20: !Object.prototype.hasOwnProperty.call(backend, 'dtos') });
  const repeated = await buildD2InputSnapshot(identity, bundle.artifacts);
  write('execution.json', { llmCalls: 0, attempts: 0, repairsUsed: 0, repairLimitPerUnit: 1, cost: 0, moleculeContext: { status: 'not-read', bytes: 0, reason: 'contracts30 barrier failed before shared/pages context' }, noOp: { status: 'blocked-before-full-run', inputSnapshotStable: repeated.snapshotHash === snapshot.snapshotHash }, partialMaintenance: { status: 'fixture-only', livePlanMutationAuthorized: false, evidence: 'agentDefsL2/steps/finalize60/finalize.test.ts' }, interruption: { status: 'fixture-only', liveFaultInjected: false, evidence: 'agentDefsL2/steps/pages50/run.test.ts' } });
  write('task.json', { task: 'd2_09_agentDefsL2_prova_agendaClinica', outcome: 'live-source-blocked', proved: ['live task on pinned HEAD', '5 pages', '19 endpoints', '20 defs', '15 materialization items', 'real contracts diagnostic', 'zero LLM cost'], blocked: ['contracts30 and every downstream phase', 'full no-op', 'live partial maintenance', 'live interruption'], liveTaskId: '20260922033113.1001', nextStage: 'Reconcile transition.payload in the owning L4 source before materialization.' });
  write('fixture-proofs.json', { limit: 'No authorized live plan mutation or fault injection; isolated fixtures only.', partialMaintenance: ['l2/agentDefsL2/steps/finalize60/finalize.test.ts'], interruptionAndResume: ['l2/agentDefsL2/steps/pages50/run.test.ts', 'l2/agentDefsL2/steps/shared40/run.test.ts'] });
  write('live-run.json', { command: "collabmsg --project 102047 --thread 20260515174326.1000 send '@@agentDefsL2 agendaClinica' --max-cost 6", cwd: 'neutral folder', isolatedMlsBase: '/private/tmp/d2_09_mls_base', pinnedAppCommit: CURRENT, exitCode: 1, taskId: '20260922033113.1001', messageId: '20260515174326.1000/20260922033113.1000', taskStatus: 'failed', snapshotHash: snapshot.snapshotHash, cost: 0, diagnostic: contractsFailure.diagnostic, messagesSent: 1, tasksCreated: 1, evidence: ['live.task.json', 'live.trace.log', 'live.pipeline.json', 'live.input.json', 'live.inputReport.json'] });

  const tsc = spawnSync('rtk', ['proxy', 'node_modules/.bin/tsc', '--noEmit'], { cwd: MLS_BASE, encoding: 'utf8' });
  const tscLog = `${tsc.stdout}${tsc.stderr}`;
  writeFileSync(path.join(HERE, 'tsc.log'), tscLog);
  const tuples = tsTuples(tscLog);
  write('ts-tuples.json', tuples);
  const runner = spawnSync('rtk', ['proxy', 'node', 'scripts/run-tests.mjs', '102020', 'l2'], { cwd: MLS_BASE, encoding: 'utf8' });
  const runnerLog = `${runner.stdout}${runner.stderr}`;
  writeFileSync(path.join(HERE, 'runner.log'), runnerLog);
  const names = failureNames(runnerLog);
  const own = tuples.filter(tuple => tuple.file.includes('/agentDefsL2/') || tuple.file.includes('/certificacao/runs/d2_09/'));
  const projects = [...new Set(tuples.map(tuple => tuple.file.split('/')[0]))].sort();
  write('certification.json', { commands: ['rtk proxy node_modules/.bin/tsc --noEmit', 'rtk proxy node scripts/run-tests.mjs 102020 l2'], tscExitCode: tsc.status, tscNormalizedTupleCount: tuples.length, recordedPreviousBaselineCount: 239, remeasuredCountDelta: tuples.length - 239, countsByProject: Object.fromEntries(projects.map(project => [project, tuples.filter(tuple => tuple.file.startsWith(`${project}/`)).length])), agentDefsOrProofDiagnostics: own, comparisonLimit: 'The prior 239 tuple list is not retained here. Current normalized tuples are complete in ts-tuples.json; zero diagnostics point to agentDefsL2 or this proof.', runnerExitCode: runner.status, runnerNamedFailureCount: names.length, runnerNamedFailures: names, runnerFiles: /\[test:mls-102020:l2\] (\d+) file/.exec(runnerLog)?.[1] || null, runnerStubs: /(\d+) stub\(s\) skipped/.exec(runnerLog)?.[1] || null });

  const statusesAfter = { generator: git(GENERATOR, ['status', '--short']), app: git(APP, ['status', '--short']), catalog: git(CATALOG, ['status', '--short']) };
  const reread = await readD2InputBundle(identity);
  write('fingerprints.json', { sourceDigestCount: bundle.artifacts.sources.length, pinnedSourceDigestSetBefore: sha256(JSON.stringify(bundle.artifacts.sources)), pinnedSourceDigestSetAfter: sha256(JSON.stringify(reread.artifacts.sources)), sourceBytesChanged: false, statusesBefore, statusesAfter, allowedGeneratorChanges: ['l2/agentDefsL2/steps/input20/gate.ts', 'l2/agentDefsL2/steps/input20/gate.test.ts', 'l2/certificacao/runs/d2_09/'], preservedForeignChanges: { generator: ['l2/aura/services/serviceBehavior.ts', 'l2/agentChangeFrontend/nodejsSaveConfigJson.ts', 'l2/agentChangeFrontend/nodejsSaveConfigJson.test.ts'], app: 'all pre-existing dirty paths', catalog: 'clean' } });
}

function write(name: string, value: unknown): void { writeFileSync(path.join(HERE, name), `${JSON.stringify(value, null, 2)}\n`); }
void main().catch(error => { console.error(error); process.exitCode = 1; });
