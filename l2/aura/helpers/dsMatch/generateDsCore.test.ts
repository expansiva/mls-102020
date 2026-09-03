/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/generateDsCore.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import {
    normalizeHex, sanitizeGeneratedDs, buildGenerateDsHumanPrompt, expandColorTokens, parseColorKey,
    type GenerateDsRequest,
} from '/_102020_/l2/aura/helpers/dsMatch/generateDsCore.js';
import {
    MANDATORY_TOKEN_KEYS, MANDATORY_COLOR_ROLES, DEFAULT_TOKENS_TEMPLATE,
} from '/_102029_/l2/designSystemBase.js';

const HEX = /^#[0-9a-f]{6}$/;
const req: GenerateDsRequest = { projectId: 1, palette: ['#c85a2a', '#f2c57c'], language: 'pt' };

/** A valid LLM `result`: name/description + all 44 role bases (deep-cloned per test). */
function validRaw(): any {
    const roles: Record<string, { light: string; dark: string }> = {};
    for (const r of MANDATORY_COLOR_ROLES) roles[r] = { light: '#3b82f6', dark: '#60a5fa' };
    roles['button-primary-bg'] = { light: '#1890ff', dark: '#0b81ef' };
    return JSON.parse(JSON.stringify({ name: 'Sunset', description: 'Warm and calm.', roles }));
}

test('normalizeHex accepts #rrggbb/#rgb (lowercased) and rejects the rest', () => {
    assert.equal(normalizeHex('#C85A2A'), '#c85a2a');
    assert.equal(normalizeHex('#ABC'), '#aabbcc');
    assert.equal(normalizeHex(' #FFFFFF '), '#ffffff');
    assert.equal(normalizeHex('red'), null);
    assert.equal(normalizeHex('#12345'), null);
    assert.equal(normalizeHex(123), null);
});

test('parseColorKey splits role / state / dark', () => {
    assert.deepEqual(parseColorKey('page-bg'), { dark: false, role: 'page-bg', state: '' });
    assert.deepEqual(parseColorKey('button-primary-bg-hover'), { dark: false, role: 'button-primary-bg', state: 'hover' });
    assert.deepEqual(parseColorKey('_dark-status-error-text-disabled'), { dark: true, role: 'status-error-text', state: 'disabled' });
    assert.deepEqual(parseColorKey('chart-series-6'), { dark: false, role: 'chart-series-6', state: '' });
    assert.equal(parseColorKey('not-a-token'), null);
    // a role name is never partially matched: 'page' alone is not a role
    assert.equal(parseColorKey('page'), null);
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

test('a provided role base drives its expansion (base key == anchor, states differ)', () => {
    const t = sanitizeGeneratedDs(validRaw(), req).value!.tokens;
    assert.equal(t.color['button-primary-bg'], '#1890ff');              // no state → the anchor itself
    assert.equal(t.color['_dark-button-primary-bg'], '#0b81ef');        // dark anchor
    // states are DARKER than the base (multiplicative lightness) and all distinct
    const base = t.color['button-primary-bg'];
    const hover = t.color['button-primary-bg-hover'];
    const focus = t.color['button-primary-bg-focus'];
    const disabled = t.color['button-primary-bg-disabled'];
    assert.equal(new Set([base, hover, focus, disabled]).size, 4);
    assert.notEqual(hover, focus);
});

test('hover stays visible on a near-white role (the additive-delta regression)', () => {
    const roles: Record<string, { light: string; dark: string }> = {
        'surface-bg': { light: '#ffffff', dark: '#161b22' },
    };
    const c = expandColorTokens(roles as any);
    assert.notEqual(c['surface-bg-hover'], '#ffffff');
    assert.notEqual(c['surface-bg-focus'], c['surface-bg-hover']);
});

test('a missing/invalid role falls back to the template default for its keys', () => {
    const raw = validRaw();
    delete raw.roles['nav-bg'];                                  // omit a role entirely
    raw.roles['link-text'] = { light: 'nope', dark: '#000000' }; // invalid light → whole role invalid
    const t = sanitizeGeneratedDs(raw, req).value!.tokens;
    assert.equal(t.color['nav-bg'], DEFAULT_TOKENS_TEMPLATE.color['nav-bg']);
    assert.equal(t.color['nav-bg-hover'], DEFAULT_TOKENS_TEMPLATE.color['nav-bg-hover']);
    assert.equal(t.color['link-text'], DEFAULT_TOKENS_TEMPLATE.color['link-text']);
});

test('expandColorTokens with no bases == the full template color set', () => {
    const c = expandColorTokens({});
    assert.deepEqual(c, DEFAULT_TOKENS_TEMPLATE.color);
});

test('name falls back to nameHint; empty result still yields a complete entry', () => {
    const r1 = sanitizeGeneratedDs({ roles: {} }, { ...req, nameHint: 'brandy' });
    assert.equal(r1.ok, true);
    assert.equal(r1.value!.name, 'brandy');
    assert.equal(Object.keys(r1.value!.tokens.color).length, MANDATORY_TOKEN_KEYS.color.length);
    assert.equal(sanitizeGeneratedDs(null, req).ok, false);
    assert.equal(sanitizeGeneratedDs('{}', req).ok, false);
});

test('human prompt carries palette verbatim, the role list and language', () => {
    const p = buildGenerateDsHumanPrompt({ projectId: 1, palette: ['#FF0000'], language: 'es' });
    assert.match(p, /- #FF0000/);
    assert.match(p, /- page-bg/);
    assert.match(p, /- chart-series-6/);
    assert.match(p, /language: es/);
    const p2 = buildGenerateDsHumanPrompt({ projectId: 1, brief: 'only brief' });
    assert.doesNotMatch(p2, /Brand palette/);
});
