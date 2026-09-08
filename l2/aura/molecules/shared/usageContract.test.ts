/// <mls fileReference="_102020_/l2/aura/molecules/shared/usageContract.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { ENVELOPE, contractItemsMissing, contractItemsUsed, usageContractItems } from '/_102020_/l2/aura/molecules/shared/usageContract.js';

const USAGE_SKILL = `
## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`data-variant\` | \`string\` | \`'primary'\` | Visual tone |
| \`icon-position\` | \`string\` | \`'start'\` | Icon placement |
| \`disabled\` | \`boolean\` | \`false\` | Disables the button |

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`action\` | \`{}\` | Fired when the button is clicked |

## Design Tokens

| Token | Default | Purpose |
|-------|---------|---------|
| \`--ml-primary\` | \`#3b82f6\` | Accent color |
`;

test('reads items from Properties and Events, normalized lowercase without hyphens', () => {
  const items = usageContractItems(USAGE_SKILL);
  assert.deepEqual([...items].sort(), ['action', 'datavariant', 'disabled', 'iconposition']);
});

test('a table outside Properties/Events (Design Tokens) is not counted', () => {
  const items = usageContractItems(USAGE_SKILL);
  assert.equal(items.has('mlprimary'), false);
});

test('empty or missing usage skill yields an empty set', () => {
  assert.equal(usageContractItems('').size, 0);
  assert.equal(usageContractItems('(this group has no usage skill)').size, 0);
});

test('the envelope is exactly what the mold delivers', () => {
  assert.deepEqual([...ENVELOPE].sort(), ['change', 'isediting', 'name', 'value']);
});

test('an instance using only the envelope reports zero contract items used', () => {
  const contract = usageContractItems(USAGE_SKILL);
  const indexTs = `<mygroup--ml-button name="card-1" .value=\${this.card1} .isEditing=\${true}
    @change=\${(e) => { this.card1 = e.detail.value; }}>
  </mygroup--ml-button>`;
  assert.deepEqual(contractItemsUsed(indexTs, 'mygroup', contract), []);
});

test('an instance carrying data-variant and @action beyond the envelope is detected', () => {
  const contract = usageContractItems(USAGE_SKILL);
  const indexTs = `<mygroup--ml-button name="card-1" .value=\${this.card1} .isEditing=\${true}
    data-variant="secondary" size="md"
    @change=\${(e) => { this.card1 = e.detail.value; }}
    @action=\${() => {}}>
  </mygroup--ml-button>`;
  const used = contractItemsUsed(indexTs, 'mygroup', contract).sort();
  assert.deepEqual(used, ['action', 'datavariant']);
});

test('a hyphenated property matches its .camelCase property binding', () => {
  const contract = usageContractItems(USAGE_SKILL);
  const indexTs = `<mygroup--ml-button name="card-1" .value=\${this.card1} .isEditing=\${true} .iconPosition=\${'end'}>
  </mygroup--ml-button>`;
  assert.deepEqual(contractItemsUsed(indexTs, 'mygroup', contract), ['iconposition']);
});

test('a match on a different group tag is not counted', () => {
  const contract = usageContractItems(USAGE_SKILL);
  const indexTs = `<othergroup--ml-button name="card-1" data-variant="secondary"></othergroup--ml-button>`;
  assert.deepEqual(contractItemsUsed(indexTs, 'mygroup', contract), []);
});

// The two defects the first version of the gate's MESSAGE shipped with, measured on real files:
// it sampled the normalized set, so it suggested `datavariant` (not an attribute) and, for a group
// whose contract overlaps the envelope, `value` (already on the page).
test('the missing items come back in the spelling the skill wrote, hyphens included', () => {
  const missing = contractItemsMissing(USAGE_SKILL, '<grouptriggeraction--ml-button name="a"></grouptriggeraction--ml-button>', 'grouptriggeraction');
  assert.ok(missing.includes('data-variant'), 'must quote `data-variant`, not `datavariant`');
  assert.ok(missing.includes('icon-position'), 'must quote `icon-position`, not `iconposition`');
});

test('an item of the envelope is never reported as missing', () => {
  const skill = USAGE_SKILL + '\n## Properties\n\n| Property | Type |\n|---|---|\n| \\`value\\` | \\`string\\` |\n';
  const missing = contractItemsMissing(skill, '<g--m></g--m>', 'g');
  for (const item of missing) assert.ok(!ENVELOPE.has(item.toLowerCase().replace(/-/g, '')), `envelope item leaked: ${item}`);
});

test('an item the page already uses is not reported as missing', () => {
  const page = '<grouptriggeraction--ml-button data-variant="primary"></grouptriggeraction--ml-button>';
  const missing = contractItemsMissing(USAGE_SKILL, page, 'grouptriggeraction');
  assert.ok(!missing.includes('data-variant'), '`data-variant` is on the page, so it is not missing');
  assert.ok(missing.includes('action'), 'the untouched event is still missing');
});
