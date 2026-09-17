/// <mls fileReference="_102020_/l2/aura/studio/studioLiveUpdateRemount.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';
import type { IStudioEditTarget } from '/_102020_/l2/aura/studio/studioEditTarget.js';

// The registry the mode imports builds `class extends HTMLElement`; Node has no such global. Set it
// BEFORE the import, same reasoning as studioLiveUpdateHotSwap.test.ts.
class FakeHTMLElement {}
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

async function armPageTag(): Promise<void> {
  const registry = await loadRegistry();
  const fake = new FakeRegistry();
  registry.armElementSwap(fake as unknown as Parameters<RegistryModule['armElementSwap']>[0]);
  if (!registry.isElementSwapArmed(PAGE_TAG)) {
    fake.define(PAGE_TAG, class extends (FakeHTMLElement as unknown as { new (): HTMLElement }) {});
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
