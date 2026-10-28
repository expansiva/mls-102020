/// <mls fileReference="_102020_/l2/aura/studio/studioEditTarget.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import { describePageFolder, resolveSharedTarget, tagToFileInfo, type IStudioEditTarget } from '/_102020_/l2/aura/studio/studioEditTarget.js';

const MODULE_SPEC = '/_909001_/l2/onboarding/module.js';
const MODEL_URL = 'data:text/javascript,' + encodeURIComponent(
  'export async function createModel(file){ return { stub: file.shortName }; }',
);
const MODULE_URL = 'data:text/javascript,' + encodeURIComponent(
  'export const shared = { web: { sharedPath: "/_909001_/l2/onboarding/web/from-module" } };',
);

const importSpy = { modules: [] as string[], stubModel: false };

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!importSpy.stubModel) return nextResolve(specifier, context);
    if (specifier.endsWith('/module.js')) importSpy.modules.push(specifier);
    if (specifier === MODULE_SPEC) return { shortCircuit: true, url: MODULE_URL };
    const parent = context.parentURL || '';
    if (specifier === '/_102027_/l2/libModel.js' && parent.includes('studioEditTarget')) {
      return { shortCircuit: true, url: MODEL_URL };
    }
    return nextResolve(specifier, context);
  },
});

function storKey(project: number, level: number, shortName: string, folder: string, extension: string): string {
  return `${project}|${level}|${folder}|${shortName}|${extension}`;
}

function storFile(folder: string): mls.stor.IFileInfo {
  return { project: 909001, level: 2, shortName: 'welcome', folder, extension: '.ts' } as mls.stor.IFileInfo;
}

function pageTarget(): IStudioEditTarget {
  return {
    project: 909001,
    shortName: 'welcome',
    folder: 'onboarding/web/desktop/page11',
    page: '_909001_onboarding/web/desktop/page11/welcome',
    storFile: storFile('onboarding/web/desktop/page11'),
    model: { stub: 'page' } as unknown as mls.editor.IModelBase,
  };
}

async function withStor(
  files: Record<string, mls.stor.IFileInfo>,
  run: () => Promise<void>,
): Promise<void> {
  const host = globalThis as unknown as { mls: { stor: { files: Record<string, mls.stor.IFileInfo | undefined>; getKeyToFiles: typeof storKey } } };
  const previous = host.mls.stor;
  host.mls.stor = { files, getKeyToFiles: storKey };
  importSpy.stubModel = true;
  try {
    await run();
  } finally {
    importSpy.stubModel = false;
    host.mls.stor = previous;
  }
}

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

test('a structural shared file is used without importing module.js', async () => {
  const folder = 'onboarding/web/shared';
  const file = storFile(folder);
  const before = importSpy.modules.length;
  await withStor({ [storKey(909001, 2, 'welcome', folder, '.ts')]: file }, async () => {
    const found = await resolveSharedTarget(pageTarget());
    assert.equal(found?.folder, folder);
    assert.equal(found?.storFile, file);
  });
  assert.deepEqual(importSpy.modules.slice(before), []);
});

test('a missing structural file still imports module.js', async () => {
  const folder = 'onboarding/web/from-module';
  const file = storFile(folder);
  const before = importSpy.modules.length;
  await withStor({ [storKey(909001, 2, 'welcome', folder, '.ts')]: file }, async () => {
    const found = await resolveSharedTarget(pageTarget());
    assert.equal(found?.folder, folder);
    assert.equal(found?.storFile, file);
  });
  assert.deepEqual(importSpy.modules.slice(before), [MODULE_SPEC]);
});
