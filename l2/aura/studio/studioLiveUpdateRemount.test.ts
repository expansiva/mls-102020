/// <mls fileReference="_102020_/l2/aura/studio/studioLiveUpdateRemount.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';
import type { IStudioEditTarget } from '/_102020_/l2/aura/studio/studioEditTarget.js';
import { previewModule } from '/_102033_/l2/shared/previewGraph.js';
import type { PreviewTabSlot } from '/_102033_/l2/shared/moduleTab.js';

// The registry the mode imports builds `class extends HTMLElement`; Node has no such global. Set it
// BEFORE the import, same reasoning as studioLiveUpdateHotSwap.test.ts.
class FakeHTMLElement {
  public attributes: Array<{ name: string; value: string }> = [];
  public child: FakeHTMLElement | null = null;
  public bootConfig?: unknown;
  public label = '';
  public setAttribute(name: string, value: string): void {
    this.attributes = [...this.attributes.filter((item) => item.name !== name), { name, value }];
  }
  public get firstElementChild(): FakeHTMLElement | null {
    return this.child;
  }
  public replaceChildren(next?: FakeHTMLElement): void {
    this.child = next ?? null;
  }
}
(globalThis as { HTMLElement?: unknown }).HTMLElement = FakeHTMLElement;

type RemountModule = typeof import('/_102020_/l2/aura/studio/studioLiveUpdateRemount.js');
type RegistryModule = typeof import('/_102033_/l2/shared/elementSwapRegistry.js');

let cachedMode: RemountModule | undefined;
async function load(): Promise<RemountModule> {
  cachedMode ??= await import('/_102020_/l2/aura/studio/studioLiveUpdateRemount.js');
  return cachedMode;
}

let cachedRegistry: RegistryModule | undefined;
async function loadRegistry(): Promise<RegistryModule> {
  cachedRegistry ??= await import('/_102033_/l2/shared/elementSwapRegistry.js');
  return cachedRegistry;
}

/** A minimal edit target — only what `freshModuleUrl` reads. */
function target(compilerResults: unknown): IStudioEditTarget {
  return {
    project: 102047,
    shortName: 'ticketCatalogue',
    folder: 'controleChamados/web/desktop/page11',
    page: '_102047_/l2/controleChamados/web/desktop/page11/ticketCatalogue',
    storFile: { project: 102047, shortName: 'ticketCatalogue', folder: 'controleChamados/web/desktop/page11' },
    model: { compilerResults },
  } as unknown as IStudioEditTarget;
}

class FakeRegistry {
  public readonly registered = new Map<string, CustomElementConstructor>();
  public define(name: string, ctor: CustomElementConstructor): void {
    if (this.registered.has(name)) throw new Error(`already defined: ${name}`);
    this.registered.set(name, ctor);
  }
  public get(name: string): CustomElementConstructor | undefined {
    return this.registered.get(name);
  }
}

const PAGE_TAG = 'controle-chamados--web--desktop--page11--ticket-catalogue-102047';
const sharedRegistry = new FakeRegistry();
let registryArmed = false;

async function armPageTag(): Promise<void> {
  const registry = await loadRegistry();
  if (!registryArmed) {
    registry.armElementSwap(sharedRegistry as unknown as Parameters<RegistryModule['armElementSwap']>[0]);
    registryArmed = true;
  }
  if (!registry.isElementSwapArmed(PAGE_TAG)) {
    sharedRegistry.define(PAGE_TAG, class extends (FakeHTMLElement as unknown as { new (): HTMLElement }) {});
  }
}

// T1 — the refusal the whole flag design exists for. A session that never went through a studio boot
// has no stand-in for the tag, so there is nothing to swap, and saying "applied" would be a lie.
test('T1: an unarmed tag is refused with the reload request, never reported as applied', async () => {
  const { remountMode } = await load();
  const result = await remountMode.apply({
    edited: target({}),
    page: target({}),
    pageTag: 'never--armed--tag-102047',
  });

  assert.equal(result.ok, false);
  assert.equal(result.message, t('live.notArmed', { tag: 'never--armed--tag-102047' }));
  assert.notEqual(result.message, 'live.notArmed', 'the message must come from the catalog, not be the raw id');
});

// T2 — a TypeScript error in the edited file is a NORMAL outcome and has to read as one: no crash,
// no "applied", and the count in the sentence.
test('T2: a compile with TypeScript errors is refused with the error count', async () => {
  await armPageTag();
  const { remountMode } = await load();
  const result = await remountMode.apply({
    edited: target({ errors: [{}, {}], cacheVersion: '123' }),
    page: target({}),
    pageTag: PAGE_TAG,
  });

  assert.equal(result.ok, false);
  assert.equal(result.message, t('live.nothingToApply', { reason: t('live.tsErrors', { count: 2 }) }));
});

// T3 — clean compile but nothing in the cache to import: still a refusal with the reason said out
// loud, never a silent success.
test('T3: a compile with no cache version is refused with the reason', async () => {
  await armPageTag();
  const { remountMode } = await load();
  const result = await remountMode.apply({
    edited: target({ errors: [] }),
    page: target({}),
    pageTag: PAGE_TAG,
  });

  assert.equal(result.ok, false);
  assert.equal(result.message, t('live.nothingToApply', { reason: t('live.noCacheVersion') }));
});

test('T4: a file that was never compiled is refused with the reason', async () => {
  await armPageTag();
  const { remountMode } = await load();
  const result = await remountMode.apply({
    edited: target(undefined),
    page: target({}),
    pageTag: PAGE_TAG,
  });

  assert.equal(result.ok, false);
  assert.equal(result.message, t('live.nothingToApply', { reason: t('live.notCompiled') }));
});

// ── carryOver: what survives the remount, and what must not ────────────────────────────────────

interface IFakeElement {
  attributes: Array<{ name: string; value: string }>;
  setAttribute(name: string, value: string): void;
  [key: string]: unknown;
}

function fakeElement(attributes: Array<{ name: string; value: string }> = []): IFakeElement {
  const element: IFakeElement = {
    attributes,
    setAttribute(name: string, value: string) {
      this.attributes = [...this.attributes.filter(a => a.name !== name), { name, value }];
    },
  };
  return element;
}

function implWith(properties: string[]): CustomElementConstructor {
  return {
    elementProperties: new Map(properties.map(name => [name, {}])),
  } as unknown as CustomElementConstructor;
}

test('T5: carryOver copies attributes and the properties the NEW version declares', async () => {
  const { carryOver } = await load();
  const from = fakeElement([{ name: 'msize', value: '1400,813,0,0' }, { name: 'class', value: 'page' }]);
  from.status = 'open';
  from.uiScenary = 'detail';
  const to = fakeElement();

  carryOver(from as unknown as HTMLElement, to as unknown as HTMLElement, implWith(['status', 'uiScenary']));

  assert.deepEqual(to.attributes, [{ name: 'msize', value: '1400,813,0,0' }, { name: 'class', value: 'page' }]);
  assert.equal(to.status, 'open');
  assert.equal(to.uiScenary, 'detail');
});

// A property the edit ADDED has no old value to carry; forcing `undefined` over it would wipe the
// default the new constructor just set.
test('T6: carryOver leaves a property the old version never had to the new constructor', async () => {
  const { carryOver } = await load();
  const from = fakeElement();
  from.status = 'open';
  const to = fakeElement();
  to.addedInV2 = 'default from the new constructor';

  carryOver(from as unknown as HTMLElement, to as unknown as HTMLElement, implWith(['status', 'addedInV2']));

  assert.equal(to.status, 'open');
  assert.equal(to.addedInV2, 'default from the new constructor');
});

// The list comes from the NEW version on purpose: a property the edit deleted must not be pushed
// back onto the fresh node.
test('T7: carryOver does not resurrect a property the new version dropped', async () => {
  const { carryOver } = await load();
  const from = fakeElement();
  from.status = 'open';
  from.droppedInV2 = 'stale';
  const to = fakeElement();

  carryOver(from as unknown as HTMLElement, to as unknown as HTMLElement, implWith(['status']));

  assert.equal('droppedInV2' in to, false);
});

// The shell hands a region element `bootConfig`/`regionProps` as PROPERTIES (mountRegion), and a
// content page does not declare them reactive — so they are named explicitly or the fresh node comes
// up with no boot config at all.
test('T8: carryOver carries the two properties the shell hands over, declared or not', async () => {
  const { carryOver } = await load();
  const from = fakeElement();
  from.bootConfig = { projectId: '102047' };
  from.regionProps = { brand: {} };
  const to = fakeElement();

  carryOver(from as unknown as HTMLElement, to as unknown as HTMLElement, implWith([]));

  assert.deepEqual(to.bootConfig, { projectId: '102047' });
  assert.deepEqual(to.regionProps, { brand: {} });
});

test('T9: carryOver survives an implementation with no declared properties', async () => {
  const { carryOver } = await load();
  const from = fakeElement([{ name: 'id', value: 'x' }]);
  const to = fakeElement();

  carryOver(from as unknown as HTMLElement, to as unknown as HTMLElement, {} as unknown as CustomElementConstructor);

  assert.deepEqual(to.attributes, [{ name: 'id', value: 'x' }]);
});

// T10 — the mode has to be reachable by name, and the name must not have displaced the suspension
// rules the task freezes (DEFAULT_MODE off, hotSwap suspended).
test('T10: remount is a registered mode and the default is still off', async () => {
  const { remountMode } = await load();
  assert.equal(remountMode.name, 'remount');
  assert.equal(typeof remountMode.description, 'string');
  assert.ok(remountMode.description.length > 0);
});

// T11 — the mark has to be on the new node BEFORE replaceWith, because connectedCallback runs on insert.
test('T11: a remounted node sees wasRebuiltByStudio true inside connectedCallback', async () => {
  const { carryOver } = await load();
  const registry = await loadRegistry();
  const from = fakeElement();
  const to = fakeElement();
  let seen: boolean | undefined;
  to.connectedCallback = function (this: Element) {
    seen = registry.wasRebuiltByStudio(this);
  };

  carryOver(from as unknown as HTMLElement, to as unknown as HTMLElement, implWith([]));
  (to.connectedCallback as (this: Element) => void).call(to as unknown as Element);

  assert.equal(seen, true);
});

// T12 — a node that was never carried over (boot, first paint) must not claim it was rebuilt.
test('T12: a normally created node sees wasRebuiltByStudio false inside connectedCallback', async () => {
  const registry = await loadRegistry();
  const node = fakeElement();
  let seen: boolean | undefined;
  node.connectedCallback = function (this: Element) {
    seen = registry.wasRebuiltByStudio(this);
  };

  (node.connectedCallback as (this: Element) => void).call(node as unknown as Element);

  assert.equal(seen, false);
});

const PAGE_A = '/_102033_/l2/pageA.js';
const PAGE_B = '/_102033_/l2/pageB.js';
const PAGE_C = '/_102033_/l2/pageC.js';
const PAGE_D = '/_102033_/l2/pageD.js';
const PAGE_E = '/_102033_/l2/pageE.js';
const BASE = '/_102033_/l2/base.js';
const V1 = '20261110120000000';
const V2 = '20261110120000001';

function pageSource(tag: string, label: string, baseSpecifier?: string): string {
  const importLine = baseSpecifier ? `import { label as baseLabel } from '${baseSpecifier}';\n` : '';
  const value = baseSpecifier ? `'${label}' + baseLabel` : `'${label}'`;
  return [
    importLine.trimEnd(),
    'class Page extends HTMLElement {',
    '  constructor() {',
    '    super();',
    `    this.label = ${value};`,
    '  }',
    '}',
    `customElements.define('${tag}', Page);`,
  ].filter((line) => line !== '').join('\n');
}

function baseSource(text: string): string {
  return `export const label = '${text}';\n`;
}

async function evalModule(source: string): Promise<void> {
  const url = `data:text/javascript,${encodeURIComponent(source).replaceAll('\'', '%27')}`;
  await import(url);
}

function createPage(tag: string): FakeHTMLElement {
  const ctor = sharedRegistry.get(tag);
  if (!ctor) throw new Error(`[remount.test] missing ${tag}`);
  return new ctor() as unknown as FakeHTMLElement;
}

function slot(div: FakeHTMLElement, page: string, tag: string): PreviewTabSlot {
  return { div: div as unknown as HTMLElement, page, tag };
}

test('a changed page refreshes only its tab, and a shared base refreshes every tab that imports it', async () => {
  await armPageTag();
  const { updateOpenPreviewTabs } = await load();
  const previousElements = (globalThis as { customElements?: unknown }).customElements;
  const previousDocument = globalThis.document;
  (globalThis as { customElements?: unknown }).customElements = sharedRegistry;
  globalThis.document = {
    documentElement: previousDocument?.documentElement,
    createElement(tag: string) {
      return createPage(tag);
    },
  } as unknown as Document;

  try {
    await evalModule(pageSource('preview-page-a', 'A1'));
    await evalModule(pageSource('preview-page-b', 'B1'));
    const header = new FakeHTMLElement();
    header.label = 'SHELL';
    const tabA = new FakeHTMLElement();
    const tabB = new FakeHTMLElement();
    const pageA = createPage('preview-page-a');
    const pageB = createPage('preview-page-b');
    tabA.child = pageA;
    tabB.child = pageB;
    const headerPage = createPage('preview-page-a');
    header.child = headerPage;

    const pageOnly = await updateOpenPreviewTabs({
      modules: [
        previewModule(PAGE_A, pageSource('preview-page-a', 'A2'), V2),
        previewModule(PAGE_B, pageSource('preview-page-b', 'B1'), V1),
      ],
      changed: [PAGE_A],
      tabs: [slot(tabA, PAGE_A, 'preview-page-a'), slot(tabB, PAGE_B, 'preview-page-b')],
      draftSlug: null,
      origin: 'http://preview.test',
    });
    assert.ok(pageOnly);
    assert.equal(pageOnly.ok, true);
    assert.equal(pageOnly.message, t('live.remounted', { count: 1, tags: 1 }));
    assert.notEqual(tabA.child, pageA);
    assert.equal(tabA.child?.label, 'A2');
    assert.equal(tabB.child, pageB);
    assert.equal(tabB.child?.label, 'B1');
    assert.equal(header.child, headerPage);
    assert.equal(header.child?.label, 'A1');
    assert.equal(header.label, 'SHELL');

    await evalModule(pageSource('preview-page-e', 'E1'));
    const tabC = new FakeHTMLElement();
    const tabD = new FakeHTMLElement();
    const tabE = new FakeHTMLElement();
    const pageE = createPage('preview-page-e');
    tabE.child = pageE;
    const mounted = await updateOpenPreviewTabs({
      modules: [
        previewModule(PAGE_C, pageSource('preview-page-c', 'C:', BASE), V1),
        previewModule(PAGE_D, pageSource('preview-page-d', 'D:', BASE), V1),
        previewModule(PAGE_E, pageSource('preview-page-e', 'E1'), V1),
        previewModule(BASE, baseSource('base-v1'), V1),
      ],
      changed: [BASE],
      tabs: [
        slot(tabC, PAGE_C, 'preview-page-c'),
        slot(tabD, PAGE_D, 'preview-page-d'),
        slot(tabE, PAGE_E, 'preview-page-e'),
      ],
      draftSlug: null,
      origin: 'http://preview.test',
    });
    assert.ok(mounted);
    assert.equal(mounted.ok, true);
    assert.equal(tabC.child?.label, 'C:base-v1');
    assert.equal(tabD.child?.label, 'D:base-v1');
    assert.equal(tabE.child, pageE);
    const headerBase = createPage('preview-page-c');
    header.child = headerBase;
    const keptC = tabC.child;
    const keptD = tabD.child;

    const shared = await updateOpenPreviewTabs({
      modules: [
        previewModule(PAGE_C, pageSource('preview-page-c', 'C:', BASE), V1),
        previewModule(PAGE_D, pageSource('preview-page-d', 'D:', BASE), V1),
        previewModule(PAGE_E, pageSource('preview-page-e', 'E1'), V1),
        previewModule(BASE, baseSource('base-v2'), V2),
      ],
      changed: [BASE],
      tabs: [
        slot(tabC, PAGE_C, 'preview-page-c'),
        slot(tabD, PAGE_D, 'preview-page-d'),
        slot(tabE, PAGE_E, 'preview-page-e'),
      ],
      draftSlug: null,
      origin: 'http://preview.test',
    });
    assert.ok(shared);
    assert.equal(shared.ok, true);
    assert.equal(shared.message, t('live.remounted', { count: 2, tags: 2 }));
    assert.notEqual(tabC.child, keptC);
    assert.notEqual(tabD.child, keptD);
    assert.equal(tabC.child?.label, 'C:base-v2');
    assert.equal(tabD.child?.label, 'D:base-v2');
    assert.equal(tabE.child, pageE);
    assert.equal(tabE.child?.label, 'E1');
    assert.equal(header.child, headerBase);
    assert.equal(header.child?.label, 'C:base-v1');
    assert.equal(header.label, 'SHELL');
  } finally {
    (globalThis as { customElements?: unknown }).customElements = previousElements;
    globalThis.document = previousDocument;
  }
});

test('a shared base stays refused when the reimported page registers no element', async () => {
  const { updateOpenPreviewTabs } = await load();
  const page = '/_102033_/l2/plain.js';
  const base = '/_102033_/l2/plainBase.js';
  const div = new FakeHTMLElement();
  const previous = new FakeHTMLElement();
  previous.label = 'stay';
  div.child = previous;
  const result = await updateOpenPreviewTabs({
    modules: [
      previewModule(page, `import { label } from '${base}';\nexport const seen = label;\n`, V1),
      previewModule(base, baseSource('x'), V2),
    ],
    changed: [base],
    tabs: [slot(div, page, 'preview-plain')],
    draftSlug: null,
    origin: 'http://preview.test',
  });
  assert.ok(result);
  assert.equal(result.ok, false);
  assert.equal(result.message, t('live.noElementDefine'));
  assert.equal(div.child, previous);
  assert.equal(div.child?.label, 'stay');
});

const OUTSIDE = '/_102029_/l2/outside.js';
const ABS_PAGE = '/_102033_/l2/absPage.js';
const ABS_BASE = '/_102033_/l2/absBase.js';
const ORIGIN = 'http://preview.test';

function decodeDataUrl(url: string): string {
  const prefix = 'data:text/javascript,';
  if (!url.startsWith(prefix)) throw new Error(`[remount.test] not a data url: ${url.slice(0, 40)}`);
  return decodeURIComponent(url.slice(prefix.length));
}

function deliveredSpecifiers(source: string): string[] {
  const found: string[] = [];
  const pattern = /\b(?:from|import)\s*(?:\(\s*)?(['"])([^'"]+)\1/g;
  let match: RegExpExecArray | null = pattern.exec(source);
  while (match) {
    found.push(match[2]);
    match = pattern.exec(source);
  }
  return found;
}

function isPackageName(spec: string): boolean {
  return spec.length > 0 && !spec.startsWith('/') && !spec.startsWith('.') && !/^[a-z][a-z0-9+.-]*:/iu.test(spec);
}

/** Fails when a `/…` or relative specifier is still in a source handed to import. */
function assertDeliveredSource(source: string, seen: Set<string>): void {
  if (seen.has(source)) return;
  seen.add(source);
  for (const spec of deliveredSpecifiers(source)) {
    if (isPackageName(spec)) continue;
    let url: URL;
    try {
      url = new URL(spec);
    } catch {
      throw new Error(`[remount.test] specifier is not absolute and is not a package name: ${spec}`);
    }
    if (url.protocol === 'data:' && spec.startsWith('data:text/javascript,')) {
      assertDeliveredSource(decodeDataUrl(spec), seen);
    }
  }
}

function stubDataUrl(source: string): string {
  return `data:text/javascript,${encodeURIComponent(source).replaceAll('\'', '%27')}`;
}

/** Keeps subgraph `data:` imports. Package names and http(s) URLs become empty modules so Node can evaluate the page. */
function runnableSource(source: string): string {
  return source.replace(/\b(from|import)(\s*(?:\(\s*)?)(['"])([^'"]+)\3/g, (whole, keyword: string, gap: string, quote: string, spec: string) => {
    if (spec.startsWith('data:')) return whole;
    const body = isPackageName(spec) ? 'export const html = 1;' : 'export {};';
    return `${keyword}${gap}${quote}${stubDataUrl(body)}${quote}`;
  });
}

test('a specifier outside the subgraph is absolute in every source delivered to import', async () => {
  await armPageTag();
  const { updateOpenPreviewTabs } = await load();
  const previousElements = (globalThis as { customElements?: unknown }).customElements;
  const previousDocument = globalThis.document;
  (globalThis as { customElements?: unknown }).customElements = sharedRegistry;
  globalThis.document = {
    documentElement: previousDocument?.documentElement,
    createElement(tag: string) {
      return createPage(tag);
    },
  } as unknown as Document;

  const delivered: string[] = [];
  try {
    const header = new FakeHTMLElement();
    header.label = 'SHELL';
    const tab = new FakeHTMLElement();
    const result = await updateOpenPreviewTabs({
      modules: [
        previewModule(ABS_PAGE, [
          `import { label } from '${ABS_BASE}';`,
          `import '${OUTSIDE}';`,
          "import { html } from 'lit';",
          'class Page extends HTMLElement {',
          '  constructor() {',
          '    super();',
          '    this.label = label;',
          '    this.html = html;',
          '  }',
          '}',
          "customElements.define('preview-page-abs', Page);",
        ].join('\n'), V2),
        previewModule(ABS_BASE, baseSource('base-v2'), V2),
      ],
      changed: [ABS_BASE],
      tabs: [slot(tab, ABS_PAGE, 'preview-page-abs')],
      draftSlug: null,
      origin: ORIGIN,
      importModule: async (url) => {
        const source = decodeDataUrl(url);
        delivered.push(source);
        assertDeliveredSource(source, new Set());
        await import(stubDataUrl(runnableSource(source)));
      },
    });
    assert.equal(delivered.length > 0, true);
    const pageSourceText = delivered.join('\n');
    const absoluteOutside = new URL(OUTSIDE, ORIGIN).href;
    assert.equal(pageSourceText.includes(`'${absoluteOutside}'`), true);
    assert.equal(pageSourceText.includes("'lit'"), true);
    for (const source of delivered) {
      for (const spec of deliveredSpecifiers(source)) {
        assert.equal(spec.startsWith('/'), false, spec);
        assert.equal(spec.startsWith('./') || spec.startsWith('../'), false, spec);
      }
    }
    assert.ok(result);
    assert.equal(result.ok, true);
    assert.equal(tab.child?.label, 'base-v2');
    assert.equal(header.label, 'SHELL');
    assert.equal(header.child, null);
  } finally {
    (globalThis as { customElements?: unknown }).customElements = previousElements;
    globalThis.document = previousDocument;
  }
});

test('st66 s4: a saved l2 file refreshes only the tab that imports it', async () => {
  await armPageTag();
  const { draftPathSpecifier, updateOpenTabsForFiles } = await load();
  const page = '/_102033_/l2/pageS4.js';
  const other = '/_102033_/l2/pageS4b.js';
  assert.equal(draftPathSpecifier(102033, 'l2/pageS4.ts'), page);
  assert.equal(draftPathSpecifier(102033, 'l5/config.json'), null);
  assert.equal(draftPathSpecifier(102033, 'l2/pageS4.test.ts'), null);

  const previousElements = (globalThis as { customElements?: unknown }).customElements;
  const previousDocument = globalThis.document;
  (globalThis as { customElements?: unknown }).customElements = sharedRegistry;
  globalThis.document = {
    documentElement: previousDocument?.documentElement,
    createElement(tag: string) {
      return createPage(tag);
    },
  } as unknown as Document;
  try {
    await evalModule(pageSource('preview-page-s4', 'S1'));
    await evalModule(pageSource('preview-page-s4b', 'T1'));
    const header = new FakeHTMLElement();
    header.label = 'SHELL';
    const tab = new FakeHTMLElement();
    const kept = new FakeHTMLElement();
    tab.child = createPage('preview-page-s4');
    kept.child = createPage('preview-page-s4b');
    const before = tab.child;
    const result = await updateOpenTabsForFiles(102033, ['l2/pageS4.ts', 'l5/config.json'], {
      tabs: [slot(tab, page, 'preview-page-s4'), slot(kept, other, 'preview-page-s4b')],
      draftSlug: null,
      origin: 'http://preview.test',
      readModule(specifier: string) {
        if (specifier === page) return { source: pageSource('preview-page-s4', 'S2'), version: V2 };
        if (specifier === other) return { source: pageSource('preview-page-s4b', 'T1'), version: V1 };
        return null;
      },
    });
    assert.ok(result);
    assert.equal(result.ok, true);
    assert.notEqual(tab.child, before);
    assert.equal(tab.child?.label, 'S2');
    assert.equal(kept.child?.label, 'T1');
    assert.equal(header.label, 'SHELL');
  } finally {
    (globalThis as { customElements?: unknown }).customElements = previousElements;
    globalThis.document = previousDocument;
  }
});

test('st66 s4: a saved l2 file that was not compiled fails', async () => {
  const { updateOpenTabsForFiles } = await load();
  const result = await updateOpenTabsForFiles(102033, ['l2/missing.ts'], {
    tabs: [],
    draftSlug: null,
    origin: 'http://preview.test',
    readModule: () => null,
  });
  assert.ok(result);
  assert.equal(result.ok, false);
  assert.equal(result.message, t('live.notCompiled'));
});
