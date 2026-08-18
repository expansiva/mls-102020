/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/ns4Fs.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { readNs4AvailableContent } from '/_102020_/l2/agentNewSolution/helpers/ns4ContentRead.js';

test('NS4 reads versionRef=0 locally and never requests the invalid remote blob', async () => {
  let remoteReads = 0;
  const file: any = {
    versionRef: '0',
    getValueInfo: async () => ({ content: { local: true } }),
    getContent: async () => { remoteReads += 1; return 'remote'; },
  };
  assert.deepEqual(await readNs4AvailableContent(file, '.json'), {
    text: '{\n  "local": true\n}\n', unavailableNewFile: false,
  });
  assert.equal(remoteReads, 0);

  file.getValueInfo = async () => ({ content: null });
  assert.deepEqual(await readNs4AvailableContent(file, '.json'), {
    text: null, unavailableNewFile: true,
  });
  assert.equal(remoteReads, 0);
});
