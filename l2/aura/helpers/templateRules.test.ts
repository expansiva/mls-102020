/// <mls fileReference="_102020_/l2/aura/helpers/templateRules.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import test from 'node:test';

import { extractTemplateRules, validateTemplateRules } from '/_102020_/l2/aura/helpers/templateRules.js';
import { layoutAxes } from '/_102020_/l2/aura/helpers/designSystemAuraBase.js';

// mls-102020/l2/aura/helpers → mls-102020/l4/collabux/templates and mls-102020/l2/aura/molecules/skills
const TEMPLATES = new URL('../../../l4/collabux/templates/', import.meta.url);
const SKILLS = new URL('../molecules/skills/', import.meta.url);
const LEGACY = /^page\d\d\.md$/;

const isDir = (url: URL) => statSync(url).isDirectory();

/** The catalog group ids: folders of `aura/molecules/skills/` named `group*`. */
const GROUP_IDS = readdirSync(SKILLS).filter(name => name.startsWith('group') && isDir(new URL(`${name}/`, SKILLS)));

const md = (...lines: string[]) => lines.join('\r\n');
const block = (json: string) => ['## Molecule rules', '', '```json', json, '```'];
const VALID = '{ "axes": { "recordsView": "grid" }, "groups": { "prefer": ["groupViewCard"], "forbid": ["groupViewTable"] } }';

// ─── extractTemplateRules ──────────────────────────────────────────────────────

test('extracts the right block, even with other code blocks in the file', () => {
  const text = md(
    '# cat — experience `x`',
    '',
    '```json',
    '{ "axes": { "density": "compact" }, "groups": { "prefer": [], "forbid": [] } }',
    '```',
    '',
    '## Signals',
    '',
    '```',
    '## Molecule rules',
    '```',
    '',
    ...block(VALID),
    '',
    '## Next section',
    '',
    '```json',
    '{ "ignored": true }',
    '```',
  ); // the fence before the section and the block after the next heading are not extracted
  const r = extractTemplateRules(text);
  assert.equal(r.kind, 'rules');
  assert.deepEqual(r.kind === 'rules' && r.rules, JSON.parse(VALID));
});

test('stops the section at the next ## heading', () => {
  const r = extractTemplateRules(md('## Molecule rules', '', 'prose only', '', '## Later', '', '```json', VALID, '```'));
  assert.equal(r.kind, 'error');
});

test('handles CRLF and LF alike', () => {
  const lf = extractTemplateRules(block(VALID).join('\n'));
  const crlf = extractTemplateRules(block(VALID).join('\r\n'));
  assert.deepEqual(lf, crlf);
  assert.equal(lf.kind, 'rules');
});

test('pageNN.md without the section gives none', () => {
  const legacy = readFileSync(new URL('approvalWorkflow/page21.md', TEMPLATES), 'utf8');
  assert.deepEqual(extractTemplateRules(legacy), { kind: 'none' });
});

test('a section without a json block is an error', () => {
  const r = extractTemplateRules(md('## Molecule rules', '', '```', VALID, '```'));
  assert.equal(r.kind, 'error');
});

test('invalid JSON is an error', () => {
  const r = extractTemplateRules(md(...block('{ "axes": { }, }')));
  assert.equal(r.kind, 'error');
  assert.match(r.kind === 'error' ? r.message : '', /invalid JSON/);
});

test('more than one json block in the section is an error', () => {
  const r = extractTemplateRules(md(...block(VALID), '', '```json', VALID, '```'));
  assert.equal(r.kind, 'error');
  assert.match(r.kind === 'error' ? r.message : '', /2 ```json blocks/);
});

test('an unterminated block is an error', () => {
  const r = extractTemplateRules(md('## Molecule rules', '', '```json', VALID));
  assert.equal(r.kind, 'error');
});

// ─── validateTemplateRules ─────────────────────────────────────────────────────

const validate = (rules: unknown) => validateTemplateRules(rules, layoutAxes, GROUP_IDS);

test('valid rules have no problems; empty lists are allowed', () => {
  assert.deepEqual(validate(JSON.parse(VALID)), []);
  assert.deepEqual(validate({ axes: {}, groups: { prefer: [], forbid: [] } }), []);
});

test('groups compare ignoring case', () => {
  assert.deepEqual(validate({ axes: {}, groups: { prefer: ['groupviewcard'], forbid: ['GROUPENTERDATETIME'] } }), []);
});

test('unknown axis gives a problem', () => {
  assert.deepEqual(validate({ axes: { colorMode: 'dark' }, groups: { prefer: [], forbid: [] } }), ['unknown axis "colorMode"']);
});

test('value outside the axis values gives a problem', () => {
  const p = validate({ axes: { recordsView: 'cards' }, groups: { prefer: [], forbid: [] } });
  assert.equal(p.length, 1);
  assert.match(p[0], /axis "recordsView": value "cards" is not one of table, grid/);
  assert.equal(validate({ axes: { density: 3 }, groups: { prefer: [], forbid: [] } }).length, 1);
});

test('unknown group gives a problem', () => {
  assert.deepEqual(
    validate({ axes: {}, groups: { prefer: ['groupViewCards'], forbid: ['groupNavigateMain'] } }),
    ['"groups.prefer": unknown group "groupViewCards"', '"groups.forbid": unknown group "groupNavigateMain"'],
  );
});

test('the same group in prefer and forbid gives a problem', () => {
  assert.deepEqual(
    validate({ axes: {}, groups: { prefer: ['groupViewTable'], forbid: ['groupviewtable'] } }),
    ['group "groupViewTable" is both in "groups.prefer" and "groups.forbid"'],
  );
});

test('duplicates in a list give a problem', () => {
  assert.deepEqual(
    validate({ axes: {}, groups: { prefer: ['groupViewCard', 'groupViewCard'], forbid: [] } }),
    ['"groups.prefer": duplicate group "groupViewCard"'],
  );
});

test('missing and extra keys give problems', () => {
  assert.deepEqual(validate({ groups: { prefer: [] }, organisms: {} }), [
    'unknown top-level key "organisms"',
    'missing "axes"',
    'missing "groups.forbid"',
  ]);
  assert.deepEqual(validate({ axes: {} }), ['missing "groups"']);
  assert.deepEqual(validate({ axes: [], groups: { prefer: 'x', forbid: [], extra: [] } }), [
    '"axes" must be an object',
    'unknown key "groups.extra"',
    '"groups.prefer" must be an array',
  ]);
  assert.equal(validate([]).length, 1);
});

test('the catalog has the group folders the guard validates against', () => {
  assert.ok(GROUP_IDS.length >= 30, `found ${GROUP_IDS.length} group folders`);
  assert.ok(GROUP_IDS.includes('groupViewTable'));
  assert.ok(!GROUP_IDS.some(g => g.startsWith('olders')));
});

// ─── The guard: every new template carries valid rules ─────────────────────────

/** The guard's verdict on one new template: [] when it passes. */
function guard(rel: string, text: string): string[] {
  const r = extractTemplateRules(text);
  if (r.kind === 'none') return [`${rel}: missing "## Molecule rules"`];
  if (r.kind === 'error') return [`${rel}: ${r.message}`];
  return validate(r.rules).map(p => `${rel}: ${p}`);
}

const newTemplates = readdirSync(TEMPLATES)
  .filter(category => isDir(new URL(`${category}/`, TEMPLATES)))
  .flatMap(category => readdirSync(new URL(`${category}/`, TEMPLATES))
    .filter(file => file.endsWith('.md') && !LEGACY.test(file))
    .map(file => `${category}/${file}`));

test('the guard finds the new templates', () => {
  assert.ok(newTemplates.length >= 66, `found ${newTemplates.length} new templates`);
});

test('a new template without the section fails the guard', () => {
  assert.deepEqual(guard('cat/x.md', md('# cat — experience `x`', '', '## Signals', '', '1. **S1:** ...')),
    ['cat/x.md: missing "## Molecule rules"']);
  assert.equal(guard('cat/x.md', md(...block('{ "axes": {}, "groups": { "prefer": [], "forbid": ["groupNope"] } }'))).length, 1);
  assert.deepEqual(guard('cat/x.md', md(...block(VALID))), []);
});

test('the guard passes on every new template', () => {
  const failures = newTemplates.flatMap(rel => guard(rel, readFileSync(new URL(rel, TEMPLATES), 'utf8')));
  assert.deepEqual(failures, [], `${failures.length} problem(s) in ${newTemplates.length} templates`);
});
