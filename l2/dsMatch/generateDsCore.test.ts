/// <mls fileReference="_102020_/l2/dsMatch/generateDsCore.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import {
    normalizeHex, sanitizeGeneratedDs, buildGenerateDsHumanPrompt,
    type GenerateDsRequest,
} from '/_102020_/l2/dsMatch/generateDsCore.js';

const req: GenerateDsRequest = { projectId: 1, brief: 'law firm, dark tones', language: 'pt' };

/** A fully valid LLM `result` (deep-cloned per test so mutations don't leak). */
function validRaw(): any {
    return JSON.parse(JSON.stringify({
        name: 'Sunset Vibes',
        description: 'Warm and calm.',
        tokens: {
            palette: ['#c85a2a', '#F2C57C'],
            color: {
                primary: { light: '#c85a2a', dark: '#E0723F' },
                background: { light: '#F6F1EB', dark: '#1B1714' },
                surface: { light: '#FFFFFF', dark: '#262019' },
                text: { light: '#3B2F2F', dark: '#F6F1EB' },
                border: { light: '#E4DACE', dark: '#3A322B' },
            },
            typography: {
                fonts: [
                    { name: 'Display', source: 'google', family: 'Fraunces', weights: [400, 600, '700'], fallback: 'serif' },
                    { name: 'body', source: 'google', family: 'Inter', weights: [400], fallback: 'sans-serif' },
                ],
                scale: 'comfortable', weightHeading: '600', tracking: 'tight',
            },
            shape: { radius: 'lg', borderWidth: '1' },
            density: 'cozy', elevation: 'soft',
        },
    }));
}

test('normalizeHex accepts #rrggbb/#rgb and rejects the rest', () => {
    assert.equal(normalizeHex('#c85a2a'), '#C85A2A');
    assert.equal(normalizeHex('#abc'), '#AABBCC');
    assert.equal(normalizeHex(' #FFFFFF '), '#FFFFFF');
    assert.equal(normalizeHex('red'), null);
    assert.equal(normalizeHex('#12345'), null);
    assert.equal(normalizeHex(123), null);
});

test('sanitize keeps a valid result (hex uppercased, font names slugged, weights parsed)', () => {
    const r = sanitizeGeneratedDs(validRaw(), req);
    assert.equal(r.ok, true);
    const v = r.value!;
    assert.equal(v.name, 'Sunset Vibes');
    assert.equal(v.tokens.color!.primary.light, '#C85A2A');
    assert.deepEqual(v.tokens.palette, ['#C85A2A', '#F2C57C']);
    const display = v.tokens.typography!.fonts!.find(f => f.name === 'display');
    assert.ok(display, 'font role "Display" is slugged to "display"');
    assert.deepEqual(display!.weights, [400, 600, 700]);
    assert.equal(v.tokens.shape!.radius, 'lg');
});

test('request palette overrides whatever the LLM returned', () => {
    const r = sanitizeGeneratedDs(validRaw(), { ...req, palette: ['#112233', '#abc'] });
    assert.equal(r.ok, true);
    assert.deepEqual(r.value!.tokens.palette, ['#112233', '#AABBCC']);
});

test('missing required role is rejected with the role named', () => {
    const raw = validRaw();
    delete raw.tokens.color.surface;
    const r = sanitizeGeneratedDs(raw, req);
    assert.equal(r.ok, false);
    assert.match(r.error!, /surface/);
});

test('invalid hex on a required role counts as missing', () => {
    const raw = validRaw();
    raw.tokens.color.text.dark = 'tomato';
    const r = sanitizeGeneratedDs(raw, req);
    assert.equal(r.ok, false);
    assert.match(r.error!, /text/);
});

test('background equal in light and dark is rejected (no real theming)', () => {
    const raw = validRaw();
    raw.tokens.color.background = { light: '#FFFFFF', dark: '#ffffff' };
    const r = sanitizeGeneratedDs(raw, req);
    assert.equal(r.ok, false);
    assert.match(r.error!, /background/);
});

test('unknown enums are clamped to defaults; broken fonts fall back to system pair', () => {
    const raw = validRaw();
    raw.tokens.typography = { fonts: [{ name: '', family: '' }], scale: 'gigantic', tracking: 'loose' };
    raw.tokens.shape = { radius: 'xxl', borderWidth: '7' };
    raw.tokens.density = 'dense';
    raw.tokens.elevation = 'extreme';
    const r = sanitizeGeneratedDs(raw, req);
    assert.equal(r.ok, true);
    const t = r.value!.tokens;
    assert.equal(t.typography!.scale, 'comfortable');
    assert.equal(t.typography!.tracking, 'normal');
    assert.equal(t.shape!.radius, 'md');
    assert.equal(t.shape!.borderWidth, '1');
    assert.equal(t.density, 'cozy');
    assert.equal(t.elevation, 'soft');
    assert.deepEqual(t.typography!.fonts!.map(f => f.name), ['display', 'body']);
    assert.equal(t.typography!.fonts![0].family, 'system-ui');
});

test('non-object results are rejected', () => {
    assert.equal(sanitizeGeneratedDs(null, req).ok, false);
    assert.equal(sanitizeGeneratedDs('{}', req).ok, false);
    assert.equal(sanitizeGeneratedDs({ name: 'x' }, req).ok, false);
});

test('human prompt carries brief, verbatim palette and language', () => {
    const p = buildGenerateDsHumanPrompt({ projectId: 1, brief: 'kids app', palette: ['#FF0000'], language: 'es' });
    assert.match(p, /kids app/);
    assert.match(p, /- #FF0000/);
    assert.match(p, /language: es/);
    const p2 = buildGenerateDsHumanPrompt({ projectId: 1, brief: 'only brief' });
    assert.doesNotMatch(p2, /Brand palette/);
});
