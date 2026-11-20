/// <mls fileReference="_102020_/l2/helpers/defsInput/ioFileInfo.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { fileInfoFromRef } from '/_102020_/l2/helpers/defsInput/io.js';

void test('fileInfoFromRef keeps .defs.ts as the extension', () => {
  assert.deepEqual(
    fileInfoFromRef('/_102034_/l1/server/layer_1_external/connections/catalogs/cm.ts'),
    { project: 102034, level: 1, folder: 'server/layer_1_external/connections/catalogs', shortName: 'cm', extension: '.ts' },
  );
  assert.deepEqual(
    fileInfoFromRef('_102047_/l4/repoHost/integration.defs.ts'),
    { project: 102047, level: 4, folder: 'repoHost', shortName: 'integration', extension: '.defs.ts' },
  );
  assert.deepEqual(
    fileInfoFromRef('_102047_/l4/organization/registry.defs.ts'),
    { project: 102047, level: 4, folder: 'organization', shortName: 'registry', extension: '.defs.ts' },
  );
  assert.deepEqual(
    fileInfoFromRef('_102047_/l1/repoHost/layer_1_external/connections/github.ts'),
    { project: 102047, level: 1, folder: 'repoHost/layer_1_external/connections', shortName: 'github', extension: '.ts' },
  );
});
