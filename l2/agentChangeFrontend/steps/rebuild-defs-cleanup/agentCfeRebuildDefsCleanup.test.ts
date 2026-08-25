/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/rebuild-defs-cleanup/agentCfeRebuildDefsCleanup.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('agentCfeRebuildDefsCleanup declares the rebuild cleanup step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeRebuildDefsCleanup.ts'), 'utf8');
  assert.match(src, /agentCfeRebuildDefsCleanup/);
  assert.match(src, /export function createAgent/);
  assert.match(src, /beforePromptStep/);
  assert.match(src, /extension !== '\.html'/);
});

void test('register and CLI materialize no longer emit page preview html', () => {
  const helpers = readFileSync(path.join(HERE, '..', '..', 'helpers', 'cfeCreateShared.ts'), 'utf8');
  const cli = readFileSync(path.join(HERE, '..', '..', 'nodejsMaterializeL2.ts'), 'utf8');
  assert.doesNotMatch(helpers, /function savePageHtml/);
  assert.match(helpers, /function deleteLeftoverPageHtml/);
  assert.doesNotMatch(cli, /function writePagePreviewHtml/);
  assert.match(cli, /function removeLeftoverPageHtml/);
});
