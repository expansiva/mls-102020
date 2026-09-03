/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syDiscover.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { syDiscoverGroups, syResolveRequested, syUnknownGroupsMessage, SySkillListEntry } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syDiscover.js';

const SKILL_LIST: SySkillListEntry[] = [
  { name: 'groupEnterText', description: 'Allows the user to input free-form text.', skillUsageReference: '/_102020_/l2/aura/molecules/skills/groupEnterText/usage' },
  { name: 'groupSelectOne', description: 'Allows the user to select exactly one option.', skillUsageReference: '/_102020_/l2/aura/molecules/skills/groupSelectOne/usage' },
];

void test('a folder with a skills/index.ts entry is matched, canonical casing restored', () => {
  const result = syDiscoverGroups(['groupentertext', 'groupselectone'], SKILL_LIST);
  assert.equal(result.matched.length, 2);
  assert.equal(result.ignored.length, 0);
  const text = result.matched.find(g => g.folder === 'groupentertext')!;
  assert.equal(text.canonical, 'groupEnterText');
  assert.equal(text.usageContract, '/_102020_/l2/aura/molecules/skills/groupEnterText/usage');
  assert.equal(text.purpose, 'Allows the user to input free-form text.');
});

void test('a folder with no skills/index.ts entry is ignored, with a reason — not dropped silently', () => {
  const result = syDiscoverGroups(['groupentertext', 'groupnavigatemain'], SKILL_LIST);
  assert.equal(result.matched.length, 1);
  assert.equal(result.ignored.length, 1);
  assert.equal(result.ignored[0].folder, 'groupnavigatemain');
  assert.match(result.ignored[0].reason, /skills\/index\.ts/);
});

void test('duplicate folders (case variants) collapse to one', () => {
  const result = syDiscoverGroups(['groupentertext', 'GroupEnterText', ' groupentertext '], SKILL_LIST);
  assert.equal(result.matched.length, 1);
});

void test('matched groups come back in the given projectFolders order, NOT skills/index.ts order', () => {
  // E5 falsified the opposite guess: the seeded skill.ts lists groupViewTable before groupEnterDate,
  // the reverse of their skills/index.ts order — so this module must not depend on that file's order.
  const result = syDiscoverGroups(['groupentertext', 'groupselectone'], SKILL_LIST);
  assert.deepEqual(result.matched.map(g => g.canonical), ['groupEnterText', 'groupSelectOne']);

  const reversedFolders = syDiscoverGroups(['groupselectone', 'groupentertext'], SKILL_LIST);
  assert.deepEqual(reversedFolders.matched.map(g => g.canonical), ['groupSelectOne', 'groupEnterText']);

  // reversing skillList's own order changes nothing — order is driven by projectFolders alone.
  const reversedSkillList = syDiscoverGroups(['groupentertext', 'groupselectone'], [...SKILL_LIST].reverse());
  assert.deepEqual(reversedSkillList.matched.map(g => g.canonical), ['groupEnterText', 'groupSelectOne']);
});

void test('resolveRequested with wantsAll returns everything discovered, matched and ignored', () => {
  const discovery = syDiscoverGroups(['groupentertext', 'groupnavigatemain'], SKILL_LIST);
  const resolved = syResolveRequested(discovery, { wantsAll: true, groupTokens: [] });
  assert.equal(resolved.selected.length, 1);
  assert.equal(resolved.requestedButIgnored.length, 1);
  assert.equal(resolved.unknown.length, 0);
});

void test('resolveRequested with an explicit list matches case-insensitively', () => {
  const discovery = syDiscoverGroups(['groupentertext', 'groupselectone'], SKILL_LIST);
  const resolved = syResolveRequested(discovery, { wantsAll: false, groupTokens: ['groupEnterText'] });
  assert.equal(resolved.selected.length, 1);
  assert.equal(resolved.selected[0].canonical, 'groupEnterText');
  assert.equal(resolved.unknown.length, 0);
});

void test('an explicitly named IGNORED group is not "unknown" — same ignored-with-reason outcome as a batch run (D4)', () => {
  const discovery = syDiscoverGroups(['groupentertext', 'groupnavigatemain'], SKILL_LIST);
  const resolved = syResolveRequested(discovery, { wantsAll: false, groupTokens: ['groupNavigateMain'] });
  assert.equal(resolved.selected.length, 0);
  assert.equal(resolved.requestedButIgnored.length, 1);
  assert.equal(resolved.unknown.length, 0);
});

void test('a token matching no discovered folder at all is unknown, and the message names the valid ones', () => {
  const discovery = syDiscoverGroups(['groupentertext', 'groupnavigatemain'], SKILL_LIST);
  const resolved = syResolveRequested(discovery, { wantsAll: false, groupTokens: ['groupDoesNotExist'] });
  assert.deepEqual(resolved.unknown, ['groupDoesNotExist']);
  const message = syUnknownGroupsMessage(resolved.unknown, discovery);
  assert.match(message, /groupDoesNotExist/);
  assert.match(message, /groupEnterText/);
  assert.match(message, /groupnavigatemain/);
});
