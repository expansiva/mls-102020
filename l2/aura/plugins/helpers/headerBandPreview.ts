/// <mls fileReference="_102020_/l2/aura/plugins/helpers/headerBandPreview.ts" enhancement="_blank"/>

// Rendering a header band inside the studio, for real.
//
// Extracted because two screens need it now — the header editor and the header LIST (one band per
// header of the project) — and every rule here was learned the hard way:
//
//   * no iframe: an `about:blank` frame does not inherit the studio's module resolution, so
//     `/_<prj>_/l2/…` imports 404 inside it (see the servicePreview iframe, which has a real src and
//     bundles with esbuild instead of importing by URL);
//   * the project's DS tokens are injected SCOPED to the host, so the band paints with the client's
//     colours without repainting the studio around it;
//   * `customElements.define` runs once per name per WINDOW: a tag already in the registry is
//     mounted from the registry, never re-imported (for a consumed preview the file is a stub).

import { collabImport } from '/_102027_/l2/collabImport.js';
import { tokensCssFromTheme, type IDesignSystemTokens } from '/_102029_/l2/designSystemBase.js';
import { AURA_HEADER_HEIGHT_PX } from '/_102033_/l2/shared/layout/auraHeaderCore.js';
import { scopeTokensCss } from '/_102020_/l2/aura/plugins/helpers/headerPluginCore.js';

export interface BandMountRequest {
  projectId: number;
  /** Folder/shortName of the compiled module to import (l2). */
  folder: string;
  shortName: string;
  /** Tag to instantiate — a variant, a preview attempt, or the default header. */
  tag: string;
  bootConfig: unknown;
  regionProps: Record<string, unknown>;
}

export interface BandBootInput {
  projectId: number;
  shellMode?: string;
  /** The project's real routes: the band filters them by the profile's selection. */
  navigation?: Array<{ label: string; href: string; description?: string }>;
  /** Locale codes the app runs, so the switcher has something to offer. */
  languages?: string[];
}

/**
 * Boot config for a band rendered outside the app.
 *
 * It carries the REAL navigation on purpose: `renderNavLinks()` filters this list by the profile's
 * `navLinks`, so without it a header with three links selected renders none.
 */
export function bandBootConfig(input: BandBootInput): Record<string, unknown> {
  return {
    projectId: String(input.projectId),
    moduleId: 'preview',
    basePath: '/preview',
    shellMode: input.shellMode ?? 'spa',
    device: 'desktop',
    routes: [],
    navigation: (input.navigation ?? []).map((entry) => ({ ...entry })),
    moduleLinks: [],
    languages: [...(input.languages ?? [])],
    layout: {
      regions: { desktop: { header: true, aside: true, content: true }, mobile: { header: true, aside: true, content: true } },
      asideMode: { desktop: 'inline', mobile: 'drawer' },
    },
  };
}

const tokensCache = new Map<number, string>();

/**
 * The project's design-system tokens compiled to CSS — the same compile the app does at boot.
 *
 * The first theme entry is used: which one the app runs is a project-level choice that does not
 * belong to a header screen, and the band only reads the `nav-*` family, which every entry defines.
 * An empty string means the project has no readable design system (the caller should say so).
 */
export async function projectTokensCss(projectId: number): Promise<string> {
  const cached = tokensCache.get(projectId);
  if (cached !== undefined) return cached;
  let css = '';
  try {
    const mod = await collabImport({ project: projectId, folder: '', shortName: 'designSystem' });
    const entry = (mod?.tokens ?? [])[0] as IDesignSystemTokens | undefined;
    css = entry ? tokensCssFromTheme(entry) : '';
  } catch {
    css = '';
  }
  tokensCache.set(projectId, css);
  return css;
}

/** Marks the host as the token scope and injects the project's tokens once per project. */
export async function applyProjectTokens(host: HTMLElement, projectId: number): Promise<boolean> {
  host.setAttribute('data-token-scope', String(projectId));
  const id = `header-preview-tokens-${projectId}`;
  if (document.getElementById(id)) return true;
  const css = scopeTokensCss(await projectTokensCss(projectId), `[data-token-scope="${projectId}"]`);
  if (!css) return false;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
  return true;
}

function bandElement(tag: string, bootConfig: unknown, regionProps: Record<string, unknown>): HTMLElement {
  const element = document.createElement(tag) as HTMLElement & { bootConfig?: unknown; regionProps?: unknown };
  element.bootConfig = bootConfig;
  element.regionProps = regionProps;
  return element;
}

/**
 * Mounts a compiled header in a band-sized host.
 *
 * The import is retried: a file written a moment ago may not be compiled yet, and collabImport
 * resolves by version — so the element only becomes defined once the build lands.
 *
 * @returns undefined on success, or the reason it could not render (for the caller to show).
 */
export async function mountHeaderBand(host: HTMLElement, request: BandMountRequest): Promise<string | undefined> {
  await applyProjectTokens(host, request.projectId);

  if (customElements.get(request.tag)) {
    host.replaceChildren(bandElement(request.tag, request.bootConfig, request.regionProps));
    return undefined;
  }

  // Imported by URL, with a stamp, BEFORE trying collabImport.
  //
  // collabImport derives the cache-busting version from the editor model, and it looks the model up
  // with `mls.actualLevel` (collabImport.getFileVersion) — here that is the level of the SERVICE (l5),
  // not the level of the file (l2). The lookup misses, the version comes back empty, and a file that
  // was just written locally is requested with no stamp: the studio answers with what it already had,
  // which for a brand-new variant is nothing. Hence "was not registered" for a file that is on disk.
  const url = `/_${request.projectId}_/l2/${request.folder ? `${request.folder}/` : ''}${request.shortName}`;
  let lastError = '';

  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      await import(/* @vite-ignore */ `${url}?t=${Date.now()}`);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      try {
        // Fallback: the published path, resolved by collabImport as usual.
        await collabImport({
          project: request.projectId,
          folder: request.folder,
          shortName: request.shortName,
          extension: '.ts',
        });
      } catch (fallback) {
        lastError = fallback instanceof Error ? fallback.message : String(fallback);
      }
    }
    if (customElements.get(request.tag)) break;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  if (!customElements.get(request.tag)) {
    return `${request.tag} was not registered${lastError ? ` — ${lastError}` : ' (is the file compiled?)'}`;
  }
  host.replaceChildren(bandElement(request.tag, request.bootConfig, request.regionProps));
  return undefined;
}

/** Height every band is rendered at — re-exported so a screen does not hardcode it. */
export { AURA_HEADER_HEIGHT_PX };
