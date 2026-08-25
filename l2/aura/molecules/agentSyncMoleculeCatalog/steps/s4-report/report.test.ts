/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s4-report/report.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSyRunReport, renderSyRunSummary } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s4-report/report.js';
import { SyGroupArtifact, SyProjectArtifact, SyRunInput } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTypes.js';

const INPUT: SyRunInput = {
  schemaVersion: 1,
  savedAt: '2026-08-25T00:00:00.000Z',
  runKey: 'sync-20260825t000000',
  mentionRaw: '',
  wantsAll: true,
  includeIndexTsRequested: false,
  matchedGroups: ['groupEnterNumber'],
  ignoredGroups: [{ folder: 'groupnavigatemain', reason: 'sem entrada em skills/index.ts' }],
  requestedButIgnoredGroups: [],
  unknownGroups: [],
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

function baseFacts(overrides: Partial<Parameters<typeof buildSyRunReport>[0]> = {}) {
  return {
    savedAt: '2026-08-25T00:00:00.000Z',
    runKey: 'sync-20260825t000000',
    project: 102040,
    input: INPUT,
    projectArtifact: PROJECT_ARTIFACT,
    groupArtifacts: [GROUP_ARTIFACT],
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

void test('obligation 3 — index.ts not touched, and the summary always says how to ask for it', () => {
  const report = buildSyRunReport(baseFacts());
  assert.equal(report.indexTs.touched, false);
  const summary = renderSyRunSummary(report);
  assert.match(summary, /index\.ts: não tocado/);
  assert.match(summary, /incluindo o arquivo index\.ts/);
});

void test('obligation 3b — when index.ts WAS requested, the summary says so honestly (s3 does not exist yet)', () => {
  const report = buildSyRunReport(baseFacts({ input: { ...INPUT, includeIndexTsRequested: true } }));
  const summary = renderSyRunSummary(report);
  assert.match(summary, /pedido na menção, mas esta versão do agente ainda não o gera/);
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
