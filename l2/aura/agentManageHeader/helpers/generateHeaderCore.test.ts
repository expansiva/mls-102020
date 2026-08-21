/// <mls fileReference="_102020_/l2/aura/agentManageHeader/helpers/generateHeaderCore.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildGenerateHeaderHumanPrompt,
  buildHeaderSource,
  findInventedRoutes,
  headerPaths,
  normalizeHeaderRequest,
  pointHeaderProfileAtProject,
  sanitizeGeneratedHeader,
  validateHeaderParts,
  type GeneratedHeaderParts,
} from '/_102020_/l2/aura/agentManageHeader/helpers/generateHeaderCore.js';
import { AURA_HEADER_HEIGHT_PX } from '/_102033_/l2/shared/layout/auraHeaderCore.js';

// Fictitious project/module: the fixtures must not depend on a real project in the workspace
// (a reference project can be renamed, republished or dropped at any time).
const PROJECT = 999999;

const validParts: GeneratedHeaderParts = {
  bandHtml: [
    '<div class="aura-header-side">',
    '  ${this.renderAsideToggle()}',
    '  ${this.renderBrand()}',
    '</div>',
    '<div class="aura-header-side app-header-right">',
    '  <span class="app-header-hint">${this.localized(messages).hint}</span>',
    '  ${this.renderActions()}',
    '</div>',
  ].join('\n'),
  bandCss: '${tag} .app-header-hint {\n  color: var(--ds-color-text-muted, #52606d);\n}',
  messages: { en: { hint: 'Shift open' }, pt: { hint: 'Turno aberto' } },
};

function withBandHtml(bandHtml: string): GeneratedHeaderParts {
  return { bandHtml };
}

// ── paths / tag ────────────────────────────────────────────────────────────

test('paths and tag follow the convertFileToTag rule', () => {
  const paths = headerPaths(PROJECT);
  assert.equal(paths.fileReference, '_999999_/l2/layout/appHeader.ts');
  assert.equal(paths.source, 'l2/layout/appHeader.ts');
  assert.equal(paths.entrypoint, '/_999999_/l2/layout/appHeader.js');
  assert.equal(paths.tag, 'layout--app-header-999999');
  assert.equal(paths.className, 'AppHeader999999');
});

// ── request ────────────────────────────────────────────────────────────────

test('the entry needs a project and something to design from', () => {
  assert.throws(() => normalizeHeaderRequest('nope'), /JSON object/);
  assert.throws(() => normalizeHeaderRequest({ brief: 'x' }), /projectId/);
  assert.throws(() => normalizeHeaderRequest({ projectId: PROJECT }), /brief and\/or a brand.title/);
  assert.ok(normalizeHeaderRequest({ projectId: PROJECT, brand: { title: 'Sample App' } }));
});

test('unknown actions and tokens are dropped, the canonical order is kept', () => {
  const req = normalizeHeaderRequest({
    projectId: PROJECT,
    brief: 'clean and warm',
    actions: ['user', 'language', 'teleport'],
    tokens: ['--ds-color-nav-bg', 'nav-bg'],
    navigation: [{ label: 'Items', href: '/sampleModule/items' }, { label: '', href: '/x' }],
  });
  assert.deepEqual(req.actions, ['language', 'user']);
  assert.deepEqual(req.tokens, ['--ds-color-nav-bg']);
  assert.deepEqual(req.navigation, [{ label: 'Items', href: '/sampleModule/items' }]);
  assert.equal(req.commit, false);
});

test('the prompt says which actions the base covers and which the model must render', () => {
  const prompt = buildGenerateHeaderHumanPrompt(normalizeHeaderRequest({
    projectId: PROJECT,
    brand: { title: 'Sample App' },
    actions: ['language', 'user'],
  }));
  assert.match(prompt, /Actions provided by the base[^\n]*language/);
  assert.match(prompt, /Actions YOU must render[^\n]*user/);
  assert.match(prompt, /layout--app-header-999999/);
});

// ── validation ─────────────────────────────────────────────────────────────

test('contract-compliant parts pass', () => {
  assert.deepEqual(validateHeaderParts(validParts), []);
});

test('the mobile aside toggle is mandatory', () => {
  const errors = validateHeaderParts(withBandHtml('<div class="aura-header-side">${this.renderBrand()}</div>'));
  assert.ok(errors.some((error) => error.includes('renderAsideToggle')), errors.join('; '));
});

test('the element plumbing is off limits', () => {
  for (const forbidden of [
    'createRenderRoot() { return this; } ${this.renderAsideToggle()}',
    '${this.renderAsideToggle()} <div>${this.attachShadow({mode:"open"})}</div>',
    "${this.renderAsideToggle()}<style>.x{}</style>",
    "import { html } from 'lit';\n${this.renderAsideToggle()}",
  ]) {
    assert.ok(validateHeaderParts(withBandHtml(forbidden)).length > 0, `accepted: ${forbidden}`);
  }
});

test('navigation must go through the shell protocol', () => {
  const rawHref = validateHeaderParts(withBandHtml('${this.renderAsideToggle()}<a href="/sampleModule/items">Items</a>'));
  assert.ok(rawHref.some((error) => error.includes('handleNavigate')), rawHref.join('; '));

  const location = validateHeaderParts(withBandHtml('${this.renderAsideToggle()}<button @click=${() => window.location.assign("/x")}>x</button>'));
  assert.ok(location.some((error) => error.includes('window.location')), location.join('; '));

  assert.deepEqual(
    validateHeaderParts(
      withBandHtml('${this.renderAsideToggle()}<a href="/sampleModule" @click=${this.handleNavigate}>Home</a>'),
      { allowedHrefs: ['/sampleModule'] },
    ),
    [],
  );
});

test('a route the model invented is rejected (the /profile button that shipped once)', () => {
  const invented = validateHeaderParts(withBandHtml(
    "${this.renderAsideToggle()}<button @click=${() => this.navigateTo('/profile')}>Perfil</button>",
  ), { allowedHrefs: ['/sampleModule'] });
  assert.ok(invented.some((error) => error.includes('"/profile"')), invented.join('; '));

  // An action with no route goes through the event instead ('user' is the base's avatar, so the
  // example is 'search' — the one action a header still renders itself).
  assert.deepEqual(
    validateHeaderParts(withBandHtml(
      "${this.renderAsideToggle()}${this.hasAction('search') ? html`<button @click=${() => this.emitHeaderAction('search')}>s</button>` : nothing}",
    )),
    [],
  );
});

test('invented routes are found in hrefs and in navigateTo alike', () => {
  assert.deepEqual(findInventedRoutes('<a href="/a">a</a> ${this.navigateTo("/b")}', ['/a']), ['/b']);
  assert.deepEqual(findInventedRoutes('<a href=${entry.href}>x</a>'), [], 'a binding is not a literal route');
  assert.deepEqual(findInventedRoutes('<a href="https://x.dev/y">x</a>'), [], 'external links are not routes');
});

test('colors must go through a DS role token', () => {
  const inHtml = validateHeaderParts(withBandHtml('${this.renderAsideToggle()}<span style="color:#ff0000">x</span>'));
  assert.ok(inHtml.some((error) => error.includes('literal color')), inHtml.join('; '));

  const inCss = validateHeaderParts({ ...validParts, bandCss: '${tag} .x { color: #ff0000; }' });
  assert.ok(inCss.some((error) => error.includes('literal color')), inCss.join('; '));

  assert.deepEqual(validateHeaderParts({ ...validParts, bandCss: '${tag} .x { color: var(--ds-color-nav-text, #102a43); }' }), []);
});

test('every CSS rule is scoped by the tag placeholder', () => {
  const unscoped = validateHeaderParts({ ...validParts, bandCss: '.app-header-hint { gap: 4px; }' });
  assert.ok(unscoped.some((error) => error.includes('must be scoped')), unscoped.join('; '));

  const rootScoped = validateHeaderParts({ ...validParts, bandCss: ':root { --x: 1px; }' });
  assert.ok(rootScoped.some((error) => error.includes('must be scoped')), rootScoped.join('; '));

  // Rules nested in an at-rule are checked too, and the at-rule prelude itself is allowed.
  assert.deepEqual(
    validateHeaderParts({ ...validParts, bandCss: '@media (max-width: 768px) {\n  ${tag} .app-header-hint { display: none; }\n}' }),
    [],
  );
  const nestedUnscoped = validateHeaderParts({ ...validParts, bandCss: '@media (max-width: 768px) {\n  .app-header-hint { display: none; }\n}' });
  assert.ok(nestedUnscoped.some((error) => error.includes('must be scoped')), nestedUnscoped.join('; '));
});

test('animation is allowed: keyframe steps are not selectors', () => {
  const css = [
    '${tag} .app-header-hint {',
    '  animation: app-header-pulse 2s ease-in-out infinite;',
    '}',
    '@keyframes app-header-pulse {',
    '  from { opacity: 0.6; }',
    '  50% { opacity: 1; }',
    '  to { opacity: 0.6; }',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    '  ${tag} .app-header-hint { animation: none; }',
    '}',
  ].join('\n');
  assert.deepEqual(validateHeaderParts({ ...validParts, bandCss: css }), []);

  // A real selector next to the keyframes still needs the tag.
  const loose = ['@keyframes x {', '  from { opacity: 0; }', '}', '.loose { opacity: 1; }'].join('\n');
  assert.match(validateHeaderParts({ ...validParts, bandCss: loose }).join('; '), /must be scoped/);
});

test('the band height and fixed positioning belong to the shell', () => {
  const hostHeight = validateHeaderParts({ ...validParts, bandCss: '${tag} {\n  height: 80px;\n}' });
  assert.ok(hostHeight.some((error) => error.includes('height on the host rule')), hostHeight.join('; '));

  const fixed = validateHeaderParts({ ...validParts, bandCss: '${tag} .app-header-hint { position: fixed; }' });
  assert.ok(fixed.some((error) => error.includes('position: fixed')), fixed.join('; '));

  // A height on an inner part is legitimate (a logo, a divider).
  assert.deepEqual(validateHeaderParts({ ...validParts, bandCss: '${tag} .app-header-hint { height: 20px; }' }), []);
});

test('unbalanced backticks would break the assembled file', () => {
  const errors = validateHeaderParts(withBandHtml('${this.renderAsideToggle()} ${items.map((item) => html`<b>${item}</b>)}'));
  assert.ok(errors.some((error) => error.includes('unbalanced backtick')), errors.join('; '));
});

test('the i18n block must be complete and actually used', () => {
  const missingBlock = validateHeaderParts(withBandHtml('${this.renderAsideToggle()}<span>${this.localized(messages).hint}</span>'));
  assert.ok(missingBlock.some((error) => error.includes('no messages block')), missingBlock.join('; '));

  const mismatched = validateHeaderParts({ ...validParts, messages: { en: { hint: 'Shift open' }, pt: { dica: 'Turno aberto' } } });
  assert.ok(mismatched.some((error) => error.includes('same keys')), mismatched.join('; '));

  const unused = validateHeaderParts({ ...withBandHtml('${this.renderAsideToggle()}'), messages: { en: { hint: 'x' } } });
  assert.ok(unused.some((error) => error.includes('never reads')), unused.join('; '));
});

// ── assembly ───────────────────────────────────────────────────────────────

test('the assembled source carries the skeleton the model never writes', () => {
  const source = buildHeaderSource(PROJECT, validParts);
  assert.match(source, /^\/\/\/ <mls fileReference="_999999_\/l2\/layout\/appHeader\.ts"/u);
  assert.match(source, /import \{ html \} from 'lit';/u);
  assert.match(source, /import \{ AuraHeaderBase \} from '\/_102033_\/l2\/shared\/layout\/aura-header-base\.js';/u);
  assert.match(source, /export class AppHeader999999 extends AuraHeaderBase \{/u);
  assert.match(source, /customElements\.define\('layout--app-header-999999', AppHeader999999\);/u);
  assert.match(source, /protected renderBand\(\) \{/u);
  assert.match(source, /protected bandCss\(\): string \{\n {4}const tag = this\.localName;/u);
  assert.match(source, /\/\/\/ \*\*collab_i18n_start\*\*/u);
  assert.match(source, /const message_en = \{/u);
  assert.match(source, /\/\/\/ \*\*collab_i18n_end\*\*/u);
});

test('nothing is imported only when used, and bandCss is omitted when empty', () => {
  const bare = buildHeaderSource(PROJECT, withBandHtml('${this.renderAsideToggle()}'));
  assert.match(bare, /import \{ html \} from 'lit';/u);
  assert.equal(bare.includes('bandCss'), false);

  const withNothing = buildHeaderSource(PROJECT, withBandHtml('${this.renderAsideToggle()}${false ? html`<b></b>` : nothing}'));
  assert.match(withNothing, /import \{ html, nothing \} from 'lit';/u);
});

test('markdown fences around the fragments are stripped', () => {
  const sanitized = sanitizeGeneratedHeader({
    bandHtml: '```html\n${this.renderAsideToggle()}\n```',
    bandCss: '```css\n${tag} .x { gap: 4px; }\n```',
  }, { projectId: PROJECT });

  assert.ok(sanitized.ok, sanitized.error);
  assert.equal(sanitized.value?.source.includes('```'), false);
  assert.equal(sanitized.value?.paths.tag, 'layout--app-header-999999');
});

// ── l5/config.json ─────────────────────────────────────────────────────────

/** Shape a client config has in practice: defaultAura + studio, plus a project-owned aside. */
function clientConfig() {
  return {
    defaultProjectId: '999999',
    clientShell: {
      mode: 'spa',
      activeProfile: 'production',
      regions: {
        header: {
          activeProfile: 'defaultAura',
          switchWithoutRouteReload: true,
          profiles: {
            defaultAura: {
              renderer: {
                entrypoint: '/_102033_/l2/shared/layout/aura-header.js',
                source: '../mls-102033/l2/shared/layout/aura-header.ts',
                tag: 'collab-aura-header',
              },
              heightPx: AURA_HEADER_HEIGHT_PX,
            },
            studio: {
              renderer: { entrypoint: '/_102033_/l2/cbe/studioHeader.js', tag: 'collab-cbe-studio-header' },
              heightPx: AURA_HEADER_HEIGHT_PX,
            },
          },
        },
        aside: { activeProfile: 'messages', profiles: { messages: { renderer: { entrypoint: '/x.js', tag: 'x-aside' }, widthPx: 400 } } },
      },
    },
  };
}

test('defaultAura is repointed at the project header, and nothing else moves', () => {
  const config = clientConfig();
  const written = pointHeaderProfileAtProject(config, {
    paths: headerPaths(PROJECT),
    brand: { title: 'Sample App' },
    actions: ['language'],
  });

  const header = (written.config as any).clientShell.regions.header;
  assert.equal(written.profileName, 'defaultAura');
  assert.equal(written.previousTag, 'collab-aura-header');
  assert.equal(header.activeProfile, 'defaultAura');
  assert.deepEqual(header.profiles.defaultAura.renderer, {
    entrypoint: '/_999999_/l2/layout/appHeader.js',
    source: 'l2/layout/appHeader.ts',
    tag: 'layout--app-header-999999',
  });
  assert.equal(header.profiles.defaultAura.heightPx, AURA_HEADER_HEIGHT_PX);
  assert.deepEqual(header.profiles.defaultAura.brand, { title: 'Sample App' });
  assert.deepEqual(header.profiles.defaultAura.props, { actions: ['language'] });

  // The studio profile and the aside are untouched (Ctrl+Alt+S keeps working).
  assert.equal(header.profiles.studio.renderer.tag, 'collab-cbe-studio-header');
  assert.equal((written.config as any).clientShell.regions.aside.profiles.messages.widthPx, 400);
  assert.equal(header.switchWithoutRouteReload, true);
});

test('the input config document is not mutated', () => {
  const config = clientConfig();
  pointHeaderProfileAtProject(config, { paths: headerPaths(PROJECT) });
  assert.equal(config.clientShell.regions.header.profiles.defaultAura.renderer.tag, 'collab-aura-header');
});

test('regenerating without a brand clears the stale one', () => {
  const first = pointHeaderProfileAtProject(clientConfig(), { paths: headerPaths(PROJECT), brand: { title: 'Sample App' }, actions: ['language'] });
  const second = pointHeaderProfileAtProject(first.config, { paths: headerPaths(PROJECT) });
  const profile = (second.config as any).clientShell.regions.header.profiles.defaultAura;
  assert.equal(profile.brand, undefined);
  assert.equal(profile.props?.actions, undefined);
});

test('another profile can be targeted, and it becomes the active one', () => {
  const written = pointHeaderProfileAtProject(clientConfig(), { paths: headerPaths(PROJECT), profileName: 'app' });
  const header = (written.config as any).clientShell.regions.header;
  assert.equal(header.activeProfile, 'app');
  assert.deepEqual(Object.keys(header.profiles).sort(), ['app', 'defaultAura', 'studio']);
  assert.equal(written.previousTag, undefined);
  assert.equal(header.profiles.defaultAura.renderer.tag, 'collab-aura-header');
});

test('a config with no header region gets one', () => {
  const written = pointHeaderProfileAtProject({ clientShell: { mode: 'spa', regions: {} } }, { paths: headerPaths(PROJECT) });
  const header = (written.config as any).clientShell.regions.header;
  assert.equal(header.activeProfile, 'defaultAura');
  assert.equal(header.profiles.defaultAura.renderer.tag, 'layout--app-header-999999');
  assert.equal(header.profiles.defaultAura.heightPx, AURA_HEADER_HEIGHT_PX);
});

test('a missing config.json is an error, not a silent no-op', () => {
  assert.throws(() => pointHeaderProfileAtProject(undefined, { paths: headerPaths(PROJECT) }), /config\.json not found/);
});

test('pointing twice is idempotent', () => {
  const options = { paths: headerPaths(PROJECT), brand: { title: 'Sample App' }, actions: ['language' as const] };
  const first = pointHeaderProfileAtProject(clientConfig(), options);
  const second = pointHeaderProfileAtProject(first.config, options);
  assert.deepEqual(second.config, first.config);
});

test('navigation links are opt-in, and off by default', () => {
  const base = { projectId: PROJECT, brand: { title: 'Sample App' } };
  assert.equal(normalizeHeaderRequest(base).navLinks, false);
  assert.equal(normalizeHeaderRequest({ ...base, navLinks: true }).navLinks, true);
  assert.equal(normalizeHeaderRequest({ ...base, navLinks: 'yes' }).navLinks, false);

  const withLinks = withBandHtml('${this.renderAsideToggle()}${this.renderNavLinks()}');
  assert.match(validateHeaderParts(withLinks).join('; '), /navLinks is off/);
  assert.deepEqual(validateHeaderParts(withLinks, { allowNavLinks: true }), []);

  // renderActions() may carry module links, so it is gated the same way.
  const withModuleLinks = withBandHtml('${this.renderAsideToggle()}${this.renderModuleLinks()}');
  assert.match(validateHeaderParts(withModuleLinks).join('; '), /navLinks is off/);
});

test('with links off the model is told so, and gets no routes to link', () => {
  const off = buildGenerateHeaderHumanPrompt(normalizeHeaderRequest({
    projectId: PROJECT,
    brand: { title: 'Sample App' },
    navigation: [{ label: 'Items', href: '/sampleModule/items' }],
  }));
  assert.match(off, /NO navigation links/);
  assert.equal(off.includes('/sampleModule/items'), false);

  const on = buildGenerateHeaderHumanPrompt(normalizeHeaderRequest({
    projectId: PROJECT,
    brand: { title: 'Sample App' },
    navLinks: true,
    navigation: [{ label: 'Items', href: '/sampleModule/items' }],
  }));
  assert.match(on, /render them with this\.renderNavLinks\(\)/);
  assert.match(on, /Items/);
});

test('with links off, a route in the band is refused even if the project has it', () => {
  const request = normalizeHeaderRequest({
    projectId: PROJECT,
    brand: { title: 'Sample App' },
    navigation: [{ label: 'Items', href: '/sampleModule/items' }],
  });
  const sanitized = sanitizeGeneratedHeader({
    bandHtml: '${this.renderAsideToggle()}<a href="/sampleModule/items" @click=${this.handleNavigate}>Items</a>',
  }, request);
  assert.equal(sanitized.ok, false);
  assert.match(sanitized.error ?? '', /not one of the project/);
});

test('the logo intent defaults to keep, and only accepts the two explicit modes', () => {
  const base = { projectId: PROJECT, brand: { title: 'Sample App' } };
  assert.equal(normalizeHeaderRequest(base).logo, 'keep');
  assert.equal(normalizeHeaderRequest({ ...base, logo: 'draw it' }).logo, 'keep');
  assert.equal(normalizeHeaderRequest({ ...base, logo: 'generate', logoStyle: 'mark', logoBrief: 'cup' }).logo, 'generate');
  assert.equal(normalizeHeaderRequest({ ...base, logo: 'none' }).logo, 'none');
  const req = normalizeHeaderRequest({ ...base, logo: 'generate', logoStyle: 'mark', logoBrief: 'cup and bean' });
  assert.equal(req.logoStyle, 'mark');
  assert.equal(req.logoBrief, 'cup and bean');
});

test('regenerating the header keeps the mark the logo agent drew', () => {
  const svg = '<svg viewBox="0 0 32 32"><rect fill="currentColor" width="8" height="8"/></svg>';
  const withMark = clientConfig();
  (withMark as any).clientShell.regions.header.profiles.defaultAura.brand = { title: 'Sample App', logoSvg: svg };

  const again = pointHeaderProfileAtProject(withMark, {
    paths: headerPaths(PROJECT),
    brand: { title: 'Sample App', subtitle: 'Operations' },
  });
  const brand = (again.config as any).clientShell.regions.header.profiles.defaultAura.brand;
  assert.equal(brand.logoSvg, svg, 'the mark belongs to the logo agent, not to the header request');
  assert.equal(brand.subtitle, 'Operations', 'the rest of the brand still comes from the request');

  // dropLogo is the explicit way out.
  const dropped = pointHeaderProfileAtProject(withMark, {
    paths: headerPaths(PROJECT),
    brand: { title: 'Sample App' },
    dropLogo: true,
  });
  assert.equal((dropped.config as any).clientShell.regions.header.profiles.defaultAura.brand.logoSvg, undefined);
});

test('a brand-less regeneration still keeps the mark', () => {
  const svg = '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="8" fill="currentColor"/></svg>';
  const withMark = clientConfig();
  (withMark as any).clientShell.regions.header.profiles.defaultAura.brand = { title: 'Sample App', logoSvg: svg };

  const again = pointHeaderProfileAtProject(withMark, { paths: headerPaths(PROJECT) });
  const brand = (again.config as any).clientShell.regions.header.profiles.defaultAura.brand;
  assert.equal(brand.logoSvg, svg);
  assert.equal(brand.title, undefined, 'a brand the request omits is not invented');
});

test('a contract violation is reported instead of written', () => {
  const sanitized = sanitizeGeneratedHeader({ bandHtml: '<div>${this.renderBrand()}</div>' }, { projectId: PROJECT });
  assert.equal(sanitized.ok, false);
  assert.match(sanitized.error ?? '', /renderAsideToggle/);
  assert.equal(sanitized.value, undefined);
});

test('inlining the mark by hand is refused with the working alternative', () => {
  // What a real generation produced: svg`${this.brand.logoSvg}` renders nothing, because a lit
  // template interpolates a string as TEXT and the fragment cannot import a directive.
  const byHand = withBandHtml('${this.renderAsideToggle()}${this.brand.logoSvg ? svg`${this.brand.logoSvg}` : \'\'}');
  const errors = validateHeaderParts(byHand);
  assert.match(errors.join('; '), /this\.renderLogo\(\)/);
  assert.match(errors.join('; '), /logoSvg/);

  // The supported way passes.
  assert.deepEqual(validateHeaderParts(withBandHtml('${this.renderAsideToggle()}${this.renderLogo()}')), []);
});

test('a hand-rolled user button is refused (it loses the fallback and the menu)', () => {
  // What a real generation shipped: an empty span while the session had not answered, and a click
  // that only fired the event — no silhouette, no identity panel.
  const handRolled = withBandHtml(
    '${this.renderAsideToggle()}'
    + "<button @click=${() => this.emitHeaderAction('user')}>"
    + "<span>${(this.userFirstName || this.userName || '').slice(0, 1).toUpperCase()}</span></button>",
  );
  const errors = validateHeaderParts(handRolled).join('; ');
  assert.match(errors, /renderUserAvatar/);
  assert.match(errors, /avatar initial by hand/);

  // The supported way, and a greeting that reads fine while the session loads.
  assert.deepEqual(
    validateHeaderParts(withBandHtml(
      '${this.renderAsideToggle()}'
      + '<span>${this.userFirstName ? this.userFirstName : nothing}</span>'
      + '${this.renderUserAvatar()}',
    )),
    [],
  );

  // Another action with no runtime still goes through the event.
  assert.deepEqual(
    validateHeaderParts(withBandHtml("${this.renderAsideToggle()}<button @click=${() => this.emitHeaderAction('search')}>s</button>")),
    [],
  );
});
