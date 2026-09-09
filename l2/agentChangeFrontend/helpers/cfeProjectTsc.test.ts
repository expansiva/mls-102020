/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeProjectTsc.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  flattenTscErrorsAsRefs, formatCompileModuleTrace, groupTscErrorsByFile, mergeCompileTargets,
  mlsBaseFromDiskPath, parseTscDiagnostics, traceProjectTscResult, tscGateOf,
} from './cfeProjectTsc.js';

// Literal tsc lines from the 07/09 measurement: the page31 TS2367 the CF gate missed, and the
// out-of-module baseline in l5. Inline on purpose — a generated app is not a test fixture.
const TS2367_PAGE31 = "mls-102047/l2/controleEstoque4/web/desktop/page31/stockMovementCatalogue.ts(42,729): error TS2367: This comparison appears to be unintentional because the types '\"idle\" | \"success\" | \"error\"' and '\"loading\"' have no overlap.";
const L5_RUNTIME = 'mls-102051/l5/runtimeConfig.ts(1,1): error TS2322: Type \'"x"\' is not assignable to type \'RuntimeConfig\'.';

const TSC_SNIPPET = [TS2367_PAGE31, L5_RUNTIME].join('\n');

void test('parseTscDiagnostics keeps the page31 TS2367 and the l5 baseline line', () => {
  const parsed = parseTscDiagnostics(TSC_SNIPPET);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].project, 102047);
  assert.equal(parsed[0].level, 2);
  assert.equal(parsed[0].folder, 'controleEstoque4/web/desktop/page31');
  assert.equal(parsed[0].shortName, 'stockMovementCatalogue');
  assert.equal(parsed[0].code, 'TS2367');
  assert.match(parsed[0].message, /no overlap/);
  assert.equal(parsed[1].project, 102051);
  assert.equal(parsed[1].level, 5);
  assert.equal(parsed[1].shortName, 'runtimeConfig');
});

void test('parseTscDiagnostics accepts an absolute path and strips ANSI', () => {
  const line = "\u001b[96m/Volumes/x/mls-base/mls-102047/l2/controleEstoque4/web/desktop/page31/stockMovementCatalogue.ts\u001b[0m(42,729): error TS2367: This comparison appears to be unintentional.";
  const parsed = parseTscDiagnostics(line);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].shortName, 'stockMovementCatalogue');
  assert.equal(parsed[0].code, 'TS2367');
});

void test('in-module filter keeps 1 and counts 2 in rawDiagnostics', () => {
  const { grouped, trace } = traceProjectTscResult(TSC_SNIPPET, 'controleEstoque4', 102047, 25, 'no-child-process');
  assert.equal(trace.path, 'project-tsc');
  assert.equal(trace.rawDiagnostics, 2);
  assert.equal(trace.afterFilter, 1);
  assert.equal(trace.files, 25);
  assert.equal(grouped?.get('controleEstoque4/web/desktop/page31::stockMovementCatalogue')?.length, 1);
  assert.equal([...grouped!.keys()].some(key => key.includes('runtimeConfig')), false);
  const flat = flattenTscErrorsAsRefs(102047, grouped!);
  assert.equal(flat.length, 1);
  assert.match(flat[0], /^_102047_\/l2\/controleEstoque4\/web\/desktop\/page31\/stockMovementCatalogue\.ts: TS2367:/);
  assert.match(formatCompileModuleTrace(trace), /\[cf-compile\] path=project-tsc files=25 raw=2 afterFilter=1/);
});

void test('groupTscErrorsByFile drops another module of the same project', () => {
  const extra = "mls-102047/l2/otherModule/web/shared/x.ts(1,1): error TS2304: Cannot find name 'y'.";
  const grouped = groupTscErrorsByFile(parseTscDiagnostics([TS2367_PAGE31, extra].join('\n')), 'controleEstoque4', 102047);
  assert.equal(grouped.size, 1);
  assert.equal(grouped.has('otherModule/web/shared::x'), false);
});

void test('mlsBaseFromDiskPath walks up to the mls-NNNN parent', () => {
  assert.equal(mlsBaseFromDiskPath('/Volumes/x/collab/mls-base/mls-102047/l2/mod/a.ts'), '/Volumes/x/collab/mls-base');
  assert.equal(mlsBaseFromDiskPath('/Volumes/x/collab/mls-base/mls-102047/'), '/Volumes/x/collab/mls-base');
  assert.equal(mlsBaseFromDiskPath('/tmp/not-an-mls-tree/a.ts'), null);
});

void test('project tsc trace is unavailable with no-child-process when the compiler produced no output', () => {
  const { grouped, trace } = traceProjectTscResult(null, 'mod', 102047, 3, 'no-child-process');
  assert.equal(grouped, null);
  assert.equal(trace.path, 'unavailable');
  assert.equal(trace.reason, 'no-child-process');
  assert.equal(trace.rawDiagnostics, 0);
  assert.equal(trace.afterFilter, 0);
  assert.match(formatCompileModuleTrace(trace), /path=unavailable reason=no-child-process/);
});

void test('tscGateOf is ran only for project-tsc, unavailable otherwise omitted on monaco', () => {
  assert.equal(tscGateOf('project-tsc'), 'ran');
  assert.equal(tscGateOf('unavailable'), 'unavailable');
  assert.equal(tscGateOf('monaco'), undefined);
});

void test('mergeCompileTargets appends extra files the project tsc flagged', () => {
  const inScope = [{ folder: 'mod/web/shared', shortName: 'catalog', real: 'catalog' }];
  const compiled = new Map([
    ['mod/web/shared::catalog', ['TS2322: x']],
    ['mod/web/desktop/page31::stockMovementCatalogue', ['TS2367: overlap']],
  ]);
  const merged = mergeCompileTargets(inScope, compiled);
  assert.equal(merged.length, 2);
  assert.equal(merged[1].real, 'stockMovementCatalogue');
  assert.equal(merged[1].folder, 'mod/web/desktop/page31');
});

void test('touched sources stay English in comments and identifiers', () => {
  const files = [
    './cfeProjectTsc.ts',
    './cfeCompileFidelity.ts',
    './cfeMaterializeStudio.ts',
    './cfePipelineTrace.ts',
    '../steps/finalize/agentCfeCreateFinalize.ts',
    '../steps/materialize/agentCfeMaterializePhase.ts',
  ];
  for (const rel of files) {
    const source = readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
    const comments = [...source.matchAll(/\/\/.*$|\/\*[\s\S]*?\*\//gm)].map(item => item[0]).join('\n');
    assert.doesNotMatch(comments, /[À-ÿ]/, rel);
    assert.doesNotMatch(source, /portuguese\s*\?/, rel);
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/`(?:\\.|[^`])*`/g, '')
      .replace(/'(?:\\.|[^'\\])*'/g, '')
      .replace(/"(?:\\.|[^"\\])*"/g, '');
    assert.doesNotMatch(stripped, /[À-ÿ]/, rel);
  }
});
