/// <mls fileReference="_102020_/l2/aura/plugins/helpers/dsLivePreview.ts" enhancement="_blank"/>

// Live preview of design-system tokens while the L5 → UI form is edited.
//
// The studio runs INSIDE the app's document, and the app paints from ONE `<style id="ds-tokens">`
// written at boot (`_102033_/l2/shared/bootstrap.ts`). Swapping that style's text repaints every
// component (light DOM + `var(--token)`), dark mode included — so the form can show its edits
// without save + F5:
//
//   * apply   — swaps ONLY `textContent`; the active DS (`dataset.designSystem`) stays the same;
//   * restore — the edit ended unsaved: put the boot CSS back, unless someone switched the DS
//               meanwhile (mls.sites.setDS, Ctrl+Alt+D, header select) — never undo that choice;
//   * commit  — the edit was saved: what is on screen IS the saved DS, drop the snapshot.
//
// Pure: the document is a minimal structural type so Node tests need no DOM.

export interface LivePreviewStyle {
  textContent: string | null;
  dataset: Record<string, string | undefined>;
}

export interface LivePreviewDocument {
  getElementById: (id: string) => LivePreviewStyle | null;
}

export const DS_TOKENS_STYLE_ID = 'ds-tokens';

function sameName(a: string | undefined, b: string | undefined): boolean {
  const x = (a ?? '').trim().toLowerCase();
  return x !== '' && x === (b ?? '').trim().toLowerCase();
}

export interface CanPreviewInput {
  /** Project the editor is bound to. */
  editorProjectId: number | null | undefined;
  /** Project the running app booted with (`window.collabBoot.projectId`); absent = no app here. */
  bootProjectId: number | string | null | undefined;
  /** ORIGINAL name of the DS being edited (not the name field — it may be mid-rename). */
  entryName: string | undefined;
  doc: LivePreviewDocument;
}

/** Only the app's ACTIVE DS, of the SAME project, is previewed — anything else is a silent no-op. */
export function canPreview({ editorProjectId, bootProjectId, entryName, doc }: CanPreviewInput): boolean {
  if (editorProjectId == null || bootProjectId == null) return false;
  if (Number(editorProjectId) !== Number(bootProjectId)) return false;
  const style = doc.getElementById(DS_TOKENS_STYLE_ID);
  if (!style) return false;
  return sameName(style.dataset.designSystem, entryName);
}

export interface LivePreview {
  /** True while a snapshot is held (something was applied and not yet restored/committed). */
  readonly active: boolean;
  apply(css: string): void;
  restore(): void;
  commit(newName?: string): void;
}

export function createLivePreview(doc: LivePreviewDocument): LivePreview {
  let snapshot: { css: string | null; designSystem: string | undefined } | null = null;

  return {
    get active() { return snapshot !== null; },

    apply(css: string) {
      const style = doc.getElementById(DS_TOKENS_STYLE_ID);
      if (!style) return;
      if (!snapshot) snapshot = { css: style.textContent, designSystem: style.dataset.designSystem };
      style.textContent = css;
    },

    restore() {
      if (!snapshot) return;
      const style = doc.getElementById(DS_TOKENS_STYLE_ID);
      // The active DS changed under us — the new choice owns the style now.
      if (style && style.dataset.designSystem === snapshot.designSystem) style.textContent = snapshot.css;
      snapshot = null;
    },

    commit(newName?: string) {
      if (!snapshot) return;
      const style = doc.getElementById(DS_TOKENS_STYLE_ID);
      const name = newName?.trim();
      // Renamed on save: keep getDS()/rotate pointing at the entry that is on screen.
      if (style && name && style.dataset.designSystem === snapshot.designSystem) style.dataset.designSystem = name;
      snapshot = null;
    },
  };
}
