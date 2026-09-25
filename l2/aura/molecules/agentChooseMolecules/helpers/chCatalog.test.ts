/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chCatalog.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { discoverChCatalog } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chCatalog.js';

void test('discovery falls back to resolved dependencies when getProjectDetails is unavailable', async () => {
  const previousMls = (globalThis as unknown as { mls?: unknown }).mls;
  const catalogKey = '102040/2/molecules/skill.ts';
  (globalThis as unknown as { mls: unknown }).mls = {
    actualProject: 102047,
    l5: {
      getProjectDependencies: (project: number, forceUpdate: boolean) => {
        assert.equal(project, 102047);
        assert.equal(forceUpdate, false);
        return [102040];
      },
    },
    stor: {
      files: { [catalogKey]: { status: 'loaded' } },
      getKeyToFile: (file: { project: number; level: number; folder: string; shortName: string; extension: string }) =>
        `${file.project}/${file.level}/${file.folder}/${file.shortName}${file.extension}`,
      loadProjectdependenciesInfoIfNeed: async () => undefined,
    },
  };

  try {
    const discovery = await discoverChCatalog(null);
    assert.deepEqual(discovery.directDeps, [102040]);
    assert.deepEqual(discovery.resolvedDeps, [102040]);
    assert.deepEqual(discovery.candidates, [102040]);
    assert.equal(discovery.project, 102040);
    assert.equal(discovery.selectedBy, 'dependency');
  } finally {
    (globalThis as unknown as { mls?: unknown }).mls = previousMls;
  }
});
