/// <mls fileReference="_102020_/l2/aura/studio/studioEditTarget.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { describePageFolder, tagToFileInfo } from '/_102020_/l2/aura/studio/studioEditTarget.js';

test('the folder of the mounted page says module, device and variation', () => {
  // The Info tab used to read this from `auraState`, where it is written ONLY by the Studio's own
  // knobs (serviceGenome for the layout, serviceProject for the design system) — so it showed a dash
  // until someone opened those panels. The folder is resolved for every selection and never lies.
  assert.deepEqual(describePageFolder('buildFlowFsm/web/desktop/page11'), {
    module: 'buildFlowFsm',
    device: 'web/desktop',
    layout: 1,
    designSystem: 1,
  });
  assert.deepEqual(describePageFolder('cafeFlow/web/mobile/page23'), {
    module: 'cafeFlow',
    device: 'web/mobile',
    layout: 2,
    designSystem: 3,
  });
});

test('a folder with no variation is not a failure', () => {
  // The shared base class lives in `<module>/web/shared`: it has no variation, and saying "page00"
  // would be inventing one.
  assert.deepEqual(describePageFolder('buildFlowFsm/web/shared'), {
    module: 'buildFlowFsm',
    device: 'web/shared',
    layout: null,
    designSystem: null,
  });
  assert.deepEqual(describePageFolder(''), { module: '', device: '', layout: null, designSystem: null });
  assert.deepEqual(describePageFolder('single'), { module: 'single', device: '', layout: null, designSystem: null });
});

test('the tag still resolves to a file — the other half of the identity', () => {
  assert.deepEqual(tagToFileInfo('build-flow-fsm--web--desktop--page11--change-order-catalogue-102046'), {
    project: 102046,
    shortName: 'changeOrderCatalogue',
    folder: 'buildFlowFsm/web/desktop/page11',
  });
  assert.equal(tagToFileInfo('div'), undefined, 'not a custom element');
});
