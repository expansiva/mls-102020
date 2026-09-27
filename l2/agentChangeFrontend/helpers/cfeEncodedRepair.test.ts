/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeEncodedRepair.test.ts" enhancement="_blank"/>
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeGeneratedCode, type PipelineItem } from './cfeMaterializeCore.js';

test('renamed page repairs multiple inserted padding runs from fresh shared reference only', () => {
  const suffix = (value: string) => [...value].map(char => char.codePointAt(0)!.toString(16).padStart(6, '0')).join('');
  const input = `stateSearchStatusX${suffix('state:ui.ledger.search.input.status')}`;
  const action = `stateSearchStatusX${suffix('state:ui.ledger.search.status')}`;
  const brokenInput = input.replace('00006e', '0000006e').replace('000043', '00000043');
  const brokenAction = action.replaceAll('000073', '00000073');
  const item: PipelineItem = { id: 'ledger__desktop__page11', type: 'l2_page', outputPath: '_109876_/l2/visitStudio/web/desktop/page11/ledger.ts' };
  const code = `const filter = this.${brokenInput}; const status = this.${brokenAction}; ordinaryTypo();`;
  const repaired = normalizeGeneratedCode(item, 'prose', code, 'skeleton without states', `class Shared { ${input}: unknown; ${action}: unknown; }`);
  assert.ok(repaired.includes(`this.${input}`)); assert.ok(repaired.includes(`this.${action}`)); assert.ok(repaired.includes('ordinaryTypo()'));
  const pluralized = action.replace(suffix('ledger.search'), suffix('ledgers.search')).replace('000073', '00000073');
  assert.ok(normalizeGeneratedCode(item, 'prose', `this.${pluralized}`, undefined, action).includes(`this.${action}`));
  const changed = brokenAction.replace(/73$/u, '74');
  assert.ok(normalizeGeneratedCode(item, 'prose', `this.${changed}`, undefined, action).includes(changed));
  const ambiguous = `${action} ${action.replace('000073', '00000073')}`;
  const otherPadding = action.replaceAll('000073', '0000000073');
  assert.ok(normalizeGeneratedCode(item, 'prose', `this.${otherPadding}`, undefined, ambiguous).includes(otherPadding));
  const worker = readFileSync(new URL('../steps/materialize/agentCfeMaterializeGen.ts', import.meta.url), 'utf8');
  assert.match(worker, /currentSharedReference = pipelineItem\.type === 'l2_page' \? await pageSharedPublicReference\(pipelineItem\)/);
  assert.match(worker, /currentSharedReference\?\.code \?\? mechanical\?\.sharedTemplate/);
});
