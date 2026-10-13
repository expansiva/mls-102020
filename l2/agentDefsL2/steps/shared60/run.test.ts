/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared60/run.test.ts" enhancement="_blank"/>

/**
 * d2_75: shared60 is code only (its derivation is replayed in helpers/e2eReplay.test.ts). Here the stage mechanics of the
 * one LLM stage left, bff55: one worker per page, a refused page does not stop its siblings (d2_64), a refusal is never
 * a receipt.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { d2PagesRefusedMessage, settleD2Pages, type D2PageRefusal } from '/_102020_/l2/agentDefsL2/helpers/d2PageSettle.js';
import { bffWorkerSteps } from '/_102020_/l2/agentDefsL2/steps/bff55/agentD2Bff.js';
import { reusableD2Bff } from '/_102020_/l2/agentDefsL2/steps/bff55/agentD2BffPage.js';
import { D2_BFF_REFUSAL_VERSION } from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';
import { approveD2SharedPage, D2_SHARED_VERSION, type D2SharedPage, type D2SharedReceipt } from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';

const identity = { project: 102047, module: 'mod' };
const refusal = (schemaVersion: string, pageId: string, taskId: string, diagnostic: string): D2PageRefusal => ({ schemaVersion, ...identity, pageId, taskId, diagnostic });

void test('d2_64: a refused page does not stop its siblings; the stage fails once, then only it is redone', async () => {
  const pages = ['pageA', 'pageB', 'pageC'];
  const accepted = new Set<string>();
  const refusals = new Map<string, D2PageRefusal>();
  const port = { pageIds: async () => pages, reusable: async (pageId: string) => accepted.has(pageId), refusal: async (pageId: string) => refusals.get(pageId) ?? null };

  // Task one: B is refused while A and C are still in flight; the stage waits for them.
  refusals.set('pageB', refusal(D2_BFF_REFUSAL_VERSION, 'pageB', 'task1', 'D2_BFF_REPAIR_LIMIT: D2_SHARED_V2_ORGANISM_UNFED: unfed'));
  assert.deepEqual(await settleD2Pages('task1', port, 'MISSING'), { state: 'pending', pending: ['pageA', 'pageC'] });
  accepted.add('pageA');
  accepted.add('pageC');
  const once = await settleD2Pages('task1', port, 'MISSING');
  assert.equal(once.state, 'refused');
  const message = d2PagesRefusedMessage('D2_BFF_PAGES_REFUSED', once.state === 'refused' ? once.refusals : []);
  assert.match(message, /^D2_BFF_PAGES_REFUSED: pageB: D2_BFF_REPAIR_LIMIT: D2_SHARED_V2_ORGANISM_UNFED/u);
  assert.equal(/pageA|pageC/u.test(message), false);

  // A refusal is never a receipt.
  assert.equal(await reusableD2Bff(identity, 'pageB', { readReceipt: async () => refusal(D2_BFF_REFUSAL_VERSION, 'pageB', 'task1', 'x') as never, context: async () => { throw new Error('not reached'); }, readDesign: async () => null }), false);

  // Task two: only B is dispatched (0 LLM for A and C); its old refusal does not end the stage early.
  const pending = pages.filter(pageId => !accepted.has(pageId));
  assert.deepEqual(bffWorkerSteps(identity, pending).map(step => [step.agentName, JSON.parse(step.prompt as string)]), [['agentD2BffPage', { ...identity, pageId: 'pageB', attempt: 1 }]]);
  assert.deepEqual(await settleD2Pages('task2', port, 'MISSING'), { state: 'pending', pending: ['pageB'] });
  accepted.add('pageB');
  assert.deepEqual(await settleD2Pages('task2', port, 'MISSING'), { state: 'ready', pageIds: pages });

  // Two refusals with different codes: one message cites both.
  accepted.clear();
  accepted.add('pageA');
  refusals.set('pageB', refusal(D2_BFF_REFUSAL_VERSION, 'pageB', 'task3', 'D2_BFF_REPAIR_LIMIT: D2_BFF_COVERAGE: field'));
  refusals.set('pageC', refusal(D2_BFF_REFUSAL_VERSION, 'pageC', 'task3', 'D2_BFF_PROMPT_LIMIT: 700000'));
  const both = await settleD2Pages('task3', port, 'MISSING');
  assert.equal(both.state, 'refused');
  const bothMessage = d2PagesRefusedMessage('D2_BFF_PAGES_REFUSED', both.state === 'refused' ? both.refusals : []);
  assert.match(bothMessage, /pageB: D2_BFF_REPAIR_LIMIT: D2_BFF_COVERAGE/u);
  assert.match(bothMessage, /pageC: D2_BFF_PROMPT_LIMIT/u);
  await assert.rejects(() => settleD2Pages('task4', { ...port, pageIds: async () => null }, 'D2_BFF_INPUT_MISSING'), /D2_BFF_INPUT_MISSING/u);
});

void test('d2_94: shared na forma antiga com recibo antigo é regravado, sem forms, functions nem fields', async () => {
  assert.match(D2_SHARED_VERSION, /2026-10-13/u);
  const blank = { template: { category: 'list', experience: 'consultar' }, intent: 'consultar', sections: [], organisms: {}, molecules: {} };
  const draft = { organisms: {} };
  const page: D2SharedPage = {
    identity, inputHash: 'hash',
    page11Text: { desktop: '', mobile: '' },
    draftText: { desktop: '{}', mobile: '{}' },
    derive: {
      pageId: 'produtos', page11: { desktop: blank, mobile: blank }, drafts: { desktop: draft, mobile: draft },
      need: { pageId: 'produtos', actors: [], reads: [], writes: [] },
      menu: { tree: [], authorities: {} },
      design: { types: [], endpoints: [], bindings: { organisms: [], commands: [], selections: [], journeys: [], updates: [] } },
      access: { actors: [], grants: [] }, entities: {}, siblings: [],
    },
  };
  const oldSource = '/// <mls fileReference="_102047_/l2/mod/web/shared/produtos.defs.ts" enhancement="_blank"/>\n\nexport const definition = { "forms": {}, "functions": {}, "fields": {} } as const;\n';
  const oldReceipt = { schemaVersion: '2026-10-08-agent-defs-l2-shared-v5', ...identity, pageId: 'produtos', inputHash: 'old', page11Hashes: { desktop: 'a', mobile: 'b' }, draftHashes: { desktop: 'c', mobile: 'd' }, designHash: 'e', siblingsHash: 'f', sourceHash: 'g' } as unknown as D2SharedReceipt;
  let written = '';
  const result = await approveD2SharedPage(page, { source: oldSource, receipt: oldReceipt }, { writeSource: async (_info, source) => { written = source; }, writeJson: async () => undefined });
  assert.equal(result.wrote, true);
  assert.equal(result.receipt.schemaVersion, D2_SHARED_VERSION);
  assert.equal(/"forms"|"functions"|"fields"/u.test(written), false);
});
