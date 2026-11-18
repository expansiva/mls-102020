/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupLabels.test.ts" enhancement="_blank"/>

// Keeps the display labels of the molecule groups aligned with the group list the agents use:
// every group in `skills/index.ts` has a title and a summary in every language, and no label points
// at a group that does not exist. The panel falls back to the English contract text when a label is
// missing, so a gap here is not a crash — it is the technical text coming back to the screen.

import test from 'node:test';
import assert from 'node:assert/strict';
import { skills } from '/_102020_/l2/aura/molecules/skills/index.js';
import { getGroupLabel, groupLabels } from '/_102020_/l2/aura/molecules/skills/groupLabels.js';

const LANGS = ['en', 'pt', 'es'];
const groupNames = (skills as { name: string }[]).map((s) => s.name);

test('the label table offers exactly en, pt and es', () => {
    assert.deepEqual(Object.keys(groupLabels).sort(), [...LANGS].sort());
});

test('every group of skills/index.ts has a non-empty title and summary in every language', () => {
    const missing: string[] = [];
    for (const lang of LANGS) {
        for (const name of groupNames) {
            const label = getGroupLabel(name, lang);
            if (!label || !label.title.trim() || !label.summary.trim()) missing.push(`${lang}:${name}`);
        }
    }
    assert.deepEqual(missing, []);
});

test('no label names a group that skills/index.ts does not have', () => {
    const known = new Set(groupNames);
    for (const lang of LANGS) {
        const extra = Object.keys(groupLabels[lang]).filter((k) => !known.has(k));
        assert.deepEqual(extra, [], `${lang} has labels for unknown groups`);
    }
});

test('the lookup ignores case, as the group read from a tag prefix is lowercase', () => {
    assert.equal(getGroupLabel('groupnavigatesection', 'pt')?.title, 'Navegar entre seções');
    assert.equal(getGroupLabel('groupNavigateSection', 'en')?.title, 'Navigate sections');
});

test('an unknown group gives null and an unknown language falls back to English', () => {
    assert.equal(getGroupLabel('groupDoesNotExist', 'pt'), null);
    assert.equal(getGroupLabel('', 'pt'), null);
    assert.equal(getGroupLabel('groupNavigateSection', 'fr')?.title, 'Navigate sections');
});
