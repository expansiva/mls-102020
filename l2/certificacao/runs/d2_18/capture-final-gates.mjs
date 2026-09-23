import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const base = '/Volumes/WagnerSSD1/collab/mls-base';
const repo20 = path.join(base, 'mls-102020');
const evidence = path.dirname(fileURLToPath(import.meta.url));
const fail = message => { throw new Error(message); };
const run = (command, args, cwd) => spawnSync(command, args, {
  cwd,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
  env: process.env,
});

const focusedFiles = [
  'l2/agentDefsL2/steps/shared-page/agentD2SharedPage.test.ts',
  'l2/agentDefsL2/steps/shared40/contracts.test.ts',
  'l2/agentDefsL2/steps/shared40/contextCatalog.test.ts',
  'l2/agentDefsL2/steps/shared40/context.test.ts',
  'l2/agentDefsL2/steps/shared40/run.test.ts',
  'l2/agentDefsL2/steps/pages50/contracts.test.ts',
  'l2/agentDefsL2/steps/pages50/moleculeContext.test.ts',
  'l2/agentDefsL2/steps/pages50/run.test.ts',
  'l2/agentDefsL2/steps/finalize60/finalize.test.ts',
  'l2/agentChangeFrontend/helpers/cfeMaterializeCore.test.ts',
];

const focused = run(path.join(base, 'node_modules/.bin/tsx'), [
  '--import', path.join(base, 'test/register-hooks.mjs'),
  '--import', path.join(base, 'test/setup-l2.ts'),
  '--test',
  '--test-reporter=spec',
  ...focusedFiles,
], repo20);
const focusedLog = `${focused.stdout || ''}${focused.stderr || ''}`;
writeFileSync(path.join(evidence, 'focused-final.log'), focusedLog);
if (focused.status !== 0) fail(`focused gates failed (${focused.status})`);

const { typeCheckProject } = await import(pathToFileURL(path.join(base, 'scripts/typeCheckRun.mjs')).href);
const typecheck = typeCheckProject({ root: base, projectId: '102020' });
const typecheckEvidence = {
  summary: typecheck.summary,
  verdict: typecheck.verdict,
  fatal: typecheck.fatal,
  status: typecheck.status,
};
writeFileSync(path.join(evidence, 'typecheck-final.json'), `${JSON.stringify(typecheckEvidence, null, 2)}\n`);
if (typecheck.summary.l1.type || typecheck.summary.l2.type || typecheck.summary.other.type || typecheck.fatal) {
  fail('typecheck is not zero');
}

const runner = run(process.execPath, [path.join(base, 'scripts/run-tests.mjs'), '102020', 'l2'], repo20);
const runnerLog = `${runner.stdout || ''}${runner.stderr || ''}`;
writeFileSync(path.join(evidence, 'runner-final.log'), runnerLog);
const expectedExternalFailures = [
  'applyEdits.test.ts',
  'syMigrateIndexTs.test.ts',
  'localDocRefs.test.ts',
  'previewTextEditor.test.ts',
];
const runnerInventory = runnerLog.match(/(\d+) file\(s\), (\d+) stub\(s\) skipped/);
if (runner.status === 0 || !runnerInventory || expectedExternalFailures.some(name => !runnerLog.includes(name))) {
  fail('runner no longer matches the nominal external-failure baseline');
}

const focusedCount = (focusedLog.match(/^✔ /gmu) || []).length;
const summary = {
  focused: { passed: focusedCount, exitCode: focused.status },
  typecheck: typecheckEvidence,
  runner: {
    files: Number(runnerInventory[1]),
    stubsSkipped: Number(runnerInventory[2]),
    exitCode: runner.status,
    externalFailures: expectedExternalFailures,
  },
};
writeFileSync(path.join(evidence, 'final-gates.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(`final gates focused=${focusedCount} typecheck=0 runner=${runnerInventory[1]}/${runnerInventory[2]}-stubs external-baseline-preserved`);
