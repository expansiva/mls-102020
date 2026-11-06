/// <mls fileReference="_102020_/l2/aura/plugins/pluginMenuEditor.ts" enhancement="_102027_/l2/enhancementLit" />

// The menu EDITOR of one module (TASK-102020-config-menu-editor). Opened by the "Menu" section of the Module
// knob (selectModule) in the RIGHT-HAND DETAILS panel (`openElementInServiceDetails`), like the header editor:
// the knob column is ~375px and this screen is a table.
//
// `l5/config.json` is the source of truth of the menu (decided 30/10/2026). The editor works on a copy of the
// module entry and writes it back on Save. Every rule lives in `helpers/menuConfigCore.ts` (pure, tested);
// this file is DOM + I/O only.
//
// Saving re-reads the config and replaces only the menu fields of this module, so an edit made elsewhere
// (the header editor, another module) is not lost. If the menu of THIS module changed since the editor
// loaded it, nothing is written and the screen offers a reload.

import { html, nothing, svg, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { PluginBaseModule } from '/_102027_/l2/pluginBaseModule.js';
import { ensureProjectLoaded, readConfig, writeConfig } from '/_102020_/l2/aura/plugins/helpers/configIo.js';
import {
  findModuleEntry,
  fixMenuIssue,
  hideFromMenu,
  moduleMenuFingerprint,
  moveMenuItem,
  previewForActor,
  readModuleMenu,
  replaceModuleMenu,
  setHomePage,
  setLanding,
  setMenuActor,
  setMenuDescription,
  setMenuLabel,
  showInMenu,
  type MenuEditResult,
  type MenuIssue,
  type ModuleEntry,
} from '/_102020_/l2/aura/plugins/helpers/menuConfigCore.js';

/// **collab_i18n_start**
const message_en = {
  title: 'Menu',
  noProject: 'Select a project first.',
  noModule: 'This module has no entry in l5/config.json.',
  loading: 'Loading…',
  issues: 'Inconsistencies found',
  fix: 'Fix',
  fixAll: 'Fix all',
  issue: {
    'nav-without-page': 'Menu item without a page in frontend.pages',
    'title-differs': 'Route title differs from the menu label',
    'href-differs': 'Menu link differs from the page route',
    'actors-differ': 'Roles of the menu item differ from the roles of the page',
    'landing-orphan': 'Start page of a role points to a page it does not see',
    'landing-flag-differs': 'Start-page mark of the menu item is out of date',
  } as Record<string, string>,
  menu: 'In the menu',
  label: 'Label',
  description: 'Description',
  roles: 'Who sees',
  up: 'Move up',
  down: 'Move down',
  hide: 'Hide from menu',
  hidden: 'Out of the menu (route still works)',
  show: 'Show in menu',
  noHidden: 'Every page is in the menu.',
  home: 'Page of /{module}',
  homeHint: 'The page that opens at the module address. Reordering the menu does not change it.',
  landings: 'Start page per role',
  landingsHint: 'Kept in the config, but the app does not use it yet.',
  noLanding: '(none)',
  preview: 'How a role sees the menu',
  start: 'start',
  save: 'Save',
  discard: 'Discard',
  reload: 'Reload',
  saved: 'Saved in l5/config.json.',
  unsaved: 'Unsaved changes',
  nothingToSave: 'Nothing changed.',
  conflict: 'The menu of this module changed in l5/config.json since it was loaded. Nothing was written: reload to edit the current version.',
  refused: {
    'empty-label': 'The label cannot be empty.',
    'last-actor': 'A page needs at least one role: with none, the app shows it to everybody.',
    'actor-does-not-see': 'That role does not see this page.',
    'not-in-menu': 'This page is not in the menu.',
    'already-in-menu': 'This page is already in the menu.',
    'no-page': 'This page has no route.',
  } as Record<string, string>,
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    title: 'Menu',
    noProject: 'Selecione um projeto primeiro.',
    noModule: 'Este módulo não tem entrada no l5/config.json.',
    loading: 'Carregando…',
    issues: 'Inconsistências encontradas',
    fix: 'Corrigir',
    fixAll: 'Corrigir todas',
    issue: {
      'nav-without-page': 'Item do menu sem página em frontend.pages',
      'title-differs': 'Título da rota diferente do rótulo do menu',
      'href-differs': 'Link do menu diferente da rota da página',
      'actors-differ': 'Papéis do item do menu diferentes dos papéis da página',
      'landing-orphan': 'Página inicial de um papel aponta para página que ele não vê',
      'landing-flag-differs': 'Marca de página inicial do item do menu desatualizada',
    } as Record<string, string>,
    menu: 'No menu',
    label: 'Rótulo',
    description: 'Descrição',
    roles: 'Quem vê',
    up: 'Subir',
    down: 'Descer',
    hide: 'Ocultar do menu',
    hidden: 'Fora do menu (a rota continua funcionando)',
    show: 'Mostrar no menu',
    noHidden: 'Todas as páginas estão no menu.',
    home: 'Página de /{module}',
    homeHint: 'A página que abre no endereço do módulo. Reordenar o menu não a altera.',
    landings: 'Página inicial por papel',
    landingsHint: 'Fica gravada no config, mas o app ainda não a usa.',
    noLanding: '(nenhuma)',
    preview: 'Como um papel vê o menu',
    start: 'inicial',
    save: 'Salvar',
    discard: 'Descartar',
    reload: 'Recarregar',
    saved: 'Salvo no l5/config.json.',
    unsaved: 'Alterações não salvas',
    nothingToSave: 'Nada mudou.',
    conflict: 'O menu deste módulo mudou no l5/config.json depois que foi carregado. Nada foi gravado: recarregue para editar a versão atual.',
    refused: {
      'empty-label': 'O rótulo não pode ficar vazio.',
      'last-actor': 'Uma página precisa de pelo menos um papel: sem nenhum, o app mostra para todos.',
      'actor-does-not-see': 'Esse papel não vê esta página.',
      'not-in-menu': 'Esta página não está no menu.',
      'already-in-menu': 'Esta página já está no menu.',
      'no-page': 'Esta página não tem rota.',
    } as Record<string, string>,
  },
};
/// **collab_i18n_end**

export const pluginData: mls.plugin.IPluginData = {
  title: 'Menu',
  getSvg(): TemplateResult {
    return svg`
      <svg height="22px" width="22px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 6.5h16M4 12h16M4 17.5h10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    `;
  },
};

const INPUT = 'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900'
  + ' px-2 py-1 text-sm';
const BUTTON = 'rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm'
  + ' hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50';
const BUTTON_PRIMARY = 'rounded-md bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-sm text-white'
  + ' disabled:opacity-50';
const ICON_BUTTON = 'inline-flex items-center justify-center w-6 h-6 rounded border border-gray-300 dark:border-gray-700'
  + ' text-xs hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30';
const CARD = 'rounded-lg border border-gray-200 dark:border-gray-800 p-3 flex flex-col gap-2';

@customElement('aura--plugins--plugin-menu-editor-102020')
export class PluginMenuEditor extends PluginBaseModule {

  @property({ type: Boolean }) autoPrepare = false;
  @property({ type: String }) msize = '';
  /** Project whose `l5/config.json` is edited; `mls.actualProject` is only the fallback. */
  @property({ type: Number }) project = 0;
  /** The module whose menu is edited (`projects[<project>].modules[moduleId]`). */
  @property({ attribute: false }) moduleId = '';

  @state() private _projectId = 0;
  /** The entry as read from the config: what Discard returns to and what Save compares against. */
  @state() private _original?: ModuleEntry;
  /** The entry being edited. */
  @state() private _entry?: ModuleEntry;
  @state() private _loading = false;
  @state() private _busy = false;
  @state() private _error = '';
  @state() private _notice = '';
  @state() private _conflict = false;
  @state() private _previewActor = '';
  /** Row being dragged in the menu table. */
  private _dragging = '';

  private msg: MessageType = message_en;

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    if (this.autoPrepare) void this.prepare();
  }

  /** The selectModule section reuses this element when another module is picked: load that one. */
  willUpdate(changed: Map<string, unknown>) {
    if (!this._projectId) return;
    if (!changed.has('project') && !changed.has('moduleId')) return;
    void this.prepare();
  }

  async prepare(): Promise<void> {
    this.msg = messages[this.getMessageKey(messages)] ?? message_en;
    this._projectId = Number(this.project) || mls.actualProject || 0;
    if (!this._projectId) return;
    await ensureProjectLoaded(this._projectId);
    await this._reload();
  }

  private async _reload(): Promise<void> {
    this._loading = true;
    this._error = '';
    this._notice = '';
    this._conflict = false;
    try {
      const entry = findModuleEntry(await readConfig(this._projectId), this._projectId, this.moduleId);
      this._original = entry;
      this._entry = entry;
      const actors = entry ? readModuleMenu(entry).actors : [];
      if (!actors.includes(this._previewActor)) this._previewActor = actors[0] ?? '';
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
      this._original = undefined;
      this._entry = undefined;
    } finally {
      this._loading = false;
    }
  }

  private get _dirty(): boolean {
    return moduleMenuFingerprint(this._entry) !== moduleMenuFingerprint(this._original);
  }

  /** Takes an edit of menuConfigCore: applied, or refused with the reason on screen. */
  private _apply(result: MenuEditResult): void {
    this._notice = '';
    if (result.refused) {
      this._error = this.msg.refused[result.refused] ?? result.refused;
      this.requestUpdate();
      return;
    }
    this._error = '';
    this._entry = result.entry;
  }

  private _edit(edit: (entry: ModuleEntry) => MenuEditResult): void {
    if (this._entry) this._apply(edit(this._entry));
  }

  private _fixAll(issues: MenuIssue[]): void {
    let entry = this._entry;
    if (!entry) return;
    for (const issue of issues) entry = fixMenuIssue(entry, issue).entry;
    this._apply({ entry });
  }

  private async _save(): Promise<void> {
    if (!this._entry || this._busy) return;
    if (!this._dirty) {
      this._notice = this.msg.nothingToSave;
      return;
    }
    this._busy = true;
    this._error = '';
    this._notice = '';
    try {
      // Read again: the file may have changed under the editor (another module, the header, a run).
      const fresh = await readConfig(this._projectId);
      const current = findModuleEntry(fresh, this._projectId, this.moduleId);
      if (moduleMenuFingerprint(current) !== moduleMenuFingerprint(this._original)) {
        this._conflict = true;
        this._error = this.msg.conflict;
        return;
      }
      await writeConfig(this._projectId, replaceModuleMenu(fresh, this._projectId, this.moduleId, this._entry));
      this._original = this._entry;
      this._notice = this.msg.saved;
      this.dispatchEvent(new CustomEvent('menu-saved', { detail: { moduleId: this.moduleId }, bubbles: true, composed: true }));
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._busy = false;
    }
  }

  private _discard(): void {
    this._entry = this._original;
    this._error = '';
    this._notice = '';
  }

  // ── drag to reorder ───────────────────────────────────────────────────────

  private _onDrop(event: DragEvent, targetIndex: number): void {
    event.preventDefault();
    const pageId = this._dragging;
    this._dragging = '';
    if (pageId) this._edit(entry => moveMenuItem(entry, pageId, targetIndex));
  }

  // ── rendering ─────────────────────────────────────────────────────────────

  private _renderIssues(issues: MenuIssue[]): TemplateResult | typeof nothing {
    if (!issues.length) return nothing;
    return html`
      <div class="rounded-md border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-2.5 flex flex-col gap-1.5">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-amber-800 dark:text-amber-300">${this.msg.issues} (${issues.length})</span>
          <button type="button" class="ml-auto text-xs underline text-amber-800 dark:text-amber-300" @click=${() => this._fixAll(issues)}>
            ${this.msg.fixAll}
          </button>
        </div>
        ${issues.map(issue => html`
          <div class="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
            <span>${this.msg.issue[issue.code] ?? issue.code}:</span>
            <span class="font-mono">${issue.pageId}${issue.actorId ? ` (${issue.actorId})` : ''}</span>
            <button type="button" class="ml-auto underline" @click=${() => this._edit(entry => fixMenuIssue(entry, issue))}>${this.msg.fix}</button>
          </div>
        `)}
      </div>
    `;
  }

  private _renderMenuTable(): TemplateResult {
    const view = readModuleMenu(this._entry!);
    const last = view.rows.length - 1;
    return html`
      <div class=${CARD}>
        <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.menu}</span>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="text-left text-xs text-gray-500 dark:text-gray-400">
                <th class="w-16"></th>
                <th class="px-1 py-1 font-medium">${this.msg.label}</th>
                <th class="px-1 py-1 font-medium">${this.msg.description}</th>
                ${view.actors.map(actor => html`<th class="px-1 py-1 font-medium text-center whitespace-nowrap" title=${this.msg.roles}>${actor}</th>`)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${view.rows.map((row, index) => html`
                <tr class="border-t border-gray-100 dark:border-gray-800 align-top"
                  draggable="true"
                  @dragstart=${() => { this._dragging = row.pageId; }}
                  @dragover=${(event: DragEvent) => event.preventDefault()}
                  @drop=${(event: DragEvent) => this._onDrop(event, index)}>
                  <td class="py-1.5 whitespace-nowrap cursor-move">
                    <span class="text-gray-400 select-none" aria-hidden="true">⋮⋮</span>
                    <button type="button" class=${ICON_BUTTON} title=${this.msg.up} aria-label=${this.msg.up} ?disabled=${index === 0}
                      @click=${() => this._edit(entry => moveMenuItem(entry, row.pageId, index - 1))}>↑</button>
                    <button type="button" class=${ICON_BUTTON} title=${this.msg.down} aria-label=${this.msg.down} ?disabled=${index === last}
                      @click=${() => this._edit(entry => moveMenuItem(entry, row.pageId, index + 1))}>↓</button>
                  </td>
                  <td class="px-1 py-1.5 min-w-[10rem]">
                    <input class=${INPUT} .value=${row.label}
                      @change=${(event: Event) => this._edit(entry => setMenuLabel(entry, row.pageId, (event.target as HTMLInputElement).value))}>
                    <span class="text-[11px] font-mono text-gray-400 dark:text-gray-500">${row.route}</span>
                  </td>
                  <td class="px-1 py-1.5 min-w-[14rem]">
                    <textarea class=${INPUT} rows="2" .value=${row.description}
                      @change=${(event: Event) => this._edit(entry => setMenuDescription(entry, row.pageId, (event.target as HTMLTextAreaElement).value))}></textarea>
                  </td>
                  ${view.actors.map(actor => html`
                    <td class="px-1 py-1.5 text-center">
                      <input type="checkbox" .checked=${row.actors.includes(actor)} aria-label=${`${row.label}: ${actor}`}
                        @change=${(event: Event) => this._edit(entry => setMenuActor(entry, row.pageId, actor, (event.target as HTMLInputElement).checked))}>
                      ${row.landingOf.includes(actor) ? html`<div class="text-[10px] text-indigo-600 dark:text-indigo-300">${this.msg.start}</div>` : nothing}
                    </td>
                  `)}
                  <td class="px-1 py-1.5 text-right">
                    <button type="button" class="text-xs underline text-gray-600 dark:text-gray-300 whitespace-nowrap"
                      @click=${() => this._edit(entry => hideFromMenu(entry, row.pageId))}>${this.msg.hide}</button>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      </div>
      <div class=${CARD}>
        <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.hidden}</span>
        ${view.hidden.length ? view.hidden.map(page => html`
          <div class="flex items-center gap-2 text-sm">
            <span>${page.title}</span>
            <span class="text-[11px] font-mono text-gray-400 dark:text-gray-500">${page.route}</span>
            <button type="button" class="ml-auto text-xs underline text-gray-600 dark:text-gray-300"
              @click=${() => this._edit(entry => showInMenu(entry, page.pageId))}>${this.msg.show}</button>
          </div>
        `) : html`<span class="text-xs italic text-gray-400 dark:text-gray-500">${this.msg.noHidden}</span>`}
      </div>
    `;
  }

  private _renderStartPages(): TemplateResult {
    const entry = this._entry!;
    const view = readModuleMenu(entry);
    const routed = [...view.rows.map(row => ({ pageId: row.pageId, title: row.label })), ...view.hidden];
    const landingOf = (actor: string) => view.rows.find(row => row.landingOf.includes(actor))?.pageId ?? '';
    return html`
      <div class=${CARD}>
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.home.replace('{module}', this.moduleId)}</span>
          <select class=${INPUT} @change=${(event: Event) => this._edit(current => setHomePage(current, (event.target as HTMLSelectElement).value))}>
            ${routed.map(page => html`<option value=${page.pageId} ?selected=${page.pageId === view.homePageId}>${page.title}</option>`)}
          </select>
          <span class="text-[11px] text-gray-500 dark:text-gray-400">${this.msg.homeHint}</span>
        </label>
      </div>
      <div class=${CARD}>
        <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.landings}</span>
        <span class="text-[11px] text-amber-700 dark:text-amber-300">${this.msg.landingsHint}</span>
        ${view.actors.map(actor => html`
          <label class="flex items-center gap-2 text-sm">
            <span class="w-40 shrink-0 truncate">${actor}</span>
            <select class=${INPUT} @change=${(event: Event) => {
              const value = (event.target as HTMLSelectElement).value;
              this._edit(current => setLanding(current, actor, value || null));
            }}>
              <option value="" ?selected=${!landingOf(actor)}>${this.msg.noLanding}</option>
              ${view.rows.filter(row => row.actors.length === 0 || row.actors.includes(actor)).map(row => html`
                <option value=${row.pageId} ?selected=${row.pageId === landingOf(actor)}>${row.label}</option>
              `)}
            </select>
          </label>
        `)}
      </div>
    `;
  }

  private _renderPreview(): TemplateResult | typeof nothing {
    const view = readModuleMenu(this._entry!);
    if (!view.actors.length) return nothing;
    const items = previewForActor(this._entry!, this.moduleId, this._previewActor);
    return html`
      <div class=${CARD}>
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.preview}</span>
          <select class="ml-auto rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-0.5 text-sm"
            @change=${(event: Event) => { this._previewActor = (event.target as HTMLSelectElement).value; }}>
            ${view.actors.map(actor => html`<option value=${actor} ?selected=${actor === this._previewActor}>${actor}</option>`)}
          </select>
        </div>
        <ul class="flex flex-col gap-0.5 text-sm">
          ${items.map(item => html`
            <li class="flex items-center gap-2 px-2 py-1 rounded bg-gray-50 dark:bg-gray-900/50">
              <span>${item.label}</span>
              ${item.landing ? html`<span class="text-[10px] text-indigo-600 dark:text-indigo-300">${this.msg.start}</span>` : nothing}
            </li>
          `)}
        </ul>
      </div>
    `;
  }

  private _renderActionBar(): TemplateResult {
    return html`
      <div class="sticky bottom-0 flex flex-col gap-2 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 pt-2">
        ${this._error ? html`
          <p class="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-2.5 py-1.5 text-sm text-red-700 dark:text-red-300">
            ${this._error}
          </p>` : nothing}
        ${this._notice ? html`<p class="text-sm text-emerald-700 dark:text-emerald-300">${this._notice}</p>` : nothing}
        <div class="flex items-center gap-3 flex-wrap">
          ${this._conflict ? html`
            <button type="button" class=${BUTTON_PRIMARY} ?disabled=${this._busy} @click=${() => void this._reload()}>${this.msg.reload}</button>
          ` : html`
            <button type="button" class=${BUTTON_PRIMARY} ?disabled=${this._busy || !this._dirty} @click=${() => void this._save()}>${this.msg.save}</button>
            <button type="button" class=${BUTTON} ?disabled=${this._busy || !this._dirty} @click=${() => this._discard()}>${this.msg.discard}</button>
          `}
          ${this._dirty ? html`<span class="ml-auto text-xs text-amber-700 dark:text-amber-300">${this.msg.unsaved}</span>` : nothing}
        </div>
      </div>
    `;
  }

  render(): TemplateResult {
    this.msg = messages[this.getMessageKey(messages)] ?? message_en;
    if (!this._projectId) {
      return html`<p class="text-sm italic p-3 bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400">${this.msg.noProject}</p>`;
    }
    const header = html`
      <div class="flex items-center gap-2 flex-wrap">
        <span class="w-5 h-5 text-gray-500 dark:text-gray-400">${pluginData.getSvg()}</span>
        <h2 class="text-sm font-semibold">${this.msg.title}</h2>
        <span class="text-sm text-gray-500 dark:text-gray-400">${this.moduleId}</span>
        <span class="ml-auto text-xs font-mono text-gray-400 dark:text-gray-500">#${this._projectId}</span>
      </div>
    `;
    let body: TemplateResult;
    if (this._loading && !this._entry) body = html`<p class="text-sm italic text-gray-500 dark:text-gray-400">${this.msg.loading}</p>`;
    else if (!this._entry) body = html`<p class="text-sm italic text-gray-500 dark:text-gray-400">${this._error || this.msg.noModule}</p>`;
    else body = html`
      ${this._renderIssues(readModuleMenu(this._entry).issues)}
      ${this._renderMenuTable()}
      ${this._renderStartPages()}
      ${this._renderPreview()}
      ${this._renderActionBar()}
    `;
    // Opaque background of its own: the details panel stays light while `.dark` is on (see the header editor).
    return html`<div class="flex flex-col gap-3 p-3 min-h-full bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-100">${header}${body}</div>`;
  }
}
