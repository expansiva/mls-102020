/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/finalize/agentCfeCreateFinalize.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('agentCfeCreateFinalize declares the finalize step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeCreateFinalize.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCfeCreateFinalize/);
  assert.match(src, /export function createAgent/);
  assert.match(src, /beforePromptStep/);
  assert.match(flow, /"agentName": "agentCfeCreateFinalize"/);
});
