/// <mls fileReference="_102020_/l2/aura/studio/pageVersionDiff.ts" enhancement="_102027_/l2/enhancementLit.ts"/>
// The difference between two versions of a page, opened in the details panel on the right (the Versions list in the
// Page tab is ~375px wide: too narrow for a code diff). Read-only: going back is the list's job.
//
// It receives both sides as text; it reads nothing and writes nothing. The details host moves this node into its own
// tree, so everything it needs comes in through its properties before it is opened.

import { html, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';

export const PAGE_VERSION_DIFF_TAG = 'aura--studio--page-version-diff-102020';

export interface IPageVersionSide {
  ts: string;
  defs: string | null;
}

let diffModelCount = 0;

@customElement('aura--studio--page-version-diff-102020')
export class PageVersionDiff extends StateLitElement {
  /** The page, as the header shows it (`module/page`). */
  @property({ attribute: false }) pageName = '';
  /** Which two versions (`15:30 → now`). */
  @property({ attribute: false }) label = '';
  @property({ attribute: false }) original: IPageVersionSide = { ts: '', defs: null };
  @property({ attribute: false }) modified: IPageVersionSide = { ts: '', defs: null };

  @state() private _file: 'ts' | 'defs' = 'ts';
  @state() private _sideBySide = true;

  private _editor: monaco.editor.IStandaloneDiffEditor | null = null;
  private _models: monaco.editor.ITextModel[] = [];

  connectedCallback(): void {
    super.connectedCallback();
    // Back in the page after a move: the editor was let go, and Lit does not render again by itself.
    if (!this._editor) this.requestUpdate();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    // The details host MOVES this node (it appends it to its wrapper, then appends the wrapper again): a
    // disconnect followed by a connect in the same task. Only a node that stays out lets the editor go.
    setTimeout(() => { if (!this.isConnected) this._dispose(); }, 0);
  }

  updated(): void {
    this._paint();
    // The first layout can run before the details panel has its size; measure again once it is painted.
    requestAnimationFrame(() => this._editor?.layout());
  }

  private _dispose(): void {
    this._editor?.dispose();
    this._editor = null;
    for (const model of this._models) model.dispose();
    this._models = [];
  }

  private _paint(): void {
    const host = this.querySelector('[data-version-diff]') as HTMLElement | null;
    if (!host || typeof monaco === 'undefined') return;
    if (!this._editor) {
      this._editor = monaco.editor.createDiffEditor(host, {
        automaticLayout: true,
        readOnly: true,
        renderSideBySide: this._sideBySide,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
      });
    }
    this._editor.updateOptions({ renderSideBySide: this._sideBySide });
    const original = this._file === 'ts' ? this.original.ts : this.original.defs ?? '';
    const modified = this._file === 'ts' ? this.modified.ts : this.modified.defs ?? '';
    // A diff editor just created has a model whose sides are still null: compare only real models.
    const current = this._editor.getModel();
    const shown = current?.original && current.modified
      ? { original: current.original.getValue(), modified: current.modified.getValue() }
      : null;
    if (shown && shown.original === original && shown.modified === modified) return;
    for (const model of this._models) model.dispose();
    diffModelCount += 1;
    const uri = (side: string) => monaco.Uri.parse(`file://server/pageVersionDiff_${diffModelCount}_${side}.ts`);
    this._models = [
      monaco.editor.createModel(original, 'typescript', uri('original')),
      monaco.editor.createModel(modified, 'typescript', uri('modified')),
    ];
    this._editor.setModel({ original: this._models[0], modified: this._models[1] });
  }

  render(): TemplateResult {
    const noDefs = this._file === 'defs' && this.original.defs === null && this.modified.defs === null;
    const tab = (active: boolean, label: string, pick: () => void) => html`
      <button type="button" class="text-xs px-2 py-1 rounded ${active ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:underline'} cursor-pointer"
        @click=${pick}>${label}</button>`;
    return html`
      <div class="flex flex-col gap-2 p-3 h-full min-h-[70vh] bg-white dark:bg-gray-900">
        <div class="flex items-baseline gap-2 flex-wrap">
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">${t('versions.diffTitle')}</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">${this.pageName}</span>
          <span class="ml-auto text-xs tabular-nums text-gray-500 dark:text-gray-400">${this.label}</span>
        </div>
        <div class="flex items-center gap-1 flex-wrap">
          ${tab(this._file === 'ts', t('versions.diffTs'), () => { this._file = 'ts'; })}
          ${tab(this._file === 'defs', t('versions.diffDefs'), () => { this._file = 'defs'; })}
          <span class="ml-auto"></span>
          ${tab(this._sideBySide, t('versions.diffSideBySide'), () => { this._sideBySide = true; })}
          ${tab(!this._sideBySide, t('versions.diffInline'), () => { this._sideBySide = false; })}
        </div>
        ${noDefs ? html`<span class="text-xs text-gray-500 dark:text-gray-400">${t('versions.diffNoDefs')}</span>` : nothing}
        <div data-version-diff class="flex-1 min-h-[60vh] w-full rounded border border-gray-200 dark:border-gray-800 overflow-hidden"></div>
      </div>
    `;
  }
}
