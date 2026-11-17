/// <mls fileReference="_102020_/l2/helpers/defsInput/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseNs4ClassicDefsSource } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import { buildD2InputSnapshot } from '/_102020_/l2/helpers/defsInput/gate.js';
import type { D2InputArtifacts } from '/_102020_/l2/helpers/defsInput/contracts.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXPENSE = path.join(HERE, '../../agentPlannerL2/steps/needs30/fixtures/p2_32/expense');

function artifactsOf(root: string): D2InputArtifacts {
  const defs = (rel: string): unknown => parseNs4ClassicDefsSource<unknown>(readFileSync(path.join(root, rel), 'utf8'));
  const json = (rel: string): unknown => JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
  const names = (sub: string) => readdirSync(path.join(root, sub)).filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts').sort();
  return {
    sources: [], module: defs('module.defs.ts'), journeyIndex: defs('journeys/index.defs.ts'),
    journeys: Object.fromEntries(names('journeys').map(name => [name.replace(/\.defs\.ts$/u, ''), defs(`journeys/${name}`)])),
    ontologyIndex: defs('ontology/index.defs.ts'),
    entities: Object.fromEntries(names('ontology').map(name => [name.replace(/\.defs\.ts$/u, ''), defs(`ontology/${name}`)])),
    rules: defs('rules.defs.ts'), workflows: defs('workflows.defs.ts'), access: defs('access.defs.ts'), integration: defs('integration.defs.ts'),
    menu: json('pool/menu.json'), needs: json('pool/needs.json'), backend: json('pool/backend.json'), effort: json('pool/effort.json'),
  };
}

async function problems(artifacts: D2InputArtifacts): Promise<Array<{ code: string; file: string }>> {
  const module = (artifacts.module as { moduleName: string }).moduleName;
  try {
    await buildD2InputSnapshot({ project: 102047, module }, artifacts);
    return [];
  } catch (error) {
    const found = (error as { problems?: Array<{ code: string; file: string }> }).problems;
    if (!found) { assert.match(String(error), /source digest missing/u); return []; }
    return found.map(item => ({ code: item.code, file: item.file }));
  }
}

void test('recorded integration v2 without connections is read; an unknown version is refused', async () => {
  const recorded = artifactsOf(EXPENSE);
  delete (recorded.integration as { connections?: unknown }).connections;
  const accepted = await problems(recorded);
  assert.equal(accepted.some(item => item.code === 'UNSUPPORTED_VERSION'), false, JSON.stringify(accepted));

  const current = artifactsOf(EXPENSE);
  (current.integration as { schemaVersion: string }).schemaVersion = '2026-11-17-ns5-integration-v3';
  delete (current.integration as { connections?: unknown }).connections;
  const currentProblems = await problems(current);
  assert.equal(currentProblems.some(item => item.code === 'UNSUPPORTED_VERSION'), false, JSON.stringify(currentProblems));

  const unknown = artifactsOf(EXPENSE);
  (unknown.integration as { schemaVersion: string }).schemaVersion = '1999-01-01-ns5-integration-v0';
  const refused = await problems(unknown);
  assert.deepEqual(
    refused.filter(item => item.code === 'UNSUPPORTED_VERSION').map(item => item.file),
    ['l4/integration.defs.ts'],
  );
});
