/// <mls fileReference="_102020_/l2/aura/studio/studioAuraSeed.ts" enhancement="_blank" />
// Fills the Aura state from the app that is RUNNING, the moment studio mode arms.
//
// WHY THIS EXISTS
// Every studio service READS `getAuraState()` — the genome knob, the project knob, the scenario
// panel, the picker's Info tab — but the only things that ever WROTE it were those same panels:
// `actualLayout` is written by serviceGenome and nothing else, `actualDesignSystem` and the language
// by serviceProject and nothing else. So a field was filled if and only if the user had opened the
// panel that owns it. In a client app in studio mode nobody opens any of them, and the state stayed
// a row of dashes while the page was right there on screen. `setAuraStateFromPageSource` was written
// for exactly this moment (its own doc says so) and had no caller at all.
//
// THE ORDER OF AUTHORITY, strongest first
//   1. the DOM — the tag mounted in the app region, and `<html lang>`. This is what the user SEES,
//      and it is right for free when `contentVariantRenderer` (Ctrl+Alt+E) swaps the variation at
//      runtime.
//   2. l5/config.json — for the active header only, which the DOM cannot answer: every profile
//      renders a header, so the mounted element does not say which profile the shell booted.
//   3. localStorage — only for what neither of the two above knows (the language of OTHER modules),
//      and only while the state was never initialised, which is AuraInitState's own guard. A
//      remembered module must never win over the module of the page on screen.
//
// It is a module with two memos, not a class: there is one app region per window, and seeding twice
// would notify every subscriber twice for no change.

import {
  getAuraState,
  setActualLanguage,
  setAuraState,
  setAuraStateFromPageSource,
  type IAuraPage,
} from '/_102020_/l2/aura/helpers/auraState.js';
import { currentLanguage, findPageElement, tagToFileInfo } from '/_102020_/l2/aura/studio/studioEditTarget.js';

/** Coordinates of the source file that renders the mounted page. */
export interface IPageFile {
  project: number;
  shortName: string;
  folder: string;
}

/**
 * `l2/<folder>/<shortName>.ts` — the shape `parseAuraPageSource` reads.
 *
 * The state's parser accepts both the runtime entrypoint and the l0 source path, and this is the
 * second one: the level belongs in the path because that is where the parser takes `IAuraPage.level`
 * from.
 */
export function pageSourcePath(file: IPageFile): string {
  const folder = file.folder ? `${file.folder}/` : '';
  return `l2/${folder}${file.shortName}.ts`;
}

/**
 * The page file the app region has mounted, straight from the tag.
 *
 * Null when there is nothing mounted or the tag is not a page tag — never a guess: seeding the state
 * with the wrong page would point every studio service at another file.
 */
export function mountedPageFile(host: HTMLElement | null | undefined): IPageFile | null {
  if (!host) return null;
  const pageEl = findPageElement(host);
  if (!pageEl) return null;
  const info = tagToFileInfo(pageEl.tagName.toLowerCase());
  if (!info?.project || !info.shortName) return null;
  return { project: info.project, shortName: info.shortName, folder: info.folder };
}

/**
 * Identity of one seed.
 *
 * The language is part of it on purpose: the app's own header can switch language without remounting
 * the page, and then the state is stale in the one field the user just changed.
 */
export function seedKey(file: IPageFile, language: string): string {
  return `${file.project}|${file.folder}/${file.shortName}|${language}`;
}

/** Last seed applied, so a re-publish of the same mounted page writes nothing. */
let lastSeed = '';
/** Project whose header was read SUCCESSFULLY — a failed read must stay retryable. */
let headerSeeded = 0;

/**
 * Writes the page identity and the language into the state.
 *
 * Order matters and is not obvious: `setAuraState('actualModule')` re-emits the effective language
 * for the new module, so the language has to be written AFTER the page source — the other way round
 * the module switch would immediately overwrite it with what was remembered for that module.
 */
export function seedAuraStateFromPage(file: IPageFile, language: string): IAuraPage | null {
  const page = setAuraStateFromPageSource(file.project, pageSourcePath(file));
  if (!page) return null;
  const module = getAuraState()?.actualModule;
  // The language of the page ON SCREEN belongs to the module of the page on screen.
  if (module && language) setActualLanguage(module, language);
  return page;
}

/**
 * Seeds from the app region, once per mounted page.
 *
 * @returns the page when it actually seeded, null when there was nothing to do (same page again, or
 * no page mounted).
 */
export function seedAuraStateFromHost(host: HTMLElement | null | undefined): IAuraPage | null {
  const file = mountedPageFile(host);
  if (!file) return null;

  const language = currentLanguage();
  const key = seedKey(file, language);
  if (key === lastSeed) return null;

  const page = seedAuraStateFromPage(file, language);
  if (!page) return null;
  lastSeed = key;

  const state = getAuraState();
  // Developer-facing, like every other diagnostic in these modules — and the one line that makes the
  // smoke test conclusive.
  console.info('[studio] aura state seeded from the running page', {
    project: state?.actualProject,
    module: state?.actualModule,
    device: state?.actualDevice,
    page: page.shortName,
    variation: `page${state?.actualLayout}${state?.actualDesignSystem}`,
    language,
  });
  return page;
}

/**
 * The header the app boots: `activeProfile` of `clientShell.regions.header` in l5/config.json.
 *
 * Separate from the page seed and async because it is a stor read, and nothing should wait on it —
 * the state fields the panels need are already written by then. Imported dynamically for the same
 * reason: the header helpers are only needed by this one field.
 *
 * An unreadable config answers null WITHOUT memoizing: on studio entry the project may still be
 * loading, and a permanent giving-up would leave the field empty for the whole session.
 */
export async function seedActiveHeader(project: number): Promise<string | null> {
  if (!project || project === headerSeeded) return null;
  try {
    const [io, core] = await Promise.all([
      import('/_102020_/l2/aura/plugins/helpers/headerConfigIo.js'),
      import('/_102020_/l2/aura/plugins/helpers/headerPluginCore.js'),
    ]);
    await io.ensureProjectLoaded(project);
    const config = await io.tryReadHeaderConfig(project);
    if (config === undefined) return null;
    const active = core.listProjectHeaders(config, project).find((entry) => entry.isActive);
    const profile = active?.profileName ?? null;
    setAuraState('actualHeader', profile);
    headerSeeded = project;
    return profile;
  } catch (err) {
    console.warn('[studio] could not read the active header from l5/config.json:', err);
    return null;
  }
}

/** Forgets both memos — studio mode left, the app region went away, or a test starts. */
export function resetAuraSeed(): void {
  lastSeed = '';
  headerSeeded = 0;
}
