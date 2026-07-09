/// <mls fileReference="_102020_/l2/dsMatch/generateDsCore.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import {
    normalizeHex, sanitizeGeneratedDs, buildGenerateDsHumanPrompt, expandColorTokens, parseColorKey,
    type GenerateDsRequest,
} from '/_102020_/l2/dsMatch/generateDsCore.js';
import {
    MANDATORY_TOKEN_KEYS, MANDATORY_COLOR_FAMILIES, DEFAULT_TOKENS_TEMPLATE,
} from '/_102029_/l2/designSystemBase.js';

const HEX = /^#[0-9a-f]{6}$/;
const req: GenerateDsRequest = { projectId: 1, palette: ['#c85a2a', '#f2c57c'], language: 'pt' };

/** A valid LLM `result`: name/description + all 11 family bases (deep-cloned per test). */
function validRaw(): any {
    const families: Record<string, { light: string; dark: string }> = {};
    for (const f of MANDATORY_COLOR_FAMILIES) families[f] = { light: '#3b82f6', dark: '#60a5fa' };
    families['active'] = { light: '#1890ff', dark: '#0b81ef' };
    return JSON.parse(JSON.stringify({ name: 'Sunset', description: 'Warm and calm.', families }));
}

test('normalizeHex accepts #rrggbb/#rgb (lowercased) and rejects the rest', () => {
    assert.equal(normalizeHex('#C85A2A'), '#c85a2a');
    assert.equal(normalizeHex('#ABC'), '#aabbcc');
    assert.equal(normalizeHex(' #FFFFFF '), '#ffffff');
    assert.equal(normalizeHex('red'), null);
    assert.equal(normalizeHex('#12345'), null);
    assert.equal(normalizeHex(123), null);
});

test('parseColorKey splits family / variant / state / dark', () => {
    assert.deepEqual(parseColorKey('text-primary-color'), { dark: false, family: 'text-primary', variant: '', state: '' });
    assert.deepEqual(parseColorKey('text-primary-color-lighter-hover'), { dark: false, family: 'text-primary', variant: 'lighter', state: 'hover' });
    assert.deepEqual(parseColorKey('_dark-bg-secondary-color-darker'), { dark: true, family: 'bg-secondary', variant: 'darker', state: '' });
    assert.deepEqual(parseColorKey('grey-color-light'), { dark: false, family: 'grey', variant: 'light', state: '' });
    assert.equal(parseColorKey('not-a-token'), null);
});

test('sanitize ALWAYS yields the complete mandatory token set (color/global/typography)', () => {
    const r = sanitizeGeneratedDs(validRaw(), req);
    assert.equal(r.ok, true);
    const t = r.value!.tokens;
    assert.deepEqual(Object.keys(t.color).sort(), [...MANDATORY_TOKEN_KEYS.color].sort());
    assert.deepEqual(Object.keys(t.global).sort(), [...MANDATORY_TOKEN_KEYS.global].sort());
    assert.deepEqual(Object.keys(t.typography).sort(), [...MANDATORY_TOKEN_KEYS.typography].sort());
    for (const v of Object.values(t.color)) assert.match(v, HEX, `every color is #rrggbb: got ${v}`);
});

test('global + typography come verbatim from the canonical template', () => {
    const t = sanitizeGeneratedDs(validRaw(), req).value!.tokens;
    assert.deepEqual(t.global, DEFAULT_TOKENS_TEMPLATE.global);
    assert.deepEqual(t.typography, DEFAULT_TOKENS_TEMPLATE.typography);
});

test('a provided family base drives its expansion (base key == anchor, shades differ)', () => {
    const t = sanitizeGeneratedDs(validRaw(), req).value!.tokens;
    assert.equal(t.color['active-color'], '#1890ff');                 // base variant/state → dl 0 → anchor
    assert.equal(t.color['_dark-active-color'], '#0b81ef');           // dark anchor
    assert.notEqual(t.color['active-color-hover'], t.color['active-color']); // states-only family
    // text-primary is a FULL-shape family (lighter/darker variants exist)
    assert.notEqual(t.color['text-primary-color-lighter'], t.color['text-primary-color-darker']);
    assert.notEqual(t.color['text-primary-color-hover'], t.color['text-primary-color']);
});

test('a missing/invalid family falls back to the template default for its keys', () => {
    const raw = validRaw();
    delete raw.families['grey'];                 // omit a family entirely
    raw.families['error'] = { light: 'nope', dark: '#000000' }; // invalid light → whole family invalid
    const t = sanitizeGeneratedDs(raw, req).value!.tokens;
    assert.equal(t.color['grey-color'], DEFAULT_TOKENS_TEMPLATE.color['grey-color']);
    assert.equal(t.color['grey-color-darker'], DEFAULT_TOKENS_TEMPLATE.color['grey-color-darker']);
    assert.equal(t.color['error-color'], DEFAULT_TOKENS_TEMPLATE.color['error-color']);
});

test('expandColorTokens with no bases == the full template color set', () => {
    const c = expandColorTokens({});
    assert.deepEqual(c, DEFAULT_TOKENS_TEMPLATE.color);
});

test('name falls back to nameHint; empty result still yields a complete entry', () => {
    const r1 = sanitizeGeneratedDs({ families: {} }, { ...req, nameHint: 'brandy' });
    assert.equal(r1.ok, true);
    assert.equal(r1.value!.name, 'brandy');
    assert.equal(Object.keys(r1.value!.tokens.color).length, MANDATORY_TOKEN_KEYS.color.length);
    assert.equal(sanitizeGeneratedDs(null, req).ok, false);
    assert.equal(sanitizeGeneratedDs('{}', req).ok, false);
});

test('human prompt carries palette verbatim, the family list and language', () => {
    const p = buildGenerateDsHumanPrompt({ projectId: 1, palette: ['#FF0000'], language: 'es' });
    assert.match(p, /- #FF0000/);
    assert.match(p, /- text-primary/);
    assert.match(p, /- active/);
    assert.match(p, /language: es/);
    const p2 = buildGenerateDsHumanPrompt({ projectId: 1, brief: 'only brief' });
    assert.doesNotMatch(p2, /Brand palette/);
});
