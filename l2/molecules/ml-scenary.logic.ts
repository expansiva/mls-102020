/// <mls fileReference="_102020_/l2/molecules/ml-scenary.logic.ts" enhancement="_blank"/>

// Pure visibility / navigation helpers for ml-scenary. Kept off the Lit class so T5
// can run in node:test without importing lit (setup-l2 has no TreeWalker).

export type ScenaryMode = 'scenary' | 'tabs';

export interface SceneInput {
  value: string;
  title: string;
  nav: string | null;
  backTo: string | null;
  disabled: boolean;
}

export interface SceneRecord {
  value: string;
  title: string;
  navBack: boolean;
  backTo: string | null;
  disabled: boolean;
}

export interface SceneHostChild {
  tagName: string;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
}

export function normalizeMode(mode: string | null | undefined): ScenaryMode {
  return mode === 'tabs' ? 'tabs' : 'scenary';
}

export function readSceneElements(parent: { children: ArrayLike<SceneHostChild> }): SceneInput[] {
  return Array.from(parent.children)
    .filter(el => el.tagName === 'SCENE')
    .map(el => ({
      value: el.getAttribute('value') || '',
      title: el.getAttribute('title') || '',
      nav: el.getAttribute('nav'),
      backTo: el.getAttribute('backTo') || el.getAttribute('backto'),
      disabled: el.hasAttribute('disabled'),
    }));
}

export function parseScenes(inputs: SceneInput[]): SceneRecord[] {
  const seen = new Set<string>();
  const out: SceneRecord[] = [];
  for (const input of inputs) {
    const value = (input.value || '').trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const backTo = (input.backTo || '').trim();
    out.push({
      value,
      title: input.title || '',
      navBack: input.nav === 'back',
      backTo: backTo || null,
      disabled: !!input.disabled,
    });
  }
  return out;
}

export function firstEnabled(scenes: SceneRecord[]): SceneRecord | null {
  return scenes.find(scene => !scene.disabled) ?? null;
}

export function resolveActive(scenes: SceneRecord[], value: string | null | undefined): string | null {
  if (scenes.length === 0) return null;
  const found = scenes.find(scene => scene.value === value);
  if (found && !found.disabled) return found.value;
  return firstEnabled(scenes)?.value ?? null;
}

export function isDirectRender(scenes: SceneRecord[], revealall: boolean): boolean {
  return !revealall && scenes.length <= 1;
}

export function showTabs(mode: ScenaryMode, scenes: SceneRecord[], revealall: boolean): boolean {
  return !revealall && mode === 'tabs' && scenes.length > 1;
}

export function showBack(
  mode: ScenaryMode,
  scene: SceneRecord | undefined,
  scenes: SceneRecord[],
  revealall: boolean,
): boolean {
  if (revealall || mode !== 'scenary' || scenes.length <= 1 || !scene) return false;
  return scene.navBack;
}

export function resolveBackTarget(scenes: SceneRecord[], scene: SceneRecord): string | null {
  if (scene.backTo) {
    const dest = scenes.find(item => item.value === scene.backTo && !item.disabled);
    if (dest) return dest.value;
  }
  const first = firstEnabled(scenes);
  if (!first || first.value === scene.value) return null;
  return first.value;
}

export function sceneHidden(scene: SceneRecord, active: string | null, revealall: boolean): boolean {
  if (revealall) return false;
  return scene.value !== active;
}

export function stepEnabled(scenes: SceneRecord[], current: string | null, direction: 1 | -1): string | null {
  const enabled = scenes.filter(scene => !scene.disabled);
  if (enabled.length === 0) return null;
  const idx = enabled.findIndex(scene => scene.value === current);
  const start = idx < 0 ? 0 : idx;
  return enabled[(start + direction + enabled.length) % enabled.length].value;
}

export function shouldEmitChange(opts: {
  internal: boolean;
  revealall: boolean;
  disabled: boolean;
  loading: boolean;
  previous: string | null;
  next: string | null;
}): boolean {
  if (!opts.internal || opts.revealall || opts.disabled || opts.loading) return false;
  if (!opts.next || opts.next === opts.previous) return false;
  return true;
}

export function changeDetail(scenes: SceneRecord[], previous: string | null, next: string): {
  value: string;
  previous: string | null;
  title: string;
} {
  const scene = scenes.find(item => item.value === next);
  return { value: next, previous, title: scene?.title || '' };
}
