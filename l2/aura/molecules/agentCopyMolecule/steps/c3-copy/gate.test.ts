/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c3-copy/gate.test.ts" enhancement="_blank"/>

// The gate of the step that writes the molecule. Every case here is a way the copy could look
// fine and be wrong: right content under the wrong header, a translated i18n block, the
// parent's identity surviving a flatten.

import test from 'node:test';
import assert from 'node:assert/strict';
import type { CopyItem } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { renderCopiedDefs, renderCopiedTs } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cTemplates.js';
import { runCopyGate } from '/_102020_/l2/aura/molecules/agentCopyMolecule/steps/c3-copy/gate.js';

const DEST = 102053;
const DATE = '2026-08-19';

const ORIGIN_TS = `/// <mls fileReference="_102040_/l2/molecules/groupshowprogress/ml-indeterminate-spinner.ts" enhancement="_102020_/l2/enhancementAura"/>
import { MoleculeAuraElement } from '/_102033_/l2/moleculeBase.js';

/// **collab_i18n_start**
const message_en = {
loading:'Loading',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
en: message_en,
};
/// **collab_i18n_end**

@customElement('groupshowprogress--ml-indeterminate-spinner')
export class IndeterminateSpinnerMolecule extends MoleculeAuraElement {
}
`;

const ORIGIN_DEFS = `/// <mls fileReference="_102040_/l2/molecules/groupshowprogress/ml-indeterminate-spinner.defs.ts" enhancement="_blank" />
export const group = 'groupShowProgress';
export const skill = \`# Metadata
  - TagName: groupshowprogress--ml-indeterminate-spinner
\`;
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

function gateOn(target: CopyItem, ts: string, defs: string, sourceTs = ORIGIN_TS, sourceDefs = ORIGIN_DEFS) {
  return runCopyGate({ item: target, destProject: DEST, sourceTs, writtenTs: ts, sourceDefs, writtenDefs: defs });
}

test('a cópia que os renderers produzem passa limpa', () => {
  const target = item();
  const ts = renderCopiedTs(target, ORIGIN_TS, DEST, DATE);
  const defs = renderCopiedDefs(target, ORIGIN_DEFS, DEST, DATE, false);
  assert.deepEqual(gateOn(target, ts, defs), []);
});

test('.ts vazio para na primeira queixa', () => {
  const issues = gateOn(item(), '', '');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, 'ts_empty');
});

test('header com o projeto errado é pego (lição M2)', () => {
  const target = item();
  const ts = renderCopiedTs(target, ORIGIN_TS, 999999, DATE);
  const issues = gateOn(target, ts, '');
  assert.ok(issues.some(issue => issue.code === 'ts_header'));
});

test('copiedFrom ausente é pego', () => {
  const target = item();
  const ts = renderCopiedTs(target, ORIGIN_TS, DEST, DATE)
    .split('\n').filter(line => !line.startsWith('// copiedFrom:')).join('\n');
  assert.ok(gateOn(target, ts, '').some(issue => issue.code === 'copied_from'));
});

test('bloco i18n TRADUZIDO na cópia é barrado — é o motivo do agente existir', () => {
  const target = item();
  const tampered = renderCopiedTs(target, ORIGIN_TS, DEST, DATE).replace("loading:'Loading'", "loading:'Carregando'");
  const issues = gateOn(target, tampered, '');
  assert.ok(issues.some(issue => issue.code === 'i18n_changed'));
});

test('bloco i18n perdido na cópia é barrado', () => {
  const target = item();
  const ts = renderCopiedTs(target, ORIGIN_TS, DEST, DATE);
  const withoutBlock = ts.replace(/\/\/\/ \*\*collab_i18n_start\*\*[\s\S]*?\/\/\/ \*\*collab_i18n_end\*\*/, '');
  assert.ok(gateOn(target, withoutBlock, '').some(issue => issue.code === 'i18n_lost'));
});

test('molécula sem bloco i18n não gera queixa (só 138 das 154 têm)', () => {
  const target = item();
  const plain = ORIGIN_TS.replace(/\/\/\/ \*\*collab_i18n_start\*\*[\s\S]*?\/\/\/ \*\*collab_i18n_end\*\*\n\n/, '');
  const ts = renderCopiedTs(target, plain, DEST, DATE);
  const issues = gateOn(target, ts, '', plain);
  assert.ok(!issues.some(issue => issue.code.startsWith('i18n')));
});

test('tag e classe divergentes do contexto são pegas', () => {
  const target = item();
  const ts = renderCopiedTs(target, ORIGIN_TS, DEST, DATE)
    .replace("@customElement('groupshowprogress--ml-indeterminate-spinner')", "@customElement('outra--tag')")
    .replace('export class IndeterminateSpinnerMolecule', 'export class Outra');
  const codes = gateOn(target, ts, '').map(issue => issue.code);
  assert.ok(codes.includes('tag'));
  assert.ok(codes.includes('class'));
});

test('casca achatada: a cópia correta passa e a tag do pai sobrando é pega', () => {
  const shell = item({
    origin: {
      ref: '_102054_/l2/molecules/grouptriggeraction/ml-button-standard-brutal',
      project: 102054,
      group: 'grouptriggeraction',
      shortName: 'ml-button-standard-brutal',
      tag: 'grouptriggeraction--ml-button-standard-brutal',
      className: 'ButtonStandardBrutal',
      chain: {
        isShell: true,
        parentRef: '_102040_/l2/molecules/grouptriggeraction/ml-button-standard',
        parentProject: 102040,
        parentGroup: 'grouptriggeraction',
        parentShortName: 'ml-button-standard',
        parentClassName: 'ButtonStandardMolecule',
      },
    },
    destination: {
      group: 'grouptriggeraction',
      files: {
        ts: 'l2/molecules/grouptriggeraction/ml-button-standard-brutal.ts',
        defs: 'l2/molecules/grouptriggeraction/ml-button-standard-brutal.defs.ts',
        less: 'l2/molecules/grouptriggeraction/ml-button-standard-brutal.less',
        html: 'l2/molecules/grouptriggeraction/ml-button-standard-brutal.html',
      },
    },
  });
  const parentTs = ORIGIN_TS
    .split('groupshowprogress--ml-indeterminate-spinner').join('grouptriggeraction--ml-button-standard')
    .split('IndeterminateSpinnerMolecule').join('ButtonStandardMolecule')
    .split('groupshowprogress/ml-indeterminate-spinner').join('grouptriggeraction/ml-button-standard');

  const ok = renderCopiedTs(shell, parentTs, DEST, DATE);
  assert.deepEqual(gateOn(shell, ok, '', parentTs), []);

  const leftover = `${ok}\n// grouptriggeraction--ml-button-standard`;
  assert.ok(gateOn(shell, leftover, '', parentTs).some(issue => issue.code === 'parent_tag_leftover'));
});

test('casca achatada exige o pai no copiedFrom', () => {
  const shell = item({
    origin: {
      ...item().origin,
      chain: { isShell: true, parentRef: '_102040_/l2/molecules/g/ml-p', parentGroup: 'g', parentShortName: 'ml-p', parentClassName: 'P' },
    },
  });
  const ts = renderCopiedTs(item(), ORIGIN_TS, DEST, DATE);   // copiedFrom SEM o pai
  assert.ok(gateOn(shell, ts, '').some(issue => issue.code === 'copied_from_parent'));
});

test('TagName do .defs.ts tem de ser a tag da cópia', () => {
  const target = item();
  const ts = renderCopiedTs(target, ORIGIN_TS, DEST, DATE);
  const defs = renderCopiedDefs(target, ORIGIN_DEFS, DEST, DATE, false).replace('groupshowprogress--ml-indeterminate-spinner', 'outra--tag');
  assert.ok(gateOn(target, ts, defs).some(issue => issue.code === 'defs_tag'));
});

test('renomeado: a cópia com a identidade nova passa limpa', () => {
  const target = item({ rename: 'ml-indeterminate-spinner-app' });
  const ts = renderCopiedTs(target, ORIGIN_TS, DEST, DATE);
  const defs = renderCopiedDefs(target, ORIGIN_DEFS, DEST, DATE, false);
  assert.deepEqual(gateOn(target, ts, defs), []);
});
