/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3MlsHeader.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { applyHeader, headerEnhancementForOutputPath, mlsHeaderForOutputPath } from './m3MlsHeader.js';

test('shared and page outputs use the aura enhancement', () => {
  const shared = '_102047_/l2/controleEstoque/web/shared/produtos.ts';
  const page = '_102047_/l2/controleEstoque/web/desktop/page11/produtos.ts';
  assert.equal(headerEnhancementForOutputPath(shared), '_102020_/l2/enhancementAura');
  assert.equal(headerEnhancementForOutputPath(page), '_102020_/l2/enhancementAura');
  assert.equal(mlsHeaderForOutputPath(page), `/// <mls fileReference="${page}" enhancement="_102020_/l2/enhancementAura"/>`);
});

test('contract outputs use the blank enhancement', () => {
  assert.equal(headerEnhancementForOutputPath('_102047_/l2/controleEstoque/web/contracts/produtos.ts'), '_blank');
});

test('applyHeader replaces an existing header and is idempotent', () => {
  const out = '_102047_/l2/controleEstoque/web/shared/produtos.ts';
  const once = applyHeader(out, '/// <mls fileReference="_x_/l2/old.ts" enhancement="_blank"/>\n\nexport const a = 1;\n');
  assert.ok(once.startsWith(mlsHeaderForOutputPath(out) + '\n\n'));
  assert.equal(once.match(/<mls\b/g)?.length, 1);
  assert.ok(once.endsWith('export const a = 1;\n'));
  assert.equal(applyHeader(out, once), once);
  assert.ok(applyHeader(out, 'export const b = 2;').startsWith(mlsHeaderForOutputPath(out)));
});
