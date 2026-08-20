/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c5-demo/gate.test.ts" enhancement="_blank"/>

// The demo copy is the only non-blocking step, so its gate exists to produce a good WARNING,
// not a stop. The header check is the interesting one: a demo that gained an mls header means
// somebody re-introduced a swap that does not belong here (0 of 153 demos have one).

import test from 'node:test';
import assert from 'node:assert/strict';
import type { CopyItem } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { renderCopiedHtml } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cTemplates.js';
import { runDemoGate } from '/_102020_/l2/aura/molecules/agentCopyMolecule/steps/c5-demo/gate.js';

const ORIGIN_HTML = `<div class="p-8">
<groupshowprogress--ml-indeterminate-spinner></groupshowprogress--ml-indeterminate-spinner>
</div>
`;

function item(overrides: Partial<CopyItem> = {}): CopyItem {
  return {
    origin: {
      ref: '_102040_/l2/molecules/groupshowprogress/ml-indeterminate-spinner',
      project: 102040,
      group: 'groupshowprogress',
      shortName: 'ml-indeterminate-spinner',
      tag: 'groupshowprogress--ml-indeterminate-spinner',
      className: 'IndeterminateSpinnerMolecule',
      chain: { isShell: false },
    },
    destination: {
      group: 'groupshowprogress',
      files: {
        ts: 'l2/molecules/groupshowprogress/ml-indeterminate-spinner.ts',
        defs: 'l2/molecules/groupshowprogress/ml-indeterminate-spinner.defs.ts',
        less: 'l2/molecules/groupshowprogress/ml-indeterminate-spinner.less',
        html: 'l2/molecules/groupshowprogress/ml-indeterminate-spinner.html',
      },
    },
    collision: null,
    rename: null,
    skip: false,
    ...overrides,
  };
}

test('a demo copiada verbatim passa limpa', () => {
  const target = item();
  assert.deepEqual(runDemoGate({ item: target, writtenHtml: renderCopiedHtml(target, ORIGIN_HTML) }), []);
});

test('demo vazia para na primeira queixa', () => {
  const issues = runDemoGate({ item: item(), writtenHtml: '' });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, 'html_empty');
});

test('demo que não menciona a tag da cópia é pega', () => {
  assert.ok(runDemoGate({ item: item(), writtenHtml: '<div>sem a molécula</div>' }).some(issue => issue.code === 'html_tag'));
});

test('renomeado: tag nova presente e a antiga ausente', () => {
  const target = item({ rename: 'ml-indeterminate-spinner-app' });
  const renamed = renderCopiedHtml(target, ORIGIN_HTML);
  assert.deepEqual(runDemoGate({ item: target, writtenHtml: renamed }), []);

  const leftover = `${renamed}\n<groupshowprogress--ml-indeterminate-spinner></groupshowprogress--ml-indeterminate-spinner>`;
  assert.ok(runDemoGate({ item: target, writtenHtml: leftover }).some(issue => issue.code === 'html_old_tag'));
});

test('demo que ganhou header mls é pega (as demos não têm header)', () => {
  const withHeader = `/// <mls fileReference="_102053_/l2/molecules/groupshowprogress/ml-indeterminate-spinner.html" enhancement="_blank"/>\n${ORIGIN_HTML}`;
  assert.ok(runDemoGate({ item: item(), writtenHtml: withHeader }).some(issue => issue.code === 'html_header'));
});
