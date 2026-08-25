/// <mls fileReference="_102020_/l2/aura/plugins/selectHeader.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

// The HEADER knob of the l5 service: the headers of the client app.
//
// A project can keep SEVERAL headers — one per profile of `clientShell.regions.header` — with exactly
// one active (`activeProfile`). That is what makes a header non-destructive: generating another one no
// longer overwrites the one you liked (a seasonal band, a campaign band, the plain one).
//
// Knob grammar, the same as the UI (design system) knob:
//   0        -> the list: every header of the project, its band rendered for real, which is active
//   1..N     -> edit that one (the header editor, pointed at that profile)
//   last '+' -> Add: name it and generate
//
// What is NOT here: switching by date. `activeProfile` moves when someone activates a header and the
// app is republished — there is no schedule anywhere in the platform.

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { AURA_HEADER_HEIGHT_PX } from '/_102033_/l2/shared/layout/auraHeaderCore.js';
import {
  findCssVars,
  findDeclaredCssVars,
  findInventedRoutes,
  headerPaths,
  slugVariant,
} from '/_102020_/l2/aura/agentManageHeader/helpers/generateHeaderCore.js';
import {
  listProjectHeaders,
  readProjectRoutes,
  type ProjectHeaderEntry,
} from '/_102020_/l2/aura/plugins/helpers/headerPluginCore.js';
import { ensureProjectLoaded, readHeaderConfig } from '/_102020_/l2/aura/plugins/helpers/headerConfigIo.js';
import { bandBootConfig, mountHeaderBand, projectTokensCss } from '/_102020_/l2/aura/plugins/helpers/headerBandPreview.js';
import { readRawSource } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import '/_102020_/l2/aura/plugins/navHeader.js';
import '/_102020_/l2/aura/plugins/pluginProjectHeader.js';

/// **collab_i18n_start**
const message_en = {
  title: 'Header',
  desc: 'The headers of this app — one is active, the others are kept.',
  needsProject: 'Select a project first to see its headers.',
  allTitle: 'All headers',
  allDesc: 'Every header of this app. Open one to edit it or make it the default.',
  addTitle: 'New header',
  addDesc: 'Name it and generate — the current header is not touched.',
  loading: 'Loading headers…',
  none: 'This app has no header of its own yet.',
  active: 'ACTIVE',
  nameLabel: 'Name',
  namePlaceholder: 'e.g. christmas',
  create: 'Create and generate',
  defaultName: 'default',
  staleRoutes: 'links to routes that no longer exist:',
  staleTokens: 'uses design-system tokens that no longer exist:',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    title: 'Header',
    desc: 'Os headers deste app — um está ativo, os outros ficam guardados.',
    needsProject: 'Selecione um projeto para ver os headers.',
    allTitle: 'Todos os headers',
    allDesc: 'Todos os headers deste app. Abra um para editar ou definir como padrão.',
    addTitle: 'Novo header',
    addDesc: 'Dê um nome e gere — o header atual não é tocado.',
    loading: 'Carregando headers…',
    none: 'Este app ainda não tem header próprio.',
    active: 'ATIVO',
    nameLabel: 'Nome',
    namePlaceholder: 'ex. natal',
    create: 'Criar e gerar',
    defaultName: 'padrão',
    staleRoutes: 'linka rotas que não existem mais:',
    staleTokens: 'usa tokens do design system que não existem mais:',
  },
};
/// **collab_i18n_end**

@customElement('aura--plugins--select-header-102020')
export class PluginSelectHeader extends StateLitElement {

  @property({ attribute: false }) projectId: number | null = null;
  @property({ attribute: false }) value: number | null = 0;

  @state() private _entries: ProjectHeaderEntry[] = [];
  @state() private _routes: Array<{ label: string; href: string }> = [];
  @state() private _loading = false;
  @state() private _error = '';
  /** Per profile: why activating it would be a downgrade (stale routes/tokens). Empty = healthy. */
  @state() private _health: Record<string, string[]> = {};
  @state() private _newName = '';
  /** Variant being created — while set, the editor below is generating INTO it. */
  @state() private _creating = '';

  private msg: MessageType = message_en;
  private _mounted = new Map<string, string>();

  createRenderRoot() { return this; }

  willUpdate(changed: Map<string, unknown>) {
    if (changed.has('projectId')) {
      this._entries = [];
      this._creating = '';
      if (this.projectId) void this._load(this.projectId);
    }
  }

  updated() {
    if (this._isAll) void this._mountBands();
  }

  // ── data ──────────────────────────────────────────────────────────────────

  private async _load(projectId: number): Promise<void> {
    this._loading = true;
    this._error = '';
    try {
      await ensureProjectLoaded(projectId);
      const config = await readHeaderConfig(projectId);
      // Only the project's own headers are editable here; a master's band (studio) is not ours.
      this._entries = listProjectHeaders(config, projectId).filter((entry) => entry.isProjectHeader);
      this._routes = readProjectRoutes(config, projectId);
      this._emitConfig();
      void this._checkHealth();
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
      this._entries = [];
    } finally {
      this._loading = false;
    }
  }

  /** Tells the knob how many slots there are (0=All, 1..N, last='+'), like the DS panel does. */
  private _emitConfig(): void {
    const labels: Record<number, string> = { 0: 'All' };
    this._entries.forEach((entry, i) => { labels[i + 1] = entry.variant || this.msg.defaultName; });
    labels[this._entries.length + 1] = '+';
    this.dispatchEvent(new CustomEvent('header-config', {
      detail: { min: 0, max: this._entries.length + 1, labels },
      bubbles: true,
      composed: true,
    }));
  }

  private _select(value: number): void {
    this.dispatchEvent(new CustomEvent('select-header', { detail: { value }, bubbles: true, composed: true }));
  }

  /**
   * Why activating a header would be a downgrade.
   *
   * A header that is not active ages in silence: the routes it links can disappear and the tokens it
   * paints with can leave the design system. That breaks when it is ACTIVATED, not when it was
   * generated — so it is checked here, before the switch, and reported as a warning (the reviewer
   * decides; a stale header is still better than no header).
   */
  private async _checkHealth(): Promise<void> {
    if (!this.projectId) return;
    const hrefs = new Set(this._routes.map((route) => route.href));
    // The DS css DECLARES the tokens (`--nav-bg: #fff`); findCssVars only sees `var()` references,
    // which would leave the set nearly empty and the check meaningless.
    const tokens = new Set(findDeclaredCssVars(await projectTokensCss(this.projectId)));
    const health: Record<string, string[]> = {};

    for (const entry of this._entries) {
      const reasons: string[] = [];
      const gone = entry.navLinks.filter((href) => !hrefs.has(href));
      if (gone.length) reasons.push(`${this.msg.staleRoutes} ${gone.join(', ')}`);

      if (entry.source) {
        try {
          const source = await readRawSource(`_${this.projectId}_/${entry.source}`);
          const inventedRoutes = findInventedRoutes(source, [...hrefs]);
          if (inventedRoutes.length) reasons.push(`${this.msg.staleRoutes} ${inventedRoutes.join(', ')}`);
          if (tokens.size) {
            const unknown = findCssVars(source)
              .filter((name) => !name.startsWith('--aura-') && !tokens.has(name));
            if (unknown.length) reasons.push(`${this.msg.staleTokens} ${unknown.join(', ')}`);
          }
        } catch { /* unreadable source: nothing to check, the mount will say so */ }
      }
      if (reasons.length) health[entry.profileName] = reasons;
    }
    this._health = health;
  }

  private _startCreate(): void {
    this._error = '';
    try {
      const slug = slugVariant(this._newName);
      if (this._entries.some((entry) => entry.variant === slug)) {
        throw new Error(`"${slug}" already exists in this app`);
      }
      this._creating = slug;
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    }
  }

  // ── scenarios ─────────────────────────────────────────────────────────────

  private get _isAll(): boolean { return (this.value ?? 0) === 0; }
  private get _isAdd(): boolean { return (this.value ?? 0) === this._entries.length + 1; }
  private get _selected(): ProjectHeaderEntry | null {
    const value = this.value ?? 0;
    if (value <= 0 || value > this._entries.length) return null;
    return this._entries[value - 1];
  }

  render() {
    this.msg = messages[this.getMessageKey(messages)] ?? message_en;
    if (!this.projectId) return this._frame(this.msg.needsProject);
    if (this._loading) return this._frame(this.msg.loading);
    if (this._isAll) return this._renderAll();
    if (this._isAdd) return this._renderAdd();
    return this._renderEdit();
  }

  private _frame(text: string) {
    return html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${text}</span>`;
  }

  private _navHeader(itemName: string, desc: string, value: number) {
    return html`
      <aura--plugins--nav-header-102020
        .fixedLabel=${this.msg.title}
        .itemName=${itemName}
        .desc=${desc}
        .value=${value}
        .min=${0}
        .max=${this._entries.length + 1}
        @nav-change=${(e: CustomEvent) => this._select(e.detail.value)}
      ></aura--plugins--nav-header-102020>
    `;
  }

  private _renderAll() {
    return html`
      <div class="flex flex-col gap-3">
        ${this._navHeader(this.msg.allTitle, this.msg.allDesc, 0)}
        ${this._error ? this._renderError() : nothing}
        ${this._entries.length === 0
          ? this._frame(this.msg.none)
          : html`<div class="flex flex-col gap-3">${this._entries.map((entry, i) => this._renderCard(entry, i + 1))}</div>`}
        ${this._renderAddCard()}
      </div>
    `;
  }

  /**
   * One header of the app. The whole card navigates to it — no Edit/Activate buttons here: the list
   * is for choosing WHICH header you are looking at, and what to do with it belongs to its own
   * screen (that is where "Definir como padrão" lives).
   */
  private _renderCard(entry: ProjectHeaderEntry, value: number) {
    const reasons = this._health[entry.profileName] ?? [];
    return html`
      <section
        role="button"
        tabindex="0"
        class="text-left rounded-lg border overflow-hidden cursor-pointer transition-colors
          hover:border-indigo-400 dark:hover:border-indigo-500
          ${entry.isActive
            ? 'border-indigo-400 dark:border-indigo-500/70'
            : 'border-gray-200 dark:border-gray-800'}"
        @click=${() => this._select(value)}
        @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') this._select(value); }}
      >
        <header class="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
          <span class="text-sm font-medium">${entry.variant || this.msg.defaultName}</span>
          ${entry.isActive ? html`
            <span class="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded
              bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">${this.msg.active}</span>
          ` : nothing}
          <span class="text-[11px] font-mono text-gray-400 dark:text-gray-500 ml-auto truncate">${entry.tag}</span>
        </header>

        <div class="p-3 flex flex-col gap-2">
          <!-- pointer-events:none — this is a PICTURE of the header. Live, its links would navigate
               the studio and its user menu would open, from a card whose job is to be clicked. -->
          <div
            data-band=${entry.profileName}
            class="rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-950"
            style="height:${AURA_HEADER_HEIGHT_PX}px;pointer-events:none"
          ></div>

          ${reasons.length ? html`
            <ul class="rounded-md border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-300 flex flex-col gap-0.5">
              ${reasons.map((reason) => html`<li>${reason}</li>`)}
            </ul>` : nothing}
        </div>
      </section>
    `;
  }

  private _renderAddCard() {
    return html`
      <button type="button"
        class="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-3 py-3 text-sm
               text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        @click=${() => this._select(this._entries.length + 1)}
      >+ ${this.msg.addTitle}</button>
    `;
  }

  private _renderError() {
    return html`
      <p class="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-2.5 py-1.5 text-sm text-red-700 dark:text-red-300">
        ${this._error}
      </p>
    `;
  }

  /** Edit one header: the editor, pointed at that profile and that variant. */
  private _renderEdit() {
    const entry = this._selected;
    if (!entry) return this._frame(this.msg.none);
    return html`
      <div class="flex flex-col gap-3">
        ${this._navHeader(entry.variant || this.msg.defaultName, this.msg.desc, this.value ?? 0)}
        <aura--plugins--plugin-project-header-102020
          autoPrepare="true"
          .project=${this.projectId ?? 0}
          .profileName=${entry.profileName}
          .variant=${entry.variant ?? ''}
          @header-applied=${() => { if (this.projectId) void this._load(this.projectId); }}
          @header-activated=${() => { if (this.projectId) void this._load(this.projectId); }}
        ></aura--plugins--plugin-project-header-102020>
      </div>
    `;
  }

  /**
   * Add: name first, then the very same editor generating into the new variant.
   *
   * The name has to come first because it decides the file, the tag and the class — there is nothing
   * to generate into before it exists.
   */
  private _renderAdd() {
    if (this._creating) {
      return html`
        <div class="flex flex-col gap-3">
          ${this._navHeader(this._creating, this.msg.addDesc, this.value ?? 0)}
          <aura--plugins--plugin-project-header-102020
            autoPrepare="true"
            .project=${this.projectId ?? 0}
            .profileName=${this._creating}
            .variant=${this._creating}
            @header-applied=${() => void this._onCreated()}
          ></aura--plugins--plugin-project-header-102020>
        </div>
      `;
    }
    return html`
      <div class="flex flex-col gap-3">
        ${this._navHeader(this.msg.addTitle, this.msg.addDesc, this.value ?? 0)}
        ${this._error ? this._renderError() : nothing}
        <label class="flex flex-col gap-1 text-sm">
          <span class="text-gray-600 dark:text-gray-300">${this.msg.nameLabel}</span>
          <input
            class="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-sm"
            placeholder=${this.msg.namePlaceholder}
            .value=${this._newName}
            @input=${(e: Event) => { this._newName = (e.target as HTMLInputElement).value; }}
          />
        </label>
        <button type="button"
          class="self-start rounded-md bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-sm text-white"
          @click=${() => this._startCreate()}>${this.msg.create}</button>
      </div>
    `;
  }

  private async _onCreated(): Promise<void> {
    const slug = this._creating;
    this._creating = '';
    if (!this.projectId) return;
    await this._load(this.projectId);
    const index = this._entries.findIndex((entry) => entry.variant === slug);
    this.dispatchEvent(new CustomEvent('header-created', {
      detail: { value: index >= 0 ? index + 1 : 0 },
      bubbles: true,
      composed: true,
    }));
  }

  // ── bands ─────────────────────────────────────────────────────────────────

  /** One real band per card. Each header has its own file and tag, so they coexist in the registry. */
  private async _mountBands(): Promise<void> {
    if (!this.projectId) return;
    for (const entry of this._entries) {
      const host = this.querySelector(`[data-band="${entry.profileName}"]`) as HTMLElement | null;
      if (!host) continue;
      const signature = JSON.stringify([entry.tag, entry.brand ?? null, entry.actions, entry.navLinks, entry.locales]);
      if (this._mounted.get(entry.profileName) === signature) continue;
      this._mounted.set(entry.profileName, signature);

      const paths = headerPaths(this.projectId, { variant: entry.variant });
      const shortName = paths.fileReference.split('/').pop()?.replace(/\.ts$/u, '') ?? 'appHeader';
      const error = await mountHeaderBand(host, {
        projectId: this.projectId,
        folder: 'layout',
        shortName,
        tag: entry.tag,
        bootConfig: bandBootConfig({
          projectId: this.projectId,
          navigation: this._routes,
          languages: entry.locales,
        }),
        regionProps: {
          ...(entry.brand ? { brand: entry.brand } : {}),
          actions: entry.actions,
          navLinks: entry.navLinks,
          locales: entry.locales,
          heightPx: entry.heightPx ?? AURA_HEADER_HEIGHT_PX,
        },
      });
      if (error) host.textContent = error;
    }
  }
}
