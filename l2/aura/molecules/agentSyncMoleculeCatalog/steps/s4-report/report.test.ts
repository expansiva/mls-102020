/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s4-report/report.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSyRunReport, renderSyRunSummary } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s4-report/report.js';
import { SyGroupArtifact, SyIndexTsArtifact, SyProjectArtifact, SyRunInput } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTypes.js';

const INPUT: SyRunInput = {
  schemaVersion: 1,
  savedAt: '2026-08-25T00:00:00.000Z',
  runKey: 'sync-20260825t000000',
  mentionRaw: '',
  wantsAll: true,
  includeIndexTsRequested: false,
  matchedGroups: ['groupEnterNumber'],
  indexTsMigrationGroups: ['groupEnterNumber'],
  indexTsCreationGroups: [],
  ignoredGroups: [{ folder: 'groupnavigatemain', reason: 'sem entrada em skills/index.ts' }],
  requestedButIgnoredGroups: [],
  unknownGroups: [],
  catalogGroups: [{ folder: 'groupenternumber', canonical: 'groupEnterNumber', purpose: 'Allows the user to input numeric values.', usageContract: '/_102020_/l2/aura/molecules/skills/groupEnterNumber/usage' }],
};

const GROUP_ARTIFACT: SyGroupArtifact = {
  schemaVersion: 1,
  savedAt: '2026-08-25T00:00:00.000Z',
  runKey: 'sync-20260825t000000',
  folder: 'groupenternumber',
  canonical: 'groupEnterNumber',
  purpose: 'Allows the user to input numeric values.',
  usageContract: '/_102020_/l2/aura/molecules/skills/groupEnterNumber/usage',
  moleculeShortTags: ['ml-floating-number-input', 'ml-number-input', 'ml-number-stepper'],
  moleculesWithoutDefs: [],
  scenarioCount: 4,
  scenariosSource: 'harvested',
  indexDefsFile: 'l2/molecules/groupenternumber/index.defs.ts',
  indexHtmlFile: 'l2/molecules/groupenternumber/index.html',
};

const PROJECT_ARTIFACT: SyProjectArtifact = {
  schemaVersion: 1,
  savedAt: '2026-08-25T00:00:00.000Z',
  runKey: 'sync-20260825t000000',
  groupCount: 1,
  moleculeCount: 3,
  skillFile: 'l2/molecules/skill.ts',
};

const INDEX_TS_ARTIFACT: SyIndexTsArtifact = {
  schemaVersion: 1,
  savedAt: '2026-08-25T00:00:00.000Z',
  runKey: 'sync-20260825t000000',
  folder: 'groupenternumber',
  canonical: 'groupEnterNumber',
  status: 'migrated',
  indexTsFile: 'l2/molecules/groupenternumber/index.ts',
};

function baseFacts(overrides: Partial<Parameters<typeof buildSyRunReport>[0]> = {}) {
  return {
    savedAt: '2026-08-25T00:00:00.000Z',
    runKey: 'sync-20260825t000000',
    project: 102040,
    input: INPUT,
    projectArtifact: PROJECT_ARTIFACT,
    groupArtifacts: [GROUP_ARTIFACT],
    indexTsArtifacts: [INDEX_TS_ARTIFACT],
    ...overrides,
  };
}

void test('obligation 1 — what was written, per file and per group', () => {
  const report = buildSyRunReport(baseFacts());
  assert.equal(report.written.skillFile, 'l2/molecules/skill.ts');
  assert.equal(report.written.groupCount, 1);
  assert.equal(report.written.moleculeCount, 3);
  assert.equal(report.written.groups[0].indexDefsFile, 'l2/molecules/groupenternumber/index.defs.ts');
  const summary = renderSyRunSummary(report);
  assert.match(summary, /l2\/molecules\/groupenternumber\/index\.defs\.ts/);
});

void test('obligation 2 — ignored groups come with an ACTIONABLE reason, requested-but-ignored listed first', () => {
  const withRequestedIgnored = buildSyRunReport(
    baseFacts({ input: { ...INPUT, requestedButIgnoredGroups: [{ folder: 'groupnavigatemain', reason: 'pedido explicitamente, mas sem entrada em skills/index.ts' }], ignoredGroups: [] } }),
  );
  const summary = renderSyRunSummary(withRequestedIgnored);
  assert.match(summary, /groupnavigatemain: pedido explicitamente/);
});

void test('obligation 2b — a batch run (all) still names WHY each ignored group was skipped', () => {
  const report = buildSyRunReport(baseFacts());
  const summary = renderSyRunSummary(report);
  assert.match(summary, /groupnavigatemain: sem entrada em skills\/index\.ts/);
});

void test('obligation 3 — a MIGRATED group is reported as migrated', () => {
  const report = buildSyRunReport(baseFacts());
  assert.equal(report.indexTs.groups.length, 1);
  assert.equal(report.indexTs.groups[0].status, 'migrated');
  const summary = renderSyRunSummary(report);
  assert.match(summary, /groupEnterNumber: index\.ts migrado/);
});

void test('obligation 3b — a group whose s3 step left no artifact is reported as migration-failed, not silently skipped', () => {
  const report = buildSyRunReport(baseFacts({ indexTsArtifacts: [] }));
  assert.equal(report.indexTs.groups[0].status, 'migration-failed');
  assert.match(report.indexTs.groups[0].reason || '', /não deixou artefato/);
});

void test('obligation 3c — a G1 group (no index.ts) is reported as creation-needed, with the "not built" note', () => {
  const report = buildSyRunReport(
    baseFacts({ input: { ...INPUT, indexTsMigrationGroups: [], indexTsCreationGroups: ['groupEnterNumber'] }, indexTsArtifacts: [] }),
  );
  assert.equal(report.indexTs.groups[0].status, 'creation-needed');
  const summary = renderSyRunSummary(report);
  assert.match(summary, /groupEnterNumber: sem index\.ts/);
  assert.match(summary, /E8b, não implementado/);
});

void test('obligation 3d — a group that needed no trigger at all is reported as already-migrated', () => {
  const report = buildSyRunReport(baseFacts({ input: { ...INPUT, indexTsMigrationGroups: [], indexTsCreationGroups: [] } }));
  assert.equal(report.indexTs.groups[0].status, 'already-migrated');
});

void test('obligation 4 — the report ALWAYS says the catalog is not published, and names the silent consequence', () => {
  const report = buildSyRunReport(baseFacts());
  assert.equal(report.publish.published, false);
  const summary = renderSyRunSummary(report);
  assert.match(summary, /NÃO foi publicado/);
  assert.match(summary, /sem erro nenhum/);
});

void test('unknown group tokens are reported, not silently dropped', () => {
  const report = buildSyRunReport(baseFacts({ input: { ...INPUT, unknownGroups: ['groupDoesNotExist'] } }));
  const summary = renderSyRunSummary(report);
  assert.match(summary, /groupDoesNotExist/);
});

void test('a group whose s1 step left no artifact is not counted as written (missing, not silently included)', () => {
  const report = buildSyRunReport(baseFacts({ groupArtifacts: [] }));
  assert.equal(report.written.groupCount, 0);
  assert.equal(report.written.moleculeCount, 0);
});

// ⚠️ THE RUN THAT GENERATES NOTHING STILL REPORTS. A throw inside beforePromptImplicit reaches no one
// (the platform has no try/catch around that hook: uncaught rejection in the console, empty screen for
// the user — measured on a real Studio run 2026-08-26). So a refused run is still a run, and the
// summary is the only channel that reaches the human.
void test('a refused run names the reason AND the group names the project accepts', () => {
  const refused: SyRunInput = { ...INPUT, matchedGroups: [], indexTsMigrationGroups: [], unknownGroups: ['groupEnterDate'], refusal: "grupo(s) desconhecido(s): groupEnterDate" };
  const report = buildSyRunReport({ savedAt: '2026-08-26T00:00:00.000Z', runKey: 'sync-x', project: 102053, input: refused, projectArtifact: null, groupArtifacts: [], indexTsArtifacts: [] });

  assert.equal(report.refusal, 'grupo(s) desconhecido(s): groupEnterDate');
  assert.deepEqual(report.validGroups, ['groupEnterNumber']);

  const summary = renderSyRunSummary(report);
  assert.match(summary, /Nada foi gerado/);
  assert.match(summary, /groupEnterDate/);
  // the correction, not just the complaint
  assert.match(summary, /Grupos que este projeto aceita: groupEnterNumber/);
  assert.match(summary, /Nenhum arquivo foi escrito/);
});

void test('a normal run carries no refusal and still lists the valid group names', () => {
  const report = buildSyRunReport({ savedAt: '2026-08-26T00:00:00.000Z', runKey: 'sync-y', project: 102053, input: INPUT, projectArtifact: null, groupArtifacts: [], indexTsArtifacts: [] });
  assert.equal(report.refusal, null);
  assert.deepEqual(report.validGroups, ['groupEnterNumber']);
  assert.doesNotMatch(renderSyRunSummary(report), /Nada foi gerado/);
});
