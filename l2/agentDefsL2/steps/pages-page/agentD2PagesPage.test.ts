/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages-page/agentD2PagesPage.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import test from 'node:test';
import { pagesRepairArgs } from '/_102020_/l2/agentDefsL2/steps/pages-page/agentD2PagesPage.js';

void test('TypeScript diagnostic enters the one page repair and attempt 2 is terminal', () => {
  const args = { project: 817263, module: 'renamed', pageId: 'items', attempt: 1, moleculeContextHash: `sha256:${'a'.repeat(64)}` };
  const diagnostic = 'D2_TYPESCRIPT_COMPILE_FAILED: l2/renamed/web/mobile/page11/items.defs.ts: TS2304 MissingType';
  const repair = pagesRepairArgs(args, diagnostic, { previous: true });
  assert.equal(repair?.feedback, diagnostic);
  assert.equal(repair?.attempt, 2);
  assert.equal(pagesRepairArgs({ ...args, attempt: 2 }, diagnostic, {}), null);
});
