/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeStylesheetImports.test.ts" enhancement="_blank"/>
import test from 'node:test';
import assert from 'node:assert/strict';
import { collectMissingLocalStylesheetIssues } from './cfeMaterializeCore.js';
import { readFileSync } from 'node:fs';

test('renamed stylesheet gate rejects missing desktop and mobile imports, preserves existing styles', async () => {
  for (const device of ['desktop', 'mobile']) {
    const output = `_109876_/l2/visitStudio/web/${device}/page11/clientBook.ts`;
    const code = `import './clientBook.less';\nimport '../common.css';\nimport theme from '/_109876_/l2/visitStudio/web/theme.scss';\nimport { html } from 'lit';`;
    const reads: string[] = [];
    const issues = await collectMissingLocalStylesheetIssues(code, output, async ref => {
      reads.push(ref); return ref.endsWith('clientBook.less') ? null : '';
    });
    assert.equal(issues.length, 1);
    assert.match(issues[0], /clientBook\.less/);
    assert.deepEqual(reads, [output.replace('.ts', '.less'), `_109876_/l2/visitStudio/web/${device}/common.css`, '_109876_/l2/visitStudio/web/theme.scss']);
    assert.equal(code.includes("import '../common.css'"), true);
  }
});

test('renamed stylesheet gate rejects escaping refs and is wired into verification', async () => {
  assert.equal((await collectMissingLocalStylesheetIssues("import '../../../../../../missing.less';", '_109876_/l2/demo/web/desktop/page11/ledger.ts', async () => '')).length, 1);
  assert.deepEqual(await collectMissingLocalStylesheetIssues("// import './missing.less';\nimport 'package/theme.css';", '_109876_/l2/demo.ts', async () => null), []);
  const phase = readFileSync(new URL('../steps/materialize/agentCfeMaterializePhase.ts', import.meta.url), 'utf8');
  assert.match(phase, /repairable\.push\(\.\.\.await collectMissingLocalStylesheetIssues\(content, outputPath, getContentByMlsPath\)\)/);
});
