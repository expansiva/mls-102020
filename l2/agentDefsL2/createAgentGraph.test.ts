/// <mls fileReference="_102020_/l2/agentDefsL2/createAgentGraph.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

function tsFiles(folder: string): string[] {
  const result: string[] = [];
  for (const name of readdirSync(folder)) {
    const file = path.join(folder, name);
    if (statSync(file).isDirectory() && name !== 'fixtures') result.push(...tsFiles(file));
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) result.push(file);
  }
  return result;
}

void test('createAgent export graph has one public root and only private workers', () => {
  const agents = tsFiles(ROOT).flatMap(file => {
    const source = readFileSync(file, 'utf8');
    if (!/export function createAgent\s*\(/.test(source)) return [];
    const name = source.match(/agentName:\s*([A-Z0-9_]+|'[^']+')/)?.[1] || '';
    const visibility = source.match(/visibility:\s*'(public|private)'/)?.[1] || '';
    return [{ file: path.relative(ROOT, file).replace(/\\/g, '/'), name, visibility, source }];
  });
  assert.deepEqual(agents.map(agent => [agent.file, agent.visibility]), [
    ['agentDefsL2.ts', 'public'],
    ['steps/entry10/agentD2Entry.ts', 'private'],
    ['steps/input20/agentD2Input.ts', 'private'],
  ]);
  assert.match(agents[0].source, /beforePromptImplicit/);
  for (const agent of agents.slice(1)) assert.doesNotMatch(agent.source, /beforePromptImplicit/);
});

void test('no hook imports room messaging, frontend UI or another generator agent', () => {
  const source = tsFiles(ROOT).map(file => readFileSync(file, 'utf8')).join('\n');
  assert.doesNotMatch(source, /collabMessagesHelper|msgAddOrUpdateThreadBot|\bwindow\b|\bdocument\b|\bindexedDB\b/);
  assert.doesNotMatch(source, /agentChangeFrontend|_102021_\/l2\/agentChangeBackend/);
  assert.doesNotMatch(source, /\/rebuild all|l5\//);
});
