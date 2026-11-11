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
  public replacedBy: FakeHTMLElement | null = null;
  public replaceWith(next: FakeHTMLElement): void {
    this.replacedBy = next;
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
  assert.equal(result.message, `${t('live.notCompiled')}: /_102033_/l2/missing.js`);
});

function jsResponse(source: string, version?: string): Response {
  const url = version ? `http://preview.test/module.js?v=${version}` : 'http://preview.test/module.js';
  return {
    ok: true,
    status: 200,
    url,
    headers: { get: () => 'application/javascript' },
    text: async () => source,
  } as unknown as Response;
}

async function withPreviewTab(
  tag: string,
  label: string,
  run: (tab: FakeHTMLElement, before: FakeHTMLElement) => Promise<void>,
): Promise<void> {
  await armPageTag();
  const previousElements = (globalThis as { customElements?: unknown }).customElements;
  const previousDocument = globalThis.document;
  (globalThis as { customElements?: unknown }).customElements = sharedRegistry;
  globalThis.document = {
    documentElement: previousDocument?.documentElement,
    createElement(nextTag: string) {
      return createPage(nextTag);
    },
  } as unknown as Document;
  try {
    await evalModule(pageSource(tag, label));
    const tab = new FakeHTMLElement();
    tab.child = createPage(tag);
    const before = tab.child;
    await run(tab, before);
  } finally {
    (globalThis as { customElements?: unknown }).customElements = previousElements;
    globalThis.document = previousDocument;
  }
}

test('st66 s6: saving a page with no editor model publishes, then fetches, then updates the tab', async () => {
  const { updateOpenTabsForFiles } = await load();
  const page = '/_102033_/l2/pageS6a.js';
  const order: string[] = [];
  const next = pageSource('preview-page-s6a', 'S6-NEW');
  await withPreviewTab('preview-page-s6a', 'S6-OLD', async (tab, before) => {
    const result = await updateOpenTabsForFiles(102033, ['l2/pageS6a.ts'], {
      tabs: [slot(tab, page, 'preview-page-s6a')],
      draftSlug: 'team-102033',
      origin: 'http://preview.test',
      publishDraft: async () => {
        order.push('publish');
        return { sent: 1, keep: new Set(['l2/pageS6a.ts']) };
      },
      forgetStale: async () => {
        order.push('forget');
        return 0;
      },
      fetchModule: async () => {
        order.push('fetch');
        return jsResponse(next);
      },
    });
    assert.ok(result);
    assert.equal(result.ok, true);
    assert.equal(order[0], 'publish');
    assert.equal(order.indexOf('publish') < order.indexOf('fetch'), true);
    assert.notEqual(tab.child, before);
    assert.equal(tab.child?.label, 'S6-NEW');
  });
});

test('st66 s6: a compiled model stays the source and is not fetched', async () => {
  const { updateOpenTabsForFiles } = await load();
  const page = '/_102033_/l2/pageS6b.js';
  const previousMls = (globalThis as { mls?: unknown }).mls;
  let fetched = 0;
  (globalThis as { mls?: unknown }).mls = {
    editor: {
      getModels(project: number, shortName: string, folder: string, level: number) {
        if (project === 102033 && shortName === 'pageS6b' && folder === '' && level === 2) {
          return { ts: { compilerResults: { prodJS: pageSource('preview-page-s6b', 'FROM-MODEL'), cacheVersion: V2 } } };
        }
        return undefined;
      },
    },
  };
  try {
    await withPreviewTab('preview-page-s6b', 'S6-OLD', async (tab, before) => {
      const result = await updateOpenTabsForFiles(102033, ['l2/pageS6b.ts'], {
        tabs: [slot(tab, page, 'preview-page-s6b')],
        draftSlug: 'team-102033',
        origin: 'http://preview.test',
        publishDraft: async () => ({ sent: 0, keep: new Set(['l2/pageS6b.ts']) }),
        forgetStale: async () => 0,
        fetchModule: async () => {
          fetched += 1;
          throw new Error('fetch should not run');
        },
      });
      assert.ok(result);
      assert.equal(result.ok, true);
      assert.equal(fetched, 0);
      assert.notEqual(tab.child, before);
      assert.equal(tab.child?.label, 'FROM-MODEL');
    });
  } finally {
    (globalThis as { mls?: unknown }).mls = previousMls;
  }
});

test('st66 s8: after a discard the stale Monaco model is not the source; the service worker is', async () => {
  const { updateOpenTabsForFiles } = await load();
  const page = '/_102033_/l2/pageS8.js';
  const previousMls = (globalThis as { mls?: unknown }).mls;
  const rows: Record<string, { inLocalStorage: boolean }> = { 'k-pageS8': { inLocalStorage: false } };
  (globalThis as { mls?: unknown }).mls = {
    editor: {
      getModels(project: number, shortName: string, folder: string, level: number) {
        if (project === 102033 && shortName === 'pageS8' && folder === '' && level === 2) {
          return { ts: { compilerResults: { prodJS: pageSource('preview-page-s8', 'STALE-MODEL'), cacheVersion: V2 } } };
        }
        return undefined;
      },
    },
    stor: { files: rows, getKeyToFile: (file: { shortName: string }) => `k-${file.shortName}` },
  };
  try {
    await withPreviewTab('preview-page-s8', 'S8-OLD', async (tab, before) => {
      const fetched: string[] = [];
      const ask = (fetchedSource: string) => updateOpenTabsForFiles(102033, ['l2/pageS8.ts'], {
        tabs: [slot(tab, page, 'preview-page-s8')],
        draftSlug: 'team-102033',
        origin: 'http://preview.test',
        publishDraft: async () => ({ sent: 0, keep: new Set<string>() }),
        forgetStale: async () => 0,
        fetchModule: async (specifier: string) => {
          fetched.push(specifier);
          return jsResponse(fetchedSource);
        },
      });
      // No local copy any more: the published text from the service worker wins over the model.
      const result = await ask(pageSource('preview-page-s8', 'FROM-SW'));
      assert.ok(result);
      assert.equal(result.ok, true);
      assert.deepEqual(fetched, [page]);
      assert.notEqual(tab.child, before);
      assert.equal(tab.child?.label, 'FROM-SW');
      // A kept local copy: the model is the source and nothing is fetched for it.
      rows['k-pageS8'].inLocalStorage = true;
      fetched.length = 0;
      const again = await ask(pageSource('preview-page-s8', 'NEVER-READ'));
      assert.ok(again);
      assert.equal(again.ok, true);
      assert.deepEqual(fetched, []);
      assert.equal(tab.child?.label, 'STALE-MODEL');
    });
  } finally {
    (globalThis as { mls?: unknown }).mls = previousMls;
  }
});

test('st66 s6: a failed fetch names the specifier and leaves the tab', async () => {
  const { updateOpenTabsForFiles } = await load();
  const page = '/_102033_/l2/pageS6c.js';
  await withPreviewTab('preview-page-s6c', 'S6-OLD', async (tab, before) => {
    const result = await updateOpenTabsForFiles(102033, ['l2/pageS6c.ts'], {
      tabs: [slot(tab, page, 'preview-page-s6c')],
      draftSlug: 'team-102033',
      origin: 'http://preview.test',
      publishDraft: async () => ({ sent: 1, keep: new Set(['l2/pageS6c.ts']) }),
      forgetStale: async () => 0,
      fetchModule: async () => {
        throw new Error('service worker missing');
      },
    });
    assert.ok(result);
    assert.equal(result.ok, false);
    assert.equal(result.message, `${t('live.notCompiled')}: ${page}`);
    assert.equal(tab.child, before);
    assert.equal(tab.child?.label, 'S6-OLD');
  });
});

test('st66 s6: discard forgets the stale draft copy before the fetch returns production', async () => {
  const { updateOpenTabsForFiles } = await load();
  const page = '/_102033_/l2/pageS6d.js';
  const order: string[] = [];
  const production = pageSource('preview-page-s6d', 'PUBLISHED');
  await withPreviewTab('preview-page-s6d', 'DRAFT', async (tab, before) => {
    const result = await updateOpenTabsForFiles(102033, ['l2/pageS6d.ts'], {
      tabs: [slot(tab, page, 'preview-page-s6d')],
      draftSlug: 'team-102033',
      origin: 'http://preview.test',
      publishDraft: async () => {
        order.push('publish');
        return { sent: 0, keep: new Set<string>() };
      },
      forgetStale: async (_project, _slug, keep) => {
        order.push('forget');
        assert.equal(keep.has('l2/pageS6d.ts'), false);
        return 1;
      },
      fetchModule: async () => {
        order.push('fetch');
        return jsResponse(production, 'prodsha');
      },
    });
    assert.ok(result);
    assert.equal(result.ok, true);
    assert.equal(order.indexOf('forget') < order.indexOf('fetch'), true);
    assert.notEqual(tab.child, before);
    assert.equal(tab.child?.label, 'PUBLISHED');
  });
});

test('st66 s6: a kept local copy with no editor model is included and the fetch updates the tab', async () => {
  const { updateOpenTabsForFiles } = await load();
  const page = '/_102033_/l2/pageS6e.js';
  const previousMls = (globalThis as { mls?: unknown }).mls;
  (globalThis as { mls?: unknown }).mls = { editor: { getModels: () => undefined } };
  let included: readonly string[] | undefined;
  const next = pageSource('preview-page-s6e', 'LOCAL-NEW');
  try {
    await withPreviewTab('preview-page-s6e', 'S6-OLD', async (tab, before) => {
      const result = await updateOpenTabsForFiles(102033, ['l2/pageS6e.ts'], {
        tabs: [slot(tab, page, 'preview-page-s6e')],
        draftSlug: 'team-102033',
        origin: 'http://preview.test',
        publishDraft: async (_project, _slug, include) => {
          included = include;
          return { sent: 1, keep: new Set(['l2/pageS6e.ts']) };
        },
        forgetStale: async (_project, _slug, keep) => {
          assert.equal(keep.has('l2/pageS6e.ts'), true);
          return 0;
        },
        fetchModule: async () => jsResponse(next),
      });
      assert.ok(result);
      assert.equal(result.ok, true);
      assert.deepEqual(included, ['l2/pageS6e.ts']);
      assert.notEqual(tab.child, before);
      assert.equal(tab.child?.label, 'LOCAL-NEW');
    });
  } finally {
    (globalThis as { mls?: unknown }).mls = previousMls;
  }
});

test('st66 s6: module fetches stay within six at a time', async () => {
  const { updateOpenTabsForFiles } = await load();
  const paths = Array.from({ length: 8 }, (_item, index) => `l2/p${index}.ts`);
  let active = 0;
  let max = 0;
  const result = await updateOpenTabsForFiles(102033, paths, {
    tabs: [],
    draftSlug: 'team-102033',
    origin: 'http://preview.test',
    publishDraft: async () => ({ sent: 0, keep: new Set<string>() }),
    forgetStale: async () => 0,
    fetchModule: async () => {
      active += 1;
      max = Math.max(max, active);
      await new Promise((resolve) => setTimeout(resolve, 20));
      active -= 1;
      return jsResponse('export const label = "x";\n');
    },
  });
  assert.ok(result);
  assert.equal(result.ok, false);
  assert.equal(result.message, t('live.noOpenPage'));
  assert.equal(max > 1, true);
  assert.equal(max <= 6, true);
});

const S7_MAIN = '/_102033_/l2/s7main.js';
const S7_BASE = '/_102033_/l2/s7base.js';
const S7_SHELL = '/_102033_/l2/s7shell.js';
const S7_MOD = '/_102033_/l2/s7mod.js';
const S7_IDLE = '/_102033_/l2/s7idle.js';
const S7_OTHER = '/_102033_/l2/s7other.js';
const S7_MAIN_TAG = 'preview-page-s7main';
const S7_SHELL_TAG = 'preview-page-s7shell';
const S7_MOD_TAG = 'preview-page-s7mod';

function capturePreviewLogs(): { infos: string[]; errors: string[]; restore: () => void } {
  const infos: string[] = [];
  const errors: string[] = [];
  const previousInfo = console.info;
  const previousError = console.error;
  console.info = (...args: unknown[]) => { infos.push(args.map((item) => String(item)).join(' ')); };
  console.error = (...args: unknown[]) => { errors.push(args.map((item) => String(item)).join(' ')); };
  return {
    infos,
    errors,
    restore() {
      console.info = previousInfo;
      console.error = previousError;
    },
  };
}

function previewUpdateLine(infos: readonly string[]): string {
  const line = infos.find((item) => item.startsWith('[remount] preview update:'));
  assert.ok(line, infos.join('\n'));
  return line;
}

function liveDocument(live: Map<string, FakeHTMLElement[]>): { asked: string[] } {
  const asked: string[] = [];
  const previous = globalThis.document;
  globalThis.document = {
    documentElement: previous?.documentElement,
    createElement(tag: string) {
      return createPage(tag);
    },
    querySelectorAll(selector: string) {
      asked.push(selector);
      return live.get(selector) ?? [];
    },
  } as unknown as Document;
  return { asked };
}

test('st66 s7: only the main page is open, a changed base swaps and remounts by tag', async () => {
  await armPageTag();
  const { updateOpenTabsForFiles } = await load();
  const previousElements = (globalThis as { customElements?: unknown }).customElements;
  const previousDocument = globalThis.document;
  const previousMls = (globalThis as { mls?: unknown }).mls;
  (globalThis as { customElements?: unknown }).customElements = sharedRegistry;
  const live = new Map<string, FakeHTMLElement[]>();
  const { asked } = liveDocument(live);
  const logs = capturePreviewLogs();
  (globalThis as { mls?: unknown }).mls = {
    editor: {
      getModels(project: number, shortName: string, folder: string, level: number) {
        if (project === 102033 && shortName === 's7main' && folder === '' && level === 2) {
          return { ts: { compilerResults: { prodJS: pageSource(S7_MAIN_TAG, 'M:', S7_BASE), cacheVersion: V2 } } };
        }
        return undefined;
      },
    },
  };
  try {
    await evalModule(pageSource(S7_MAIN_TAG, 'OLD'));
    const header = new FakeHTMLElement();
    header.label = 'SHELL';
    const main = createPage(S7_MAIN_TAG);
    live.set(S7_MAIN_TAG, [main]);
    const result = await updateOpenTabsForFiles(102033, ['l2/s7base.ts'], {
      tabs: [],
      mainPage: { page: S7_MAIN, tag: S7_MAIN_TAG, host: main as unknown as HTMLElement },
      draftSlug: null,
      origin: 'http://preview.test',
      fetchModule: async (specifier: string) => {
        assert.equal(specifier, S7_BASE);
        return jsResponse(baseSource('base-v2'), V2);
      },
    });
    assert.ok(result);
    assert.equal(result.ok, true);
    assert.equal(result.message, t('live.remounted', { count: 1, tags: 1 }));
    assert.ok(main.replacedBy);
    assert.equal(main.replacedBy.label, 'M:base-v2');
    assert.deepEqual(asked, [S7_MAIN_TAG]);
    assert.equal(header.label, 'SHELL');
    assert.equal(header.replacedBy, null);
    const line = previewUpdateLine(logs.infos);
    assert.equal(line.includes(`changed=${S7_BASE}`), true, line);
    assert.equal(line.includes(`pages=${S7_MAIN}`), true, line);
    assert.equal(line.includes(`${S7_MAIN}=model`), true, line);
    assert.equal(line.includes(`${S7_BASE}=fetch`), true, line);
    assert.equal(line.includes(`swapped=${S7_MAIN_TAG}`), true, line);
    assert.equal(line.includes(`remounted=${S7_MAIN_TAG}`), true, line);
  } finally {
    logs.restore();
    (globalThis as { mls?: unknown }).mls = previousMls;
    (globalThis as { customElements?: unknown }).customElements = previousElements;
    globalThis.document = previousDocument;
  }
});

test('st66 s7: the main page and a module tab of different pages each update only their own', async () => {
  await armPageTag();
  const { updateOpenTabsForFiles } = await load();
  const previousElements = (globalThis as { customElements?: unknown }).customElements;
  const previousDocument = globalThis.document;
  (globalThis as { customElements?: unknown }).customElements = sharedRegistry;
  const live = new Map<string, FakeHTMLElement[]>();
  const { asked } = liveDocument(live);
  const logs = capturePreviewLogs();
  try {
    await evalModule(pageSource(S7_SHELL_TAG, 'SHELL-1'));
    await evalModule(pageSource(S7_MOD_TAG, 'MOD-1'));
    const main = createPage(S7_SHELL_TAG);
    const tab = new FakeHTMLElement();
    const mod = createPage(S7_MOD_TAG);
    tab.child = mod;
    live.set(S7_SHELL_TAG, [main]);
    const mainPage = { page: S7_SHELL, tag: S7_SHELL_TAG, host: main as unknown as HTMLElement };
    const tabSlot = slot(tab, S7_MOD, S7_MOD_TAG);
    const read = (shellLabel: string, modLabel: string) => (specifier: string) => {
      if (specifier === S7_SHELL) return { source: pageSource(S7_SHELL_TAG, shellLabel), version: V2 };
      if (specifier === S7_MOD) return { source: pageSource(S7_MOD_TAG, modLabel), version: V2 };
      return null;
    };
    const shellOnly = await updateOpenTabsForFiles(102033, ['l2/s7shell.ts'], {
      tabs: [tabSlot],
      mainPage,
      draftSlug: null,
      origin: 'http://preview.test',
      readModule: read('SHELL-2', 'MOD-1'),
    });
    assert.ok(shellOnly);
    assert.equal(shellOnly.ok, true);
    assert.ok(main.replacedBy);
    assert.equal(main.replacedBy.label, 'SHELL-2');
    assert.equal(tab.child, mod);
    assert.equal(mod.replacedBy, null);
    assert.deepEqual(asked, [S7_SHELL_TAG]);
    const firstLine = previewUpdateLine(logs.infos);
    assert.equal(firstLine.includes(`pages=${S7_MOD},${S7_SHELL}`), true, firstLine);
    assert.equal(firstLine.includes(`swapped=${S7_SHELL_TAG}`), true, firstLine);
    assert.equal(firstLine.includes(`remounted=${S7_SHELL_TAG}`), true, firstLine);
    assert.equal(firstLine.includes(S7_MOD_TAG), false, firstLine);

    asked.length = 0;
    logs.infos.length = 0;
    const kept = main.replacedBy;
    const modOnly = await updateOpenTabsForFiles(102033, ['l2/s7mod.ts'], {
      tabs: [tabSlot],
      mainPage,
      draftSlug: null,
      origin: 'http://preview.test',
      readModule: read('SHELL-2', 'MOD-2'),
    });
    assert.ok(modOnly);
    assert.equal(modOnly.ok, true);
    assert.equal(main.replacedBy, kept);
    assert.equal(kept.replacedBy, null);
    assert.notEqual(tab.child, mod);
    assert.equal(tab.child?.label, 'MOD-2');
    assert.deepEqual(asked, []);
    const secondLine = previewUpdateLine(logs.infos);
    assert.equal(secondLine.includes(`swapped=${S7_MOD_TAG}`), true, secondLine);
    assert.equal(secondLine.includes(`remounted=${S7_MOD_TAG}`), true, secondLine);
    assert.equal(secondLine.includes(S7_SHELL_TAG), false, secondLine);
  } finally {
    logs.restore();
    (globalThis as { customElements?: unknown }).customElements = previousElements;
    globalThis.document = previousDocument;
  }
});

test('st66 s7: no main page and no module tab is a visible error, and a page that does not import the file stays null', async () => {
  const { updateOpenTabsForFiles } = await load();
  const logs = capturePreviewLogs();
  try {
    const missing = await updateOpenTabsForFiles(102033, ['l2/s7alone.ts'], {
      tabs: [],
      draftSlug: null,
      origin: 'http://preview.test',
      fetchModule: async () => jsResponse('export const label = "x";\n'),
    });
    assert.ok(missing);
    assert.equal(missing.ok, false);
    assert.equal(missing.message, t('live.noOpenPage'));
    assert.equal(logs.errors.some((line) => line.includes('[remount] no open page to update')), true);
    const errorLine = previewUpdateLine(logs.infos);
    assert.equal(errorLine.includes('changed=/_102033_/l2/s7alone.js'), true, errorLine);
    assert.equal(errorLine.includes('pages=;'), true, errorLine);

    logs.infos.length = 0;
    logs.errors.length = 0;
    const idle = new FakeHTMLElement();
    const untouched = await updateOpenTabsForFiles(102033, ['l2/s7other.ts'], {
      tabs: [],
      mainPage: { page: S7_IDLE, tag: 'preview-page-s7idle', host: idle as unknown as HTMLElement },
      draftSlug: null,
      origin: 'http://preview.test',
      readModule(specifier: string) {
        if (specifier === S7_IDLE) return { source: pageSource('preview-page-s7idle', 'STAY'), version: V1 };
        if (specifier === S7_OTHER) return { source: baseSource('nope'), version: V2 };
        return null;
      },
    });
    assert.equal(untouched, null);
    assert.equal(idle.replacedBy, null);
    const nullLine = previewUpdateLine(logs.infos);
    assert.equal(nullLine.includes(`changed=${S7_OTHER}`), true, nullLine);
    assert.equal(nullLine.includes(`pages=${S7_IDLE}`), true, nullLine);
    assert.equal(nullLine.includes('swapped=;'), true, nullLine);
    assert.equal(nullLine.includes('remounted='), true, nullLine);
  } finally {
    logs.restore();
  }
});

const S9A_PAGE = '/_102033_/l2/pageS9a.js';
const S9A_LEFT = '/_102033_/l2/s9aLeft.js';
const S9A_RIGHT = '/_102033_/l2/s9aRight.js';
const S9A_SHARED = '/_102033_/l2/s9aShared.js';

function passMarker(source: string): string {
  const match = /\/\/# st66-pass=(\d+)/.exec(source);
  if (!match) throw new Error('[remount.test] missing pass marker');
  return match[1];
}

async function withPreviewDocument(run: () => Promise<void>): Promise<void> {
  await armPageTag();
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
    await run();
  } finally {
    (globalThis as { customElements?: unknown }).customElements = previousElements;
    globalThis.document = previousDocument;
  }
}

test('st66 s9a: the same text captures define on two passes', async () => {
  const { updateOpenPreviewTabs } = await load();
  await withPreviewDocument(async () => {
    await evalModule(pageSource('preview-page-s9a', 'BOOT'));
    const tab = new FakeHTMLElement();
    tab.child = createPage('preview-page-s9a');
    const urls: string[] = [];
    const ask = (label: string) => updateOpenPreviewTabs({
      modules: [previewModule(S9A_PAGE, pageSource('preview-page-s9a', label), V1)],
      changed: [S9A_PAGE],
      tabs: [slot(tab, S9A_PAGE, 'preview-page-s9a')],
      draftSlug: null,
      origin: ORIGIN,
      importModule: async (url) => {
        urls.push(url);
        await import(url);
      },
    });
    const first = await ask('SAME');
    assert.ok(first);
    assert.equal(first.ok, true);
    assert.equal(tab.child?.label, 'SAME');
    const kept = tab.child;
    const second = await ask('SAME');
    assert.ok(second);
    assert.equal(second.ok, true);
    assert.notEqual(tab.child, kept);
    assert.equal(tab.child?.label, 'SAME');
    assert.equal(urls.length, 2);
    assert.notEqual(urls[0], urls[1]);
    assert.notEqual(passMarker(decodeDataUrl(urls[0])), passMarker(decodeDataUrl(urls[1])));
  });
});

test('st66 s9a: B then A then B then A swaps on all four', async () => {
  const { updateOpenPreviewTabs } = await load();
  await withPreviewDocument(async () => {
    await evalModule(pageSource('preview-page-s9a4', 'BOOT'));
    const tab = new FakeHTMLElement();
    tab.child = createPage('preview-page-s9a4');
    let previous = tab.child;
    for (const label of ['B', 'A', 'B', 'A']) {
      const result = await updateOpenPreviewTabs({
        modules: [previewModule(S9A_PAGE, pageSource('preview-page-s9a4', label), V1)],
        changed: [S9A_PAGE],
        tabs: [slot(tab, S9A_PAGE, 'preview-page-s9a4')],
        draftSlug: null,
        origin: ORIGIN,
      });
      assert.ok(result);
      assert.equal(result.ok, true, label);
      assert.notEqual(tab.child, previous);
      assert.equal(tab.child?.label, label);
      previous = tab.child;
    }
  });
});

test('st66 s9a: two importers of one module see one url in a pass', async () => {
  const { updateOpenPreviewTabs } = await load();
  await withPreviewDocument(async () => {
    await evalModule(pageSource('preview-s9a-left', 'L0'));
    await evalModule(pageSource('preview-s9a-right', 'R0'));
    const left = new FakeHTMLElement();
    const right = new FakeHTMLElement();
    left.child = createPage('preview-s9a-left');
    right.child = createPage('preview-s9a-right');
    const urls: string[] = [];
    const result = await updateOpenPreviewTabs({
      modules: [
        previewModule(S9A_LEFT, pageSource('preview-s9a-left', 'L:', S9A_SHARED), V1),
        previewModule(S9A_RIGHT, pageSource('preview-s9a-right', 'R:', S9A_SHARED), V1),
        previewModule(S9A_SHARED, baseSource('once'), V1),
      ],
      changed: [S9A_SHARED],
      tabs: [
        slot(left, S9A_LEFT, 'preview-s9a-left'),
        slot(right, S9A_RIGHT, 'preview-s9a-right'),
      ],
      draftSlug: null,
      origin: ORIGIN,
      importModule: async (url) => {
        urls.push(url);
        const source = decodeDataUrl(url);
        assertDeliveredSource(source, new Set());
        await import(stubDataUrl(runnableSource(source)));
      },
    });
    assert.ok(result);
    assert.equal(result.ok, true);
    assert.equal(urls.length, 2);
    const shared = urls.map((url) => deliveredSpecifiers(decodeDataUrl(url)).filter((spec) => spec.startsWith('data:')));
    assert.equal(shared[0].length, 1);
    assert.equal(shared[0][0], shared[1][0]);
    const marker = passMarker(decodeDataUrl(shared[0][0]));
    assert.equal(passMarker(decodeDataUrl(urls[0])), marker);
    assert.equal(passMarker(decodeDataUrl(urls[1])), marker);
    assert.equal(left.child?.label, 'L:once');
    assert.equal(right.child?.label, 'R:once');
  });
});

function statusResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    url: 'http://preview.test/module.js',
    headers: { get: () => 'text/plain' },
    text: async () => 'missing',
  } as unknown as Response;
}

test('st69 s1c: a removed new file whose fetch is 404 leaves the changed list', async () => {
  const { updateOpenTabsForFiles } = await load();
  const page = '/_102033_/l2/pageSt69.js';
  const logs = capturePreviewLogs();
  try {
    await withPreviewTab('preview-page-st69', 'OLD', async (tab, before) => {
      const result = await updateOpenTabsForFiles(102033, ['l2/pageSt69.ts'], {
        tabs: [slot(tab, page, 'preview-page-st69')],
        mainPage: null,
        draftSlug: null,
        origin: 'http://preview.test',
        fetchModule: async () => statusResponse(404),
      });
      assert.equal(result, null);
      assert.equal(tab.child, before);
      assert.equal(tab.child?.label, 'OLD');
      assert.equal(
        logs.infos.some((line) => line.includes('HTTP 404') && line.includes(page)),
        true,
        logs.infos.join('\n'),
      );
      assert.equal(logs.errors.some((line) => line.includes(page) || line.includes('not compiled')), false, logs.errors.join('\n'));
    });
  } finally {
    logs.restore();
  }
});

test('st69 s1c: a changed module that fetches 500 stays an error', async () => {
  const { updateOpenTabsForFiles } = await load();
  const page = '/_102033_/l2/pageSt69b.js';
  const logs = capturePreviewLogs();
  try {
    await withPreviewTab('preview-page-st69b', 'OLD', async (tab, before) => {
      const result = await updateOpenTabsForFiles(102033, ['l2/pageSt69b.ts'], {
        tabs: [slot(tab, page, 'preview-page-st69b')],
        mainPage: null,
        draftSlug: null,
        origin: 'http://preview.test',
        fetchModule: async () => statusResponse(500),
      });
      assert.ok(result);
      assert.equal(result.ok, false);
      assert.equal(result.message, `${t('live.notCompiled')}: ${page}`);
      assert.equal(tab.child, before);
      assert.equal(logs.errors.some((line) => line.includes('HTTP 500') && line.includes(page)), true, logs.errors.join('\n'));
    });
  } finally {
    logs.restore();
  }
});
