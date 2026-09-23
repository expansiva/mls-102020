import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const base = '/Volumes/WagnerSSD1/collab/mls-base';
const repo20 = path.join(base, 'mls-102020');
const evidence = path.dirname(fileURLToPath(import.meta.url));
const fail = message => { throw new Error(message); };
const run = (command, args, cwd) => spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, env: process.env });

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
const focused = run(path.join(base, 'node_modules/.bin/tsx'), ['--import', path.join(base, 'test/register-hooks.mjs'), '--import', path.join(base, 'test/setup-l2.ts'), '--test', '--test-reporter=spec', ...focusedFiles], repo20);
const focusedLog = `${focused.stdout || ''}${focused.stderr || ''}`;
writeFileSync(path.join(evidence, 'focused-before.log'), focusedLog);
if (focused.status !== 0) fail(`focused gates failed (${focused.status})`);

const { typeCheckProject } = await import(pathToFileURL(path.join(base, 'scripts/typeCheckRun.mjs')).href);
const typecheck = typeCheckProject({ root: base, projectId: '102020' });
writeFileSync(path.join(evidence, 'typecheck-before.json'), `${JSON.stringify({ summary: typecheck.summary, verdict: typecheck.verdict, fatal: typecheck.fatal, status: typecheck.status }, null, 2)}\n`);
if (typecheck.summary.l1.type || typecheck.summary.l2.type || typecheck.summary.other.type || typecheck.fatal) fail('typecheck is not zero');

const runner = run(process.execPath, [path.join(base, 'scripts/run-tests.mjs'), '102020', 'l2'], repo20);
const runnerLog = `${runner.stdout || ''}${runner.stderr || ''}`;
writeFileSync(path.join(evidence, 'runner-before.log'), runnerLog);
const expected = ['applyEdits.test.ts', 'syMigrateIndexTs.test.ts', 'localDocRefs.test.ts', 'previewTextEditor.test.ts'];
if (runner.status === 0 || !runnerLog.includes('194 file(s), 12 stub(s) skipped') || expected.some(name => !runnerLog.includes(name))) fail('runner no longer matches the nominal external-failure baseline');

const focusedCount = (focusedLog.match(/^✔ /gmu) || []).length;
console.log(`gates focused=${focusedCount} typecheck=0 runner=194/12-stubs external-baseline-preserved`);
