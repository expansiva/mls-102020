/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/templateRules.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import { l2ExtractTemplateRules, l2TemplateForbiddenGroups } from '/_102020_/l2/agentMaterializeL2/helpers/templateRules.js';
// Test only: the official extractor, to keep the private copy identical (the agent itself never imports it).
import { extractTemplateRules } from '/_102020_/l2/aura/helpers/templateRules.js';

const root = new URL('../../../l4/collabux/', import.meta.url);
function markdownFiles(dir: URL): URL[] {
  return readdirSync(dir).flatMap(name => {
    const url = new URL(name, dir);
    return statSync(url).isDirectory() ? markdownFiles(new URL(`${name}/`, dir)) : name.endsWith('.md') ? [url] : [];
  });
}

test('the private copy extracts exactly what the official extractor does, on every collabux template', () => {
  const files = [...markdownFiles(new URL('templates/', root)), ...markdownFiles(new URL('templatesTest/', root))];
  assert.ok(files.length > 10);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.deepEqual(l2ExtractTemplateRules(text), extractTemplateRules(text), file.pathname);
  }
  for (const text of ['## Molecule rules\n', '## Molecule rules\n```json\n{\n', '## Molecule rules\n```json\n{}\n```\n```json\n{}\n```\n', '## Molecule rules\n\n## Molecule rules\n']) {
    assert.deepEqual(l2ExtractTemplateRules(text), extractTemplateRules(text), text);
  }
});

test('forbidden groups: lower-cased; none for a legacy template; error for a missing forbid list', () => {
  assert.deepEqual(l2TemplateForbiddenGroups('## Molecule rules\n```json\n{"axes":{},"groups":{"prefer":[],"forbid":["groupViewTable"]}}\n```\n'), { kind: 'forbid', groups: ['groupviewtable'] });
  assert.deepEqual(l2TemplateForbiddenGroups('# legacy page21\n'), { kind: 'none' });
  assert.equal(l2TemplateForbiddenGroups('## Molecule rules\n```json\n{"axes":{},"groups":{"prefer":[]}}\n```\n').kind, 'error');
});
