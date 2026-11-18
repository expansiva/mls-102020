/// <mls fileReference="_102020_/l2/aura/studio/studioMoleculeCatalog.test.ts" enhancement="_blank" />

// The pure decisions of the "Ver catálogo" drawer: which file is a group's catalog and where the
// drawer sits over the preview. Mounting the index page is checked in the Studio.

import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogFileOf, drawerRect } from '/_102020_/l2/aura/studio/studioMoleculeCatalog.js';

test('catalogFileOf: the index of the group folder', () => {
    assert.deepEqual(catalogFileOf(102040, 'molecules/groupnavigatesection'),
        { project: 102040, folder: 'molecules/groupnavigatesection', shortName: 'index' });
    assert.deepEqual(catalogFileOf(102040, '/molecules/groupviewtable/'),
        { project: 102040, folder: 'molecules/groupviewtable', shortName: 'index' });
});

test('catalogFileOf: no project or no folder, no catalog', () => {
    assert.equal(catalogFileOf(0, 'molecules/x'), null);
    assert.equal(catalogFileOf(102040, ''), null);
});

const VIEW = { width: 1600, height: 900 };

test('drawerRect: against the right edge, capped width', () => {
    assert.deepEqual(drawerRect({ left: 100, top: 50, width: 1200, height: 800 }, VIEW),
        { left: 540, top: 50, width: 760, height: 800 });
});

test('drawerRect: a narrow region keeps a sliver of the page visible', () => {
    assert.deepEqual(drawerRect({ left: 0, top: 0, width: 500, height: 400 }, VIEW),
        { left: 40, top: 0, width: 460, height: 400 });
});

test('drawerRect: a region taller than the window stops at the bottom of the window', () => {
    // A long page: the region runs 3000px past its top. The drawer must end where the window ends,
    // or its own scroll never reaches the bottom.
    assert.deepEqual(drawerRect({ left: 100, top: 60, width: 1200, height: 3000 }, VIEW),
        { left: 540, top: 60, width: 760, height: 840 });
});

test('drawerRect: a region scrolled up past the top starts at the top of the window', () => {
    assert.deepEqual(drawerRect({ left: 100, top: -500, width: 1200, height: 3000 }, VIEW),
        { left: 540, top: 0, width: 760, height: 900 });
});

test('drawerRect: a region wider than the window stops at its right edge', () => {
    assert.deepEqual(drawerRect({ left: 400, top: 0, width: 2000, height: 600 }, VIEW),
        { left: 840, top: 0, width: 760, height: 600 });
});

test('drawerRect: nothing visible gives no drawer', () => {
    assert.equal(drawerRect({ left: 0, top: 0, width: 0, height: 400 }, VIEW), null);
    assert.equal(drawerRect({ left: 0, top: 0, width: 400, height: 0 }, VIEW), null);
    assert.equal(drawerRect({ left: 0, top: 950, width: 400, height: 300 }, VIEW), null);
});
