/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cTemplates.test.ts" enhancement="_blank"/>

// The copy is a byte-level operation, so these tests are byte-level too. The one that matters
// most is 'default path: o corpo atravessa idêntico' — if it ever goes red, the agent stopped
// doing the only thing it promises.

import test from 'node:test';
import assert from 'node:assert/strict';
import type { CopyItem } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { copyClassName, copyTag, deriveClassName } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import {
  containsTag,
  extractCopiedFrom,
  isTagScopedSelector,
  extractDefsTagName,
  extractI18nBlock,
  extractLessRootSelectors,
  insertCopiedFrom,
  renderCopiedDefs,
  renderCopiedHtml,
  renderCopiedLess,
  renderCopiedTs,
  renderHeader,
  replaceTag,
  sourceIdentity,
  swapHeader,
  swapIdentity,
  targetIdentity,
} from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cTemplates.js';

const DEST = 102053;

// A base molecule, with the i18n block that is the reason the agent exists.
const ORIGIN_TS = `/// <mls fileReference="_102040_/l2/molecules/groupshowprogress/ml-indeterminate-spinner.ts" enhancement="_102020_/l2/enhancementAura"/>
// =============================================================================
// INDETERMINATE SPINNER MOLECULE
// =============================================================================
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
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
render() {
const lang = this.getMessageKey(messages);
this.msg = messages[lang];
return html\`<div class="ml-spinner"></div>\`;
}
}
`;

const ORIGIN_DEFS = `/// <mls fileReference="_102040_/l2/molecules/groupshowprogress/ml-indeterminate-spinner.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code.

export const group = 'groupShowProgress';
export const skill = \`# Metadata
  - TagName: groupshowprogress--ml-indeterminate-spinner
  - Objective: show indeterminate progress
\`;
`;

const ORIGIN_LESS = `/// <mls fileReference="_102040_/l2/molecules/groupshowprogress/ml-indeterminate-spinner.less" enhancement="_102020_/l2/enhancementStyleAura" />

groupshowprogress--ml-indeterminate-spinner {
  display: block;
  .ml-spinner { animation: spin 1s linear infinite; }
}
`;

const ORIGIN_HTML = `<div class="p-8">
<groupshowprogress--ml-indeterminate-spinner></groupshowprogress--ml-indeterminate-spinner>
</div>
`;

function baseItem(overrides: Partial<CopyItem> = {}): CopyItem {
  const item: CopyItem = {
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
  };
  return { ...item, ...overrides };
}

// A shell over a base molecule: the flattening case.
function shellItem(): CopyItem {
  return {
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
    collision: null,
    rename: null,
    skip: false,
  };
}

const PARENT_TS = ORIGIN_TS
  .split('_102040_/l2/molecules/groupshowprogress/ml-indeterminate-spinner.ts').join('_102040_/l2/molecules/grouptriggeraction/ml-button-standard.ts')
  .split('groupshowprogress--ml-indeterminate-spinner').join('grouptriggeraction--ml-button-standard')
  .split('IndeterminateSpinnerMolecule').join('ButtonStandardMolecule');

test('renderHeader: identidade do arquivo de destino (lição M2)', () => {
  assert.equal(
    renderHeader(DEST, 'groupshowprogress', 'ml-indeterminate-spinner', '.ts'),
    '/// <mls fileReference="_102053_/l2/molecules/groupshowprogress/ml-indeterminate-spinner.ts" enhancement="_102020_/l2/enhancementAura"/>',
  );
  assert.match(renderHeader(DEST, 'g', 'ml-x', '.defs.ts'), /enhancement="_blank"/);
  assert.match(renderHeader(DEST, 'g', 'ml-x', '.less'), /enhancementStyleAura/);
});

test('swapHeader: troca o header existente e prepende quando não há', () => {
  const swapped = swapHeader(ORIGIN_TS, '/// NEW');
  assert.equal(swapped.split('\n')[0], '/// NEW');
  assert.equal(swapped.split('\n')[1], ORIGIN_TS.split('\n')[1]);
  const prepended = swapHeader('<div></div>', '/// NEW');
  assert.equal(prepended.split('\n')[0], '/// NEW');
});

test('copiedFrom: entra depois do header e é legível de volta', () => {
  const withLine = insertCopiedFrom(ORIGIN_TS, '// copiedFrom: X @ 2026-08-19');
  assert.equal(withLine.split('\n')[1], '// copiedFrom: X @ 2026-08-19');
  assert.equal(extractCopiedFrom(withLine), 'X @ 2026-08-19');
  assert.equal(extractCopiedFrom(ORIGIN_TS), null);
});

test('caminho padrão: o corpo atravessa IDÊNTICO — só header + copiedFrom mudam', () => {
  const item = baseItem();
  const copied = renderCopiedTs(item, ORIGIN_TS, DEST, '2026-08-19');
  const originalLines = ORIGIN_TS.split('\n');
  const copiedLines = copied.split('\n');

  assert.match(copiedLines[0], /_102053_\/l2\/molecules\/groupshowprogress\/ml-indeterminate-spinner\.ts/);
  assert.match(copiedLines[1], /^\/\/ copiedFrom: _102040_/);
  // tudo a partir da terceira linha é byte a byte o original
  assert.deepEqual(copiedLines.slice(2), originalLines.slice(1));
  // e o bloco i18n em particular
  assert.equal(extractI18nBlock(copied), extractI18nBlock(ORIGIN_TS));
  assert.ok(extractI18nBlock(copied));
});

test('caminho padrão: identidade não é tocada (tag e classe da origem)', () => {
  const item = baseItem();
  assert.equal(copyTag(item), 'groupshowprogress--ml-indeterminate-spinner');
  assert.equal(copyClassName(item), 'IndeterminateSpinnerMolecule');
  assert.deepEqual(sourceIdentity(item), targetIdentity(item));
  assert.equal(swapIdentity(ORIGIN_TS, sourceIdentity(item), targetIdentity(item)), ORIGIN_TS);
});

test('casca achatada: corpo do pai com a identidade da CASCA', () => {
  const item = shellItem();
  const copied = renderCopiedTs(item, PARENT_TS, DEST, '2026-08-19');

  assert.match(copied, /@customElement\('grouptriggeraction--ml-button-standard-brutal'\)/);
  assert.match(copied, /export class ButtonStandardBrutal extends MoleculeAuraElement/);
  // a tag do pai NÃO pode sobrar: senão a cópia sombrearia a molécula base
  assert.ok(!copied.includes("@customElement('grouptriggeraction--ml-button-standard')"));
  assert.ok(!copied.includes('ButtonStandardMolecule'));
  // o bloco i18n do pai — o motivo do achatamento — atravessa
  assert.ok(extractI18nBlock(copied));
  // e a proveniência nomeia os dois
  const provenance = String(extractCopiedFrom(copied));
  assert.match(provenance, /ml-button-standard-brutal/);
  assert.match(provenance, /ml-button-standard @|corpo de _102040_/);
});

test('renomear: nome, tag e classe novos, derivados do shortName', () => {
  const item = baseItem({ rename: 'ml-indeterminate-spinner-app' });
  assert.equal(copyTag(item), 'groupshowprogress--ml-indeterminate-spinner-app');
  assert.equal(copyClassName(item), 'IndeterminateSpinnerAppMolecule');
  const copied = renderCopiedTs(item, ORIGIN_TS, DEST, '2026-08-19');
  assert.match(copied, /@customElement\('groupshowprogress--ml-indeterminate-spinner-app'\)/);
  assert.match(copied, /export class IndeterminateSpinnerAppMolecule/);
  assert.ok(!copied.includes("@customElement('groupshowprogress--ml-indeterminate-spinner')"));
});

test('deriveClassName: mantém o sufixo Molecule só quando a origem usa', () => {
  assert.equal(deriveClassName('ml-combobox-local', 'ComboboxMolecule'), 'ComboboxLocalMolecule');
  assert.equal(deriveClassName('ml-button-standard-brutal-2', 'ButtonStandardBrutal'), 'ButtonStandardBrutal2');
});

test('.defs.ts: TagName intacto no caminho padrão, trocado quando vem do pai', () => {
  const standard = renderCopiedDefs(baseItem(), ORIGIN_DEFS, DEST, '2026-08-19', false);
  assert.equal(extractDefsTagName(standard), 'groupshowprogress--ml-indeterminate-spinner');
  assert.match(standard.split('\n')[0], /_102053_.*\.defs\.ts/);
  assert.match(String(extractCopiedFrom(standard)), /_102040_/);

  const parentDefs = ORIGIN_DEFS.split('groupshowprogress--ml-indeterminate-spinner').join('grouptriggeraction--ml-button-standard');
  const flattened = renderCopiedDefs(shellItem(), parentDefs, DEST, '2026-08-19', true);
  assert.equal(extractDefsTagName(flattened), 'grouptriggeraction--ml-button-standard-brutal');
});

test('.defs.ts: renomear troca o TagName mesmo sem vir do pai', () => {
  const renamed = renderCopiedDefs(baseItem({ rename: 'ml-spinner-app' }), ORIGIN_DEFS, DEST, '2026-08-19', false);
  assert.equal(extractDefsTagName(renamed), 'groupshowprogress--ml-spinner-app');
});

test('.less: verbatim no padrão (seletor raiz já é a tag), re-escopado no renomear', () => {
  const standard = renderCopiedLess(baseItem(), ORIGIN_LESS, DEST);
  assert.deepEqual(extractLessRootSelectors(standard), ['groupshowprogress--ml-indeterminate-spinner']);
  assert.deepEqual(standard.split('\n').slice(1), ORIGIN_LESS.split('\n').slice(1));

  const renamed = renderCopiedLess(baseItem({ rename: 'ml-spinner-app' }), ORIGIN_LESS, DEST);
  assert.deepEqual(extractLessRootSelectors(renamed), ['groupshowprogress--ml-spinner-app']);
  assert.ok(!renamed.includes('groupshowprogress--ml-indeterminate-spinner'));
});

test('.html: byte a byte no padrão (não tem header), tag trocada no renomear', () => {
  assert.equal(renderCopiedHtml(baseItem(), ORIGIN_HTML), ORIGIN_HTML);
  const renamed = renderCopiedHtml(baseItem({ rename: 'ml-spinner-app' }), ORIGIN_HTML);
  assert.ok(renamed.includes('groupshowprogress--ml-spinner-app'));
  assert.ok(!renamed.includes('groupshowprogress--ml-indeterminate-spinner>'));
});

test('extractI18nBlock: ausência é ausência, não erro', () => {
  assert.equal(extractI18nBlock('export class X {}'), null);
});

// ---- a armadilha da tag-prefixo -------------------------------------------------
// Encontrada pelo teste do gate do c3 em 2026-08-20: a tag da casca normalmente TEM a tag do
// pai como prefixo ('…ml-button-standard' dentro de '…ml-button-standard-brutal'), então
// substituir/checar por substring quebra TODA casca de nome convencional.

test('replaceTag: não toca numa tag que só CONTÉM a procurada como prefixo', () => {
  const source = 'a: grouptriggeraction--ml-button-standard-brutal\nb: grouptriggeraction--ml-button-standard';
  const out = replaceTag(source, 'grouptriggeraction--ml-button-standard', 'grouptriggeraction--ml-button-standard-brutal');
  assert.match(out, /a: grouptriggeraction--ml-button-standard-brutal/);
  assert.match(out, /b: grouptriggeraction--ml-button-standard-brutal/);
  assert.ok(!out.includes('brutal-brutal'), 'a tag mais longa não pode ser substituída dentro dela mesma');
});

test('containsTag: prefixo não conta como presença', () => {
  const shellBody = "@customElement('grouptriggeraction--ml-button-standard-brutal')";
  assert.equal(containsTag(shellBody, 'grouptriggeraction--ml-button-standard'), false);
  assert.equal(containsTag(shellBody, 'grouptriggeraction--ml-button-standard-brutal'), true);
  assert.equal(containsTag('// grouptriggeraction--ml-button-standard fica', 'grouptriggeraction--ml-button-standard'), true);
});

test('renderCopiedHtml no achatamento: a tag da casca sobrevive intacta', () => {
  const shell = shellItem();
  const html = '<grouptriggeraction--ml-button-standard-brutal></grouptriggeraction--ml-button-standard-brutal>';
  assert.equal(renderCopiedHtml(shell, html), html);
});

// ---- molécula PORTAL: seletor raiz composto ------------------------------------
// Encontrado no Studio em 2026-08-20 (T5): uma molécula portal escopa a si mesma DUAS vezes,
// `tag,\ndiv[data-widget="tag"] { … }`. Devolver esse texto inteiro como um seletor único fez o
// gate do c4 rejeitar uma cópia perfeita do ml-datetime-picker — e teria rejeitado TODA molécula
// portal.

const PORTAL_LESS = `/// <mls fileReference="_102040_/l2/molecules/groupenterdatetime/ml-datetime-picker.less" enhancement="_102020_/l2/enhancementStyleAura"/>

groupenterdatetime--ml-datetime-picker,
div[data-widget="groupenterdatetime--ml-datetime-picker"] {
  .ml-label { color: red; }
}
`;

test('extractLessRootSelectors: separa as partes da vírgula', () => {
  assert.deepEqual(extractLessRootSelectors(PORTAL_LESS), [
    'groupenterdatetime--ml-datetime-picker',
    'div[data-widget="groupenterdatetime--ml-datetime-picker"]',
  ]);
});

test('isTagScopedSelector: a tag, a tag com pseudo/classe/descendente e a forma portal', () => {
  const tag = 'groupenterdatetime--ml-datetime-picker';
  assert.equal(isTagScopedSelector(tag, tag), true);
  assert.equal(isTagScopedSelector(`${tag}:hover`, tag), true);
  assert.equal(isTagScopedSelector(`${tag}.ml-error`, tag), true);
  assert.equal(isTagScopedSelector(`${tag} .ml-label`, tag), true);
  assert.equal(isTagScopedSelector(`div[data-widget="${tag}"]`, tag), true);
  assert.equal(isTagScopedSelector("div[data-widget='outra--tag']", tag), false);
  assert.equal(isTagScopedSelector('outra--tag', tag), false);
});
