/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/scan/agentCfeCreateScanL4.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('agentCfeCreateScanL4 declares the scan step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeCreateScanL4.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCfeCreateScanL4/);
  assert.match(src, /export function createAgent/);
  assert.match(src, /beforePromptStep/);
  assert.match(flow, /"agentName": "agentCfeCreateScanL4"/);
});
