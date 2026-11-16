/// <mls fileReference="_102020_/l2/aura/plugins/menuIconPicker.ts" enhancement="_102027_/l2/enhancementLit" />

// Icon picker of the menu editor (pluginMenuEditor), in three modes:
//   * Library  — search the Lucide catalog (102036 lucideArtwork, the one the apps tab draws with);
//   * Paste SVG — own markup, typed/pasted or read from an .svg file;
//   * Generate — drawings from agentGenerateMenuIcon, through the `generate` callback the editor passes.
// It only picks: the editor applies the choice through menuConfigCore (setMenuIcon / setMenuIconSvg).
//
// Own markup is inlined here for the preview, so it is drawn ONLY after it passes 102036
// isSafeMenuIconSvg, the same rule the apps tab applies when it draws.

import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { customElement, property, state } from 'lit/decorators.js';
import { searchMenuIcons } from '/_102020_/l2/aura/plugins/helpers/menuConfigCore.js';
import { isSafeMenuIconSvg } from '/_102036_/l2/inlineSvg.js';
import { describeMenuIconProblems, type MenuIconCandidate } from '/_102020_/l2/aura/agentManageMenu/helpers/generateMenuIconCore.js';

export type LucideArtwork = (name: string) => string | undefined;

export type MenuIconChoice =
  | { kind: 'lucide'; name: string }
  | { kind: 'svg'; markup: string }
  | { kind: 'none' };

let artworkPromise: Promise<LucideArtwork> | undefined;

/** The Lucide catalog, loaded once and only when an editor needs it (it is a large module). */
export function loadMenuIconArtwork(): Promise<LucideArtwork> {
  artworkPromise ??= import('/_102036_/l2/lucideArtwork.js').then(mod => mod.lucideArtwork);
  return artworkPromise;
}

/** A Lucide icon as inline SVG, or nothing when the name is empty or unknown. */
export function renderMenuIcon(name: string, artwork: LucideArtwork | undefined, size = 18): TemplateResult | typeof nothing {
  const drawing = name && artwork ? artwork(name) : undefined;
  if (drawing === undefined) return nothing;
  // unsafeSVG receives only the checked, versioned local catalog, never user text.
  return html`<svg width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${unsafeSVG(drawing)}</svg>`;
}

/** Own markup at a size, or nothing when it does not pass the rule (a rule-abiding root has no size). */
export function renderMenuIconSvg(markup: string, size = 18): TemplateResult | typeof nothing {
  const svg = markup.trim();
  if (!svg || !isSafeMenuIconSvg(svg)) return nothing;
  return html`${unsafeSVG(svg.replace(/^<svg/iu, `<svg width="${size}" height="${size}" aria-hidden="true"`))}`;
}

export interface MenuIconPickerLabels {
  library: string;
  paste: string;
  generate: string;
  search: string;
  noIcon: string;
  results: string;
  more: string;
  close: string;
  file: string;
  pastePlaceholder: string;
  valid: string;
  use: string;
  brief: string;
  generateButton: string;
  generating: string;
  regenerate: string;
  useOption: string;
  light: string;
  dark: string;
  fileError: string;
}

const PAGE = 60;
type Mode = 'library' | 'paste' | 'generate';

@customElement('aura--plugins--menu-icon-picker-102020')
export class MenuIconPicker extends LitElement {
  /** The current Lucide icon ('' = none). */
  @property({ type: String }) value = '';
  /** The current own SVG ('' = none). */
  @property({ type: String }) valueSvg = '';
  @property({ attribute: false }) artwork?: LucideArtwork;
  @property({ attribute: false }) labels!: MenuIconPickerLabels;
  /** Starting brief of the Generate mode (the page label and description). */
  @property({ type: String }) suggestion = '';
  /** Runs agentGenerateMenuIcon; absent = no Generate mode. */
  @property({ attribute: false }) generate?: (brief: string) => Promise<MenuIconCandidate[]>;

  @state() private _mode: Mode = 'library';
  @state() private _query = '';
  @state() private _limit = PAGE;
  @state() private _pasted = '';
  @state() private _brief = '';
  @state() private _candidates: MenuIconCandidate[] = [];
  @state() private _chosen = 0;
  @state() private _busy = false;
  @state() private _error = '';

  createRenderRoot() {
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._mode = this.valueSvg ? 'paste' : 'library';
    this._pasted = this.valueSvg;
    this._brief = this.suggestion;
  }

  firstUpdated() {
    this.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
  }

  private _emit(choice: MenuIconChoice): void {
    this.dispatchEvent(new CustomEvent<MenuIconChoice>('menu-icon-selected', { detail: choice, bubbles: true, composed: true }));
  }

  private _close(): void {
    this.dispatchEvent(new CustomEvent('menu-icon-close', { bubbles: true, composed: true }));
  }

  private async _onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!/\.svg$/iu.test(file.name)) {
      this._error = this.labels.fileError;
      return;
    }
    this._error = '';
    this._pasted = (await file.text()).trim();
  }

  private async _generate(): Promise<void> {
    if (!this.generate || this._busy) return;
    this._busy = true;
    this._error = '';
    try {
      this._candidates = await this.generate(this._brief.trim());
      this._chosen = 0;
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._busy = false;
    }
  }

  // ── rendering ─────────────────────────────────────────────────────────────

  private _renderModes(): TemplateResult {
    const modes: Array<[Mode, string]> = [['library', this.labels.library], ['paste', this.labels.paste]];
    if (this.generate) modes.push(['generate', this.labels.generate]);
    return html`
      <div class="inline-flex rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden text-xs" role="tablist">
        ${modes.map(([mode, label]) => html`
          <button type="button" role="tab" aria-selected=${this._mode === mode}
            class=${`px-3 h-8 ${this._mode === mode
              ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            @click=${() => { this._mode = mode; this._error = ''; }}>${label}</button>
        `)}
      </div>
    `;
  }

  /** The drawing at menu size and larger, on a light AND a dark surface: one that vanishes on dark shows here. */
  private _renderPreview(markup: string): TemplateResult {
    const tile = (dark: boolean) => html`
      <div class=${`flex-1 flex items-center gap-4 rounded-md border px-3 py-2 ${dark
        ? 'border-gray-700 bg-gray-900 text-gray-100'
        : 'border-gray-200 bg-white text-gray-900'}`}>
        ${renderMenuIconSvg(markup, 18)}
        ${renderMenuIconSvg(markup, 32)}
        <span class="ml-auto text-[11px] opacity-70">${dark ? this.labels.dark : this.labels.light}</span>
      </div>
    `;
    return html`<div class="flex gap-2">${tile(false)}${tile(true)}</div>`;
  }

  private _renderLibrary(): TemplateResult {
    const matches = searchMenuIcons(this._query);
    const cell = 'flex flex-col items-center gap-1 rounded-md border p-1.5 text-[10px] leading-tight break-all'
      + ' hover:bg-gray-50 dark:hover:bg-gray-800';
    return html`
      <input type="search" class="h-8 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-sm"
        placeholder=${this.labels.search} .value=${this._query}
        @input=${(event: Event) => { this._query = (event.target as HTMLInputElement).value; this._limit = PAGE; }}>
      <span class="text-[11px] text-gray-500 dark:text-gray-400" role="status">${this.labels.results.replace('{count}', String(matches.length))}</span>
      <div class="grid gap-1.5" style="grid-template-columns: repeat(auto-fill, minmax(4.5rem, 1fr));">
        ${matches.slice(0, this._limit).map(name => html`
          <button type="button" title=${name} aria-pressed=${!this.valueSvg && this.value === name}
            class=${`${cell} ${!this.valueSvg && this.value === name
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'}`}
            @click=${() => this._emit({ kind: 'lucide', name })}>
            ${renderMenuIcon(name, this.artwork, 20)}
            <span>${name}</span>
          </button>
        `)}
      </div>
      ${matches.length > this._limit ? html`
        <button type="button" class="self-start text-xs underline text-gray-600 dark:text-gray-300"
          @click=${() => { this._limit += PAGE; }}>${this.labels.more}</button>
      ` : nothing}
    `;
  }

  private _renderPaste(): TemplateResult {
    const markup = this._pasted.trim();
    const problems = markup ? describeMenuIconProblems(markup) : [];
    return html`
      <div class="flex items-center gap-2">
        <label class="inline-flex items-center h-8 px-3 rounded-md border border-gray-300 dark:border-gray-700 text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
          ${this.labels.file}
          <input type="file" accept=".svg,image/svg+xml" class="hidden" @change=${(event: Event) => void this._onFile(event)}>
        </label>
      </div>
      <textarea rows="4" class="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs font-mono"
        placeholder=${this.labels.pastePlaceholder} .value=${this._pasted}
        @input=${(event: Event) => { this._pasted = (event.target as HTMLTextAreaElement).value; }}></textarea>
      ${markup && !problems.length ? this._renderPreview(markup) : nothing}
      ${problems.length ? html`
        <ul class="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-2.5 py-1.5 text-xs text-red-700 dark:text-red-300 flex flex-col gap-0.5">
          ${problems.map(problem => html`<li>${problem}</li>`)}
        </ul>
      ` : nothing}
      <div class="flex items-center gap-2">
        ${markup && !problems.length ? html`<span class="text-xs text-emerald-700 dark:text-emerald-300">${this.labels.valid}</span>` : nothing}
        <button type="button" class="ml-auto h-8 px-3 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs disabled:opacity-50"
          ?disabled=${!markup || problems.length > 0}
          @click=${() => this._emit({ kind: 'svg', markup })}>${this.labels.use}</button>
      </div>
    `;
  }

  private _renderGenerate(): TemplateResult {
    const chosen = this._candidates[this._chosen];
    return html`
      <div class="flex items-center gap-2">
        <input type="text" class="h-8 flex-1 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-sm"
          placeholder=${this.labels.brief} .value=${this._brief}
          @input=${(event: Event) => { this._brief = (event.target as HTMLInputElement).value; }}
          @keydown=${(event: KeyboardEvent) => { if (event.key === 'Enter') void this._generate(); }}>
        <button type="button" class="h-8 px-3 rounded-md border border-gray-300 dark:border-gray-700 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          ?disabled=${this._busy || !this._brief.trim()} @click=${() => void this._generate()}>
          ${this._busy ? this.labels.generating : this._candidates.length ? this.labels.regenerate : this.labels.generateButton}
        </button>
      </div>
      ${this._candidates.length ? html`
        <div class="grid grid-cols-3 gap-2">
          ${this._candidates.map((candidate, index) => html`
            <button type="button" aria-pressed=${index === this._chosen} title=${candidate.note ?? ''}
              class=${`flex flex-col items-center justify-center gap-1 h-20 rounded-md border text-gray-800 dark:text-gray-100 ${index === this._chosen
                ? 'border-2 border-indigo-500'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              @click=${() => { this._chosen = index; }}>
              ${renderMenuIconSvg(candidate.svg, 28)}
              <span class="text-[10px] text-gray-500 dark:text-gray-400 px-1 truncate max-w-full">${candidate.note ?? index + 1}</span>
            </button>
          `)}
        </div>
        ${chosen ? this._renderPreview(chosen.svg) : nothing}
        <div class="flex">
          <button type="button" class="ml-auto h-8 px-3 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
            @click=${() => chosen && this._emit({ kind: 'svg', markup: chosen.svg })}>
            ${this.labels.useOption.replace('{n}', String(this._chosen + 1))}
          </button>
        </div>
      ` : nothing}
    `;
  }

  render(): TemplateResult {
    return html`
      <div class="flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 p-2.5"
        @keydown=${(event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); this._close(); } }}>
        <div class="flex items-center gap-2 flex-wrap">
          ${this._renderModes()}
          <button type="button" class="ml-auto h-8 px-3 rounded-md border border-gray-300 dark:border-gray-700 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
            aria-pressed=${!this.value && !this.valueSvg} @click=${() => this._emit({ kind: 'none' })}>${this.labels.noIcon}</button>
          <button type="button" class="h-8 px-2 text-xs underline text-gray-600 dark:text-gray-300" @click=${() => this._close()}>${this.labels.close}</button>
        </div>
        ${this._error ? html`<p class="text-xs text-red-700 dark:text-red-300">${this._error}</p>` : nothing}
        ${this._mode === 'library' ? this._renderLibrary() : this._mode === 'paste' ? this._renderPaste() : this._renderGenerate()}
      </div>
    `;
  }
}
