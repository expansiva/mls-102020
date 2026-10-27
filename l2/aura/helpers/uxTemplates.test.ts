/// <mls fileReference="_102020_/l2/aura/helpers/uxTemplates.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildTemplateOptions,
    countPageTemplates,
    getPageTemplate,
    resolveEffectiveTemplate,
    setPageTemplate,
    uxBaseTemplateChoice,
    uxPageKey,
    uxTemplateCategory,
    type IUxExperienceIndex,
    type IUxLayout,
} from '/_102020_/l2/aura/helpers/uxTemplates.js';

const ROOT = '_102020_/l4/collabux/templates/';

const INDEX: IUxExperienceIndex = {
    description: 'test index',
    categories: {
        financialTransactions: [
            { experience: 'ledgerTable', file: 'financialTransactions/page21.md', label: { pt: 'Livro-razão', en: 'Ledger' }, description: { pt: 'Tabela', en: 'Table' }, bestFor: { pt: 'conferir', en: 'checking' } },
            { experience: 'dueAgenda', file: 'financialTransactions/page31.md', label: { pt: 'Agenda', en: 'Due agenda' }, description: { pt: 'Por data', en: 'By date' }, bestFor: { pt: 'pagar', en: 'paying' } },
            { experience: 'cardFeed', file: 'financialTransactions/page41.md', label: { pt: 'Cartões', en: 'Cards' }, description: { pt: 'Cartões', en: 'Cards' }, bestFor: { pt: 'celular', en: 'phone' } },
        ],
    },
};

test('writes and reads templates.pages with the key "mod/page"', () => {
    const key = uxPageKey('reembolsoDespesas', 'minhas_despesas');
    assert.equal(key, 'reembolsoDespesas/minhas_despesas');
    const layout: IUxLayout = { name: 'Ux 2' };
    setPageTemplate(layout, key, `${ROOT}financialTransactions/page31.md`);
    assert.deepEqual(layout, { name: 'Ux 2', templates: { pages: { 'reembolsoDespesas/minhas_despesas': `${ROOT}financialTransactions/page31.md` } } });
    assert.equal(getPageTemplate(layout, key), `${ROOT}financialTransactions/page31.md`);
    assert.equal(getPageTemplate(layout, 'other/minhas_despesas'), null, 'same page id in another module is another key');
    assert.equal(countPageTemplates(layout), 1);
});

test('back to default deletes the entry, and an empty templates with it', () => {
    const layout: IUxLayout = { name: 'Ux 2', useMolecules: true };
    setPageTemplate(layout, 'a/p1', `${ROOT}x/page21.md`);
    setPageTemplate(layout, 'a/p2', `${ROOT}x/page31.md`);
    setPageTemplate(layout, 'a/p1', null);
    assert.deepEqual(layout.templates, { pages: { 'a/p2': `${ROOT}x/page31.md` } }, 'the other page stays');
    setPageTemplate(layout, 'a/p2', null);
    assert.deepEqual(layout, { name: 'Ux 2', useMolecules: true }, 'no templates left behind');
    setPageTemplate(layout, 'a/p3', null);
    assert.deepEqual(layout, { name: 'Ux 2', useMolecules: true }, 'deleting an absent entry is a no-op');
    assert.equal(countPageTemplates(layout), 0);
});

test('options of a category come in the index order, the page11 one marked as default', () => {
    const page11 = `${ROOT}financialTransactions/page21.md`;
    const pt = buildTemplateOptions(INDEX, page11, 'pt');
    assert.equal(pt.category, 'financialTransactions');
    assert.equal(pt.reason, null);
    assert.deepEqual(pt.options.map(o => o.experience), ['ledgerTable', 'dueAgenda', 'cardFeed']);
    assert.deepEqual(pt.options.map(o => o.isDefault), [true, false, false]);
    assert.deepEqual(pt.options.map(o => o.template), [page11, `${ROOT}financialTransactions/page31.md`, `${ROOT}financialTransactions/page41.md`]);
    assert.equal(pt.options[1].label, 'Agenda');
    assert.equal(pt.options[1].bestFor, 'pagar');
    const en = buildTemplateOptions(INDEX, page11, 'en');
    assert.equal(en.options[1].label, 'Due agenda');
    assert.equal(en.options[1].description, 'By date');
});

test('an unknown or bespoke category, or no page11 defs, gives an empty list with the reason', () => {
    assert.deepEqual(buildTemplateOptions(INDEX, `${ROOT}nope/page21.md`, 'en'), { category: 'nope', options: [], reason: 'unknownCategory' });
    assert.deepEqual(buildTemplateOptions(INDEX, 'bespoke', 'en'), { category: 'bespoke', options: [], reason: 'bespoke' });
    assert.deepEqual(buildTemplateOptions(INDEX, null, 'en'), { category: null, options: [], reason: 'noDefs' });
    assert.deepEqual(buildTemplateOptions(null, `${ROOT}financialTransactions/page21.md`, 'en').reason, 'unknownCategory');
});

test('the category is the folder segment of the page11 template path', () => {
    assert.equal(uxTemplateCategory(`${ROOT}approvalWorkflow/page21.md`), 'approvalWorkflow');
    assert.equal(uxTemplateCategory('bespoke'), 'bespoke');
    assert.equal(uxTemplateCategory('approvalWorkflow/page21.md'), null);
    assert.equal(uxTemplateCategory(''), null);
});

test('the effective template is the entry, else the page11 one; a vanished entry is flagged', () => {
    const page11 = `${ROOT}financialTransactions/page21.md`;
    const { options } = buildTemplateOptions(INDEX, page11, 'en');
    const layout: IUxLayout = { name: 'Ux 2' };
    assert.deepEqual(resolveEffectiveTemplate(layout, 'm/p', page11, options), { template: page11, isDefault: true, missing: false });
    setPageTemplate(layout, 'm/p', `${ROOT}financialTransactions/page31.md`);
    assert.deepEqual(resolveEffectiveTemplate(layout, 'm/p', page11, options), { template: `${ROOT}financialTransactions/page31.md`, isDefault: false, missing: false });
    setPageTemplate(layout, 'm/p', `${ROOT}financialTransactions/renamed.md`);
    assert.equal(resolveEffectiveTemplate(layout, 'm/p', page11, options).missing, true);
});

test('UX 1 (base): the marked card is the page11 template; a different entry is a choice to apply, picking the page11 one removes it', () => {
    const page11 = `${ROOT}financialTransactions/page21.md`;
    const { options } = buildTemplateOptions(INDEX, page11, 'en');
    const ux1: IUxLayout = { name: 'Default' };
    // no entry: the page11 card is the marked one, nothing to apply
    assert.deepEqual(resolveEffectiveTemplate(ux1, 'm/p', page11, options), { template: page11, isDefault: true, missing: false });
    assert.equal(uxBaseTemplateChoice(ux1, 'm/p', page11), null);
    // another card picked: written in layouts["1"].templates.pages, marked, and waiting to be applied to page11
    setPageTemplate(ux1, 'm/p', options[1].template);
    assert.deepEqual(ux1, { name: 'Default', templates: { pages: { 'm/p': `${ROOT}financialTransactions/page31.md` } } });
    assert.equal(resolveEffectiveTemplate(ux1, 'm/p', page11, options).template, options[1].template);
    assert.equal(uxBaseTemplateChoice(ux1, 'm/p', page11), options[1].template);
    // once applied, page11 carries it: nothing left to apply, and the card of page11's template is the default one
    assert.equal(uxBaseTemplateChoice(ux1, 'm/p', options[1].template), null);
    assert.deepEqual(buildTemplateOptions(INDEX, options[1].template, 'en').options.map(o => o.isDefault), [false, true, false]);
    // back to the page11 card: the entry goes away
    setPageTemplate(ux1, 'm/p', null);
    assert.deepEqual(ux1, { name: 'Default' });
});
