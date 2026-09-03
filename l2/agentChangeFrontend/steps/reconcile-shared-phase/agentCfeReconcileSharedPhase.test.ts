/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/reconcile-shared-phase/agentCfeReconcileSharedPhase.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('agentCfeReconcileSharedPhase declares the reconcile phase step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeReconcileSharedPhase.ts'), 'utf8');
  assert.match(src, /agentCfeReconcileSharedPhase/);
  assert.match(src, /export function createAgent/);
  assert.match(src, /beforePromptStep/);
});
