/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentChangeFrontend.test.ts" enhancement="_blank"/>
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

test('CLI accepts variants:all as a flag and forwards uxVariants to the scan step', () => {
  const src = readFileSync(path.join(HERE, 'agentChangeFrontend.ts'), 'utf8');
  assert.match(src, /export function parseCliCommand/);
  assert.match(src, /parseUxVariantsMode\(rawTokens\)/);
  assert.match(src, /isUxVariantsToken/);
  assert.match(src, /uxVariants: command\.uxVariants/);
  assert.match(src, /variants:all/);
  assert.doesNotMatch(src, /CLI_KEYWORDS = new Set\(\[[^\]]*variants/);
});

test('rebuild reset writes only the command module todoFrontend', () => {
  const src = readFileSync(path.join(HERE, 'agentChangeFrontend.ts'), 'utf8');
  assert.match(src, /resetFrontendDoneStatuses\(command\.module\)/);
  assert.match(src, /if \(moduleName && parsedModule !== moduleName && fileFolder !== moduleName\) continue;/);
  const shared = readFileSync(path.join(HERE, 'helpers', 'cfeCreateShared.ts'), 'utf8');
  assert.match(shared, /todoFrontendFileMatchesRunModule\(fileFolder, parsedModuleName, runModule\)/);
  assert.match(shared, /setTodoFrontendStatuses\(context.project, new Set\(ownerIds\), status, runModule\)/);
  assert.doesNotMatch(shared, /function currentCreateRunModule/);
});
