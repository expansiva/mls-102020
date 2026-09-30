/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/moleculeCatalog.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { d2MoleculeCatalogPort } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeCatalog.js';

for (const loaderAvailable of [true, false]) {
  void test(`molecular catalog discovers only direct dependencies when loader is ${loaderAvailable ? 'present' : 'absent'}`, async () => {
    const previousMls = (globalThis as unknown as { mls?: unknown }).mls;
    const project = 102123;
    const direct = 102124;
    const transitive = 102125;
    const loaded: number[] = [];
    const catalogSource = 'export const skill = `Catalog\n### groupCards (1 molecules)\nCards for records\n`;\nexport const groups = [\n  { name: "groupCards", indexDefs: "/_102124_/l2/molecules/groupcards/index.defs", molecules: 1 },\n];';
    const key = (id: number) => `${id}/2/molecules/skill.ts`;
    const files = {
      [key(direct)]: { versionRef: '1', getContent: async () => catalogSource },
      [key(transitive)]: { versionRef: '1', getContent: async () => catalogSource },
    };
    const stor = {
      files,
      getKeyToFile: (info: { project: number; level: number; folder: string; shortName: string; extension: string }) =>
        `${info.project}/${info.level}/${info.folder}/${info.shortName}${info.extension}`,
      ...(loaderAvailable ? { loadProjectdependenciesInfoIfNeed: async (id: number) => { loaded.push(id); } } : {}),
    };
    (globalThis as unknown as { mls: unknown }).mls = {
      stor,
      l5: {
        getProjectDetails: (id: number) => {
          assert.equal(id, project);
          return { prj_dependencies: [direct] };
        },
        getProjectDependencies: () => { throw new Error('Resolved transitive dependencies must not be used'); },
      },
    };

    try {
      const found = await d2MoleculeCatalogPort.discover(project);
      assert.deepEqual(loaded, loaderAvailable ? [project] : []);
      assert.deepEqual(found.directDependencies, [direct]);
      assert.equal(found.catalogProject, direct);
      assert.equal(found.selectedBy, 'dependency');
      assert.deepEqual(found.groups.map(group => group.groupId), ['groupCards']);
    } finally {
      (globalThis as unknown as { mls?: unknown }).mls = previousMls;
    }
  });
}
