/// <mls fileReference="_102020_/l2/aura/helpers/pageCombination.ts" enhancement="_blank" />

// UX + UI → page folder, and the name of the combination.
//
// `page{UX}{UI}` (page12 = UX 1, UI 2) is the NAME of a combination — what the Studio shows. The pages
// themselves are generated per UX only: the UI (design system) just swaps tokens, so every page of
// UX N lives in `page{N}1`. Finding a page file or building its link uses the UX alone.
//
// The `1` in the folder is a leftover of the old genome (one folder per DS); renaming the folders is
// a separate migration.

/** The UI slot every page folder carries: pages are never generated per UI. */
export const PAGE_FOLDER_UI = 1;

const VARIATION_SEGMENT = /page\d+(\/|$)/;

/** Folder segment that holds the pages of a UX: `page{ux}1`. */
export function pageFolderName(ux: number | string): string {
  return `page${ux}${PAGE_FOLDER_UI}`;
}

/** Name of the UX + UI combination shown to people: `page{ux}{ui}` (UI absent = the folder's). */
export function combinationName(ux: number | string, ui?: number | string | null): string {
  return `page${ux}${ui ?? PAGE_FOLDER_UI}`;
}

/** A page folder with its variation segment pointing at the UX: `cafeFlow/web/desktop/page12` → `…/page11`. */
export function withUxFolder(folder: string, ux: number | string): string {
  return folder.replace(VARIATION_SEGMENT, `${pageFolderName(ux)}$1`);
}

/** The shell's page number for a UX (`mls.sites.setPage`): 11, 21, 31… */
export function sitesPageNumber(ux: number | string): number {
  return Number(pageFolderName(ux).slice('page'.length));
}
