/// <mls fileReference="_102020_/l2/aura/studio/studioMoleculePreview.test.ts" enhancement="_blank" />

// The pure decisions of the on-screen molecule preview: which elements get a stand-in, what the
// stand-in copies, and where its module lives. The DOM swap itself is checked in the Studio.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
    moleculeModuleUrl,
    pickPreviewTargets,
    sharedProperties,
    standInAttributes,
    type IDeclaredProperty,
} from '/_102020_/l2/aura/studio/studioMoleculePreview.js';

test('pickPreviewTargets: one occurrence takes only that element', () => {
    assert.deepEqual(pickPreviewTargets(['a', 'b', 'c'], 1, false), ['b']);
});

test('pickPreviewTargets: "all" takes every element, whatever the occurrence', () => {
    assert.deepEqual(pickPreviewTargets(['a', 'b'], -1, true), ['a', 'b']);
});

test('pickPreviewTargets: an unknown or out-of-range occurrence previews nothing', () => {
    assert.deepEqual(pickPreviewTargets(['a', 'b'], -1, false), []);
    assert.deepEqual(pickPreviewTargets(['a', 'b'], 2, false), []);
    assert.deepEqual(pickPreviewTargets([], 0, false), []);
});

test('standInAttributes drops id, style, editor marks and the stand-in mark; keeps the rest', () => {
    const kept = standInAttributes([
        { name: 'id', value: 'x' },
        { name: 'style', value: 'display:none' },
        { name: 'data-se-selected', value: '' },
        { name: 'data-molecule-preview', value: '' },
        { name: 'value', value: 'plan' },
        { name: 'class', value: 'mt-2' },
        { name: 'data-variant', value: 'pills' },
    ]);
    assert.deepEqual(kept.map((a) => a.name), ['value', 'class', 'data-variant']);
});

test('sharedProperties: public properties both classes declare, never @state', () => {
    const from = new Map<PropertyKey, IDeclaredProperty>([
        ['value', {}],
        ['isEditing', {}],
        ['items', {}],
        ['open', { state: true }],
        [Symbol('internal'), {}],
    ]);
    const to = new Map<PropertyKey, IDeclaredProperty>([
        ['value', {}],
        ['isEditing', {}],
        ['open', {}],
        ['items', { state: true }],
    ]);
    assert.deepEqual(sharedProperties(from, to), ['value', 'isEditing']);
});

test('sharedProperties: a class without declarations shares nothing', () => {
    assert.deepEqual(sharedProperties(undefined, new Map()), []);
    assert.deepEqual(sharedProperties(new Map([['value', {}]]), undefined), []);
});

test('moleculeModuleUrl: same path the page import uses', () => {
    assert.equal(
        moleculeModuleUrl({ project: 102040, folder: 'molecules/groupnavigatesection', shortName: 'ml-tabs' }),
        '/_102040_/l2/molecules/groupnavigatesection/ml-tabs.js',
    );
    assert.equal(moleculeModuleUrl({ project: 1, folder: '/a/', shortName: 'b' }), '/_1_/l2/a/b.js');
    assert.equal(moleculeModuleUrl({ project: 1, folder: '', shortName: 'b' }), '/_1_/l2/b.js');
});
