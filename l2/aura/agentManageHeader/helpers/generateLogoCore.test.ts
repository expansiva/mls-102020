/// <mls fileReference="_102020_/l2/aura/agentManageHeader/helpers/generateLogoCore.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyLogoToBrand,
  buildGenerateLogoHumanPrompt,
  normalizeLogoRequest,
  readBrandTitle,
  sanitizeGeneratedLogo,
  validateLogoSvg,
} from '/_102020_/l2/aura/agentManageHeader/helpers/generateLogoCore.js';
import { AURA_HEADER_HEIGHT_PX, isSafeLogoSvg } from '/_102033_/l2/shared/layout/auraHeaderCore.js';

const PROJECT = 999999;

const VALID_SVG = '<svg viewBox="0 0 32 32" fill="none">'
  + '<rect x="1.75" y="1.75" width="28.5" height="28.5" rx="8" stroke="currentColor" stroke-width="2.5"/>'
  + '<path d="M21 11a8 8 0 1 0 0 10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>';

/** A client config with a header profile whose brand already has a title. */
function clientConfig(brand: Record<string, unknown> = { title: 'Sample App' }) {
  return {
    clientShell: {
      mode: 'spa',
      regions: {
        header: {
          activeProfile: 'defaultAura',
          profiles: {
            defaultAura: {
              renderer: { entrypoint: '/_999999_/l2/layout/appHeader.js', tag: 'layout--app-header-999999' },
              heightPx: AURA_HEADER_HEIGHT_PX,
              brand,
            },
            studio: { renderer: { entrypoint: '/_102033_/l2/cbe/studioHeader.js', tag: 'collab-cbe-studio-header' } },
          },
        },
      },
    },
  };
}

// ── request ────────────────────────────────────────────────────────────────

test('the entry needs a project, and the style falls back to monogram', () => {
  assert.throws(() => normalizeLogoRequest('nope'), /JSON object/);
  assert.throws(() => normalizeLogoRequest({}), /projectId/);
  assert.equal(normalizeLogoRequest({ projectId: PROJECT }).style, 'monogram');
  assert.equal(normalizeLogoRequest({ projectId: PROJECT, style: 'teleport' }).style, 'monogram');
  assert.equal(normalizeLogoRequest({ projectId: PROJECT, style: 'wordmark' }).style, 'wordmark');
});

test('the prompt carries the brand, the style and the size it must survive', () => {
  const prompt = buildGenerateLogoHumanPrompt(normalizeLogoRequest({
    projectId: PROJECT,
    brandTitle: 'Sample App',
    brief: 'warm and geometric',
    style: 'mark',
  }));
  assert.match(prompt, /Brand: Sample App/);
  assert.match(prompt, /Style: mark/);
  assert.match(prompt, /warm and geometric/);
  assert.match(prompt, /28px/);
});

// ── svg validation ─────────────────────────────────────────────────────────

test('a monochrome single-root mark with a viewBox is accepted', () => {
  assert.deepEqual(validateLogoSvg(VALID_SVG), []);
  assert.ok(isSafeLogoSvg(VALID_SVG), 'the runtime must accept what the generator accepts');
});

test('anything that fetches, scripts or embeds is refused', () => {
  const cases: Array<[string, RegExp]> = [
    ['<svg viewBox="0 0 32 32"><script>alert(1)</script></svg>', /plain shapes/],
    ['<svg viewBox="0 0 32 32"><image href="http://x/y.png"/></svg>', /plain shapes|external/],
    ['<svg viewBox="0 0 32 32"><use xlink:href="#a"/></svg>', /plain shapes|external/],
    ['<svg viewBox="0 0 32 32"><rect onload="alert(1)" fill="currentColor"/></svg>', /event handler/],
    ['<svg viewBox="0 0 32 32"><rect fill="url(#g)"/></svg>', /external|not allowed/],
    ['<svg viewBox="0 0 32 32"><style>rect{fill:red}</style></svg>', /plain shapes/],
  ];
  for (const [svg, expected] of cases) {
    const errors = validateLogoSvg(svg);
    assert.ok(errors.length > 0, `accepted: ${svg}`);
    assert.match(errors.join('; '), expected);
    assert.equal(isSafeLogoSvg(svg), false, `runtime accepted: ${svg}`);
  }
});

test('the mark must scale into the band', () => {
  assert.match(validateLogoSvg('<svg fill="none"><rect fill="currentColor"/></svg>').join('; '), /viewBox/);
  assert.match(
    validateLogoSvg('<svg viewBox="0 0 32 32" width="32" height="32"><rect fill="currentColor"/></svg>').join('; '),
    /must not declare width\/height/,
  );
  // width/height on an inner shape is legitimate — that is how a rect is drawn.
  assert.deepEqual(
    validateLogoSvg('<svg viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="7" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>'),
    [],
  );
});

test('the mark must be monochrome, so it survives the dark theme', () => {
  assert.match(validateLogoSvg('<svg viewBox="0 0 32 32"><rect fill="#ff0000"/></svg>').join('; '), /monochrome/);
  assert.match(validateLogoSvg('<svg viewBox="0 0 32 32"><rect fill="rgb(1,2,3)"/></svg>').join('; '), /monochrome/);
  assert.match(validateLogoSvg('<svg viewBox="0 0 32 32"><rect fill="red"/></svg>').join('; '), /not allowed/);
  assert.deepEqual(validateLogoSvg(VALID_SVG), []);
});

test('two roots, empty markup and oversized markup are refused', () => {
  assert.match(validateLogoSvg('<svg viewBox="0 0 8 8"></svg><svg viewBox="0 0 8 8"></svg>').join('; '), /single <svg> root|exactly one/);
  assert.deepEqual(validateLogoSvg('   '), ['no svg was returned']);
  const huge = `<svg viewBox="0 0 32 32">${'<rect fill="currentColor"/>'.repeat(400)}</svg>`;
  assert.match(validateLogoSvg(huge).join('; '), /over the .* limit/);
});

test('the black-blob failure mode is refused', () => {
  // What actually shipped once: a container rect filling the whole box, painted because the CSS
  // fill overrode the markup. Even with that CSS fixed, a FILLED full-bleed rect is a black square.
  const fullBleed = '<svg viewBox="0 0 32 32"><rect x="0" y="0" width="32" height="32" rx="8" fill="currentColor"/>'
    + '<path d="M20 10a8 8 0 1 0 0 12" fill="none" stroke="currentColor" stroke-width="3"/></svg>';
  assert.match(validateLogoSvg(fullBleed).join('; '), /solid square/);

  const fullCircle = '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="currentColor"/></svg>';
  assert.match(validateLogoSvg(fullCircle).join('; '), /solid blob/);

  // A shape with no fill of its own, under a root that does not declare fill="none", inherits black.
  const inherited = '<svg viewBox="0 0 32 32"><rect x="4" y="4" width="10" height="10" stroke="currentColor"/></svg>';
  assert.match(validateLogoSvg(inherited).join('; '), /inherits solid black/);

  // The same drawing as an outline is fine.
  const outlined = '<svg viewBox="0 0 32 32"><rect x="1.75" y="1.75" width="28.5" height="28.5" rx="8" fill="none" stroke="currentColor" stroke-width="2.5"/>'
    + '<path d="M20 10a8 8 0 1 0 0 12" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>';
  assert.deepEqual(validateLogoSvg(outlined), []);

  // Inheriting from a root that DOES declare fill="none" is legitimate.
  const inheritedNone = '<svg viewBox="0 0 32 32" fill="none"><rect x="2" y="2" width="28" height="28" rx="7" stroke="currentColor" stroke-width="2.5"/></svg>';
  assert.deepEqual(validateLogoSvg(inheritedNone), []);
});

test('the legibility budget is enforced, with the real failures as cases', () => {
  const box = (inner: string) => `<svg viewBox="0 0 32 32">${inner}</svg>`;
  const frame = '<rect x="2.5" y="2.5" width="27" height="27" rx="7" fill="none" stroke="currentColor" stroke-width="2.5"/>';

  // Two stroke widths in the same drawing — shipped in 3 of the first 6 real marks.
  const mixed = box(frame + '<path d="M19 22V10h7" fill="none" stroke="currentColor" stroke-width="2.8"/>');
  assert.match(validateLogoSvg(mixed).join('; '), /mixes stroke widths/);

  // The steam wisp: 1.5 x 4 units, about 3px at render size.
  const speck = box(frame + '<path d="M14 10c-1.5-1.5 1.5-2.5 0-4" fill="none" stroke="currentColor" stroke-width="2.5"/>');
  assert.match(validateLogoSvg(speck).join('; '), /disappears at 28px/);

  // Five shapes is a collage, not a mark.
  const crowded = box(frame
    + '<path d="M9 12a6 6 0 1 0 0 8" fill="none" stroke="currentColor" stroke-width="2.5"/>'
    + '<path d="M17 20V12h6" fill="none" stroke="currentColor" stroke-width="2.5"/>'
    + '<circle cx="24" cy="24" r="3" fill="none" stroke="currentColor" stroke-width="2.5"/>'
    + '<circle cx="8" cy="24" r="3" fill="none" stroke="currentColor" stroke-width="2.5"/>');
  assert.match(validateLogoSvg(crowded).join('; '), /too many for 28px/);

  // A motif hiding in a third of the box.
  const tiny = box('<circle cx="10" cy="10" r="5" fill="none" stroke="currentColor" stroke-width="2.5"/>');
  assert.match(validateLogoSvg(tiny).join('; '), /covers only/);

  // What the budget accepts: one idea, one width, filling the box.
  const good = box(frame + '<path d="M21 11a8 8 0 1 0 0 10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>');
  assert.deepEqual(validateLogoSvg(good), []);
});

test('the budget scales with the viewBox instead of assuming 32', () => {
  // Same drawing in a 64-unit box: the 12-unit shape is proportionally the same as 6 in 32.
  const svg = '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="5"/></svg>';
  assert.deepEqual(validateLogoSvg(svg), []);
});

test('markdown fences around the svg are stripped', () => {
  const sanitized = sanitizeGeneratedLogo({ svg: '```svg\n' + VALID_SVG + '\n```', notes: 'ok' });
  assert.ok(sanitized.ok, sanitized.error);
  assert.equal(sanitized.value?.svg.startsWith('<svg'), true);
  assert.equal(sanitized.value?.notes, 'ok');
});

test('a refused mark reports why instead of being written', () => {
  const sanitized = sanitizeGeneratedLogo({ svg: '<svg viewBox="0 0 32 32"><rect fill="#000"/></svg>' });
  assert.equal(sanitized.ok, false);
  assert.match(sanitized.error ?? '', /monochrome/);
});

// ── config write ───────────────────────────────────────────────────────────

test('the mark lands on the brand of the active header profile, keeping the rest', () => {
  const config = clientConfig({ title: 'Sample App', subtitle: 'Operations' });
  const written = applyLogoToBrand(config, { svg: VALID_SVG });
  const brand = (written.config as any).clientShell.regions.header.profiles.defaultAura.brand;

  assert.equal(written.profileName, 'defaultAura');
  assert.equal(written.replaced, false);
  assert.equal(brand.logoSvg, VALID_SVG);
  assert.equal(brand.title, 'Sample App', 'the title is not touched');
  assert.equal(brand.subtitle, 'Operations');
  // The input document is left alone.
  assert.equal(config.clientShell.regions.header.profiles.defaultAura.brand.logoSvg, undefined);
});

test('regenerating reports that it replaced the previous mark', () => {
  const first = applyLogoToBrand(clientConfig(), { svg: VALID_SVG });
  const second = applyLogoToBrand(first.config, { svg: VALID_SVG });
  assert.equal(second.replaced, true);
  assert.deepEqual(second.config, first.config, 'writing the same mark twice is idempotent');
});

test('a brand with no title yet gets the one from the request', () => {
  const written = applyLogoToBrand(clientConfig({}), { svg: VALID_SVG, brandTitle: 'Sample App' });
  assert.equal((written.config as any).clientShell.regions.header.profiles.defaultAura.brand.title, 'Sample App');
});

test('writing an invalid mark is refused before it reaches the config', () => {
  assert.throws(
    () => applyLogoToBrand(clientConfig(), { svg: '<svg viewBox="0 0 32 32"><rect fill="#000"/></svg>' }),
    /refusing to write an invalid mark/,
  );
});

test('a project with no header profile says what to do', () => {
  assert.throws(() => applyLogoToBrand({ clientShell: { mode: 'spa', regions: {} } }, { svg: VALID_SVG }), /run agentGenerateHeader first/);
  assert.throws(() => applyLogoToBrand(clientConfig(), { svg: VALID_SVG, profileName: 'nope' }), /does not exist \(available: defaultAura, studio\)/);
  assert.throws(() => applyLogoToBrand(undefined, { svg: VALID_SVG }), /config\.json not found/);
});

test('the configured brand title is discoverable, so the caller need not repeat it', () => {
  assert.equal(readBrandTitle(clientConfig()), 'Sample App');
  assert.equal(readBrandTitle(clientConfig(), 'studio'), '');
  assert.equal(readBrandTitle(undefined), '');
});
