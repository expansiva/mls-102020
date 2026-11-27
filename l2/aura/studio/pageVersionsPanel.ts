/// <mls fileReference="_102020_/l2/aura/studio/pageVersionsPanel.ts" enhancement="_102027_/l2/enhancementLit.ts"/>
// The "Versions" section of the Page tab (Pages plugin): the page timeline, newest first, with "see the difference"
// and "back to this version"; below it, on demand, the saved versions from git.
//
// It holds no page text of its own beyond what it shows: the versions come from pageVersions, which also does every
// write. Going back never deletes anything — it is a new version, so it can be undone from this same list.
//
// Rendered inside the Pages plugin (light DOM, same classes as the plugin around it).

import { html, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';
import {
  groupTimeline, newerThan, pageVersionKey, regenAfter, type IPageVersion, type PageVersionWho,
} from '/_102020_/l2/aura/studio/pageVersionsCore.js';
import {
  clearBlock, clearPageVersions, listPageVersions, listSavedPageVersions, onPageVersions, pageVersionsAvailable, readSavedPageVersion,
  restorePageVersion, restoreSavedPageVersion, versionedPage, type IPageRef, type ISavedPageVersion,
} from '/_102020_/l2/aura/studio/pageVersions.js';
import { snapshotPageFile } from '/_102020_/l2/aura/agentEditPage/editPageIo.js';
import { onPageReviewChange } from '/_102020_/l2/aura/studio/studioPageReview.js';

import { PAGE_VERSION_DIFF_TAG, type IPageVersionSide } from '/_102020_/l2/aura/studio/pageVersionDiff.js';
import { clearServiceDetails, openElementInServiceDetails } from '/_102027_/l2/libCommom.js';

/** Dot colour per who (whole class names: the Tailwind JIT scans this file for them). */
const DOT: Record<PageVersionWho, string> = {
  me: 'bg-blue-400',
  ai: 'bg-purple-400',
  regen: 'bg-amber-400',
  restore: 'bg-emerald-400',
  open: 'bg-gray-400',
  other: 'bg-red-400',
};

@customElement('aura--studio--page-versions-102020')
export class PageVersionsPanel extends StateLitElement {
  @property({ attribute: false }) page: IPageRef | null = null;

  @state() private _versions: IPageVersion[] = [];
  @state() private _saved: ISavedPageVersion[] | null = null;
  @state() private _savedOpen = false;
  @state() private _savedLoading = false;
  @state() private _savedError = '';
  /** Text of the newest saved commit: a local version with the same `.ts` is marked "saved". */
  @state() private _savedTs: string | null = null;
  @state() private _confirm: string | null = null;
  @state() private _busy: string | null = null;
  @state() private _message = '';
  @state() private _error = '';
  /** The row whose difference is open in the details panel (`local:<id>` / `saved:<ref>`). */
  @state() private _diffRow: string | null = null;
  /** Folded runs the person opened (by the id of their newest version). */
  @state() private _openGroups: ReadonlySet<number> = new Set();
  /** Versions whose full text (AI steps and request) the person opened, by id. */
  @state() private _expanded: ReadonlySet<number> = new Set();

  private _unsub: (() => void) | null = null;
  private _loadedKey = '';

  private _unsubReview: (() => void) | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this._unsub = onPageVersions((key) => {
      const page = this._ref();
      if (page && key === pageVersionKey(page)) void this._load();
    });
    // A review or an AI discard on offer blocks "Clear history": the button follows them.
    this._unsubReview = onPageReviewChange(() => this.requestUpdate());
  }

  disconnectedCallback(): void {
    this._unsub?.();
    this._unsub = null;
    this._unsubReview?.();
    this._unsubReview = null;
    this._closeDiff();
    super.disconnectedCallback();
  }

  willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('page')) {
      const page = this._ref();
      const key = page ? pageVersionKey(page) : '';
      if (key !== this._loadedKey) {
        this._loadedKey = key;
        this._versions = [];
        this._saved = null;
        this._savedOpen = false;
        this._savedTs = null;
        this._confirm = null;
        this._message = '';
        this._error = '';
        this._closeDiff();
        if (page) void this._load();
      }
    }
  }

  private _ref(): IPageRef | null {
    return versionedPage(this.page);
  }

  private async _load(): Promise<void> {
    const page = this._ref();
    if (!page) return;
    const versions = await listPageVersions(page);
    if (this._ref() && pageVersionKey(this._ref()!) === pageVersionKey(page)) this._versions = versions;
  }

  // ─── Words ───

  /** `15:32`, or `23/11 15:32` outside today; `timeOnly` when a day header above already says the day. */
  private _time(at: number, timeOnly = false): string {
    const date = new Date(at);
    const lang = document.documentElement.lang || undefined;
    const time = date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
    if (timeOnly || date.toDateString() === new Date().toDateString()) return time;
    return `${date.toLocaleDateString(lang, { day: '2-digit', month: '2-digit' })} ${time}`;
  }

  private _dayLabel(at: number): string {
    const day = new Date(at).toDateString();
    if (day === new Date().toDateString()) return t('versions.today');
    if (day === new Date(Date.now() - 86400000).toDateString()) return t('versions.yesterday');
    return new Date(at).toLocaleDateString(document.documentElement.lang || undefined, { day: '2-digit', month: 'short' });
  }

  /** What the version IS: the edit itself for the Studio and the AI, the kind for the others. */
  private _title(v: IPageVersion): string {
    switch (v.who) {
      case 'open': return v.cleared ? t('versions.whoCleared') : t('versions.whoOpen');
      case 'regen': return t('versions.whoRegen');
      case 'other': return t('versions.whoOther');
      case 'restore': return t('versions.whoRestoreShort');
      case 'ai': return v.what || t('versions.whoAi');
      case 'me': return v.what ? v.what.charAt(0).toLocaleUpperCase() + v.what.slice(1) : t('versions.whoMe');
    }
  }

  /** The second line, only where it says something the colour and the title do not (the AI's request is on demand). */
  private _subtitle(v: IPageVersion): string {
    if (v.who === 'restore') {
      const time = v.restoredFrom ? this._time(v.restoredFrom) : '';
      return (v.restoredSaved ? t('versions.restoredFromSaved') : t('versions.restoredFrom')).replace('{time}', time);
    }
    return '';
  }

  /** Titles longer than this are cut to two lines until "see more". */
  private static readonly SHORT_TITLE = 90;

  /** The AI steps of a version: what it changed, then each adjustment (older versions have only `what`). */
  private _steps(v: IPageVersion): string[] {
    return v.who === 'ai' && v.steps?.length ? v.steps : [];
  }

  /** There is more than the two lines shown: several AI steps, the request, or a long title. */
  private _hasMore(v: IPageVersion): boolean {
    return this._steps(v).length > 1 || Boolean(v.who === 'ai' && v.request) || this._title(v).length > PageVersionsPanel.SHORT_TITLE;
  }

  private _toggleExpanded(v: IPageVersion): void {
    const next = new Set(this._expanded);
    if (next.has(v.id)) next.delete(v.id); else next.add(v.id);
    this._expanded = next;
  }

  /**
   * The title of a version: two lines and a "see more" when there is more; open, every AI step in full (the change,
   * then each adjustment) and the request as it was asked.
   */
  private _renderTitle(v: IPageVersion, cls: string): TemplateResult {
    const more = this._hasMore(v);
    const open = more && this._expanded.has(v.id);
    const steps = this._steps(v);
    const extra = steps.length - 1;
    const toggle = more ? html`
      <button type="button" class="self-start text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" aria-expanded=${open ? 'true' : 'false'}
        @click=${() => this._toggleExpanded(v)}>${open ? t('versions.less') : extra > 0 ? t('versions.moreAdjust', { n: extra }) : t('versions.more')}</button>` : nothing;
    if (!open) {
      return html`<span class="${cls} break-words line-clamp-2">${this._title(v)}</span>${toggle}`;
    }
    return html`
      ${steps.length > 1 ? html`
        <ol class="flex flex-col gap-1">
          ${steps.map((text, index) => html`
            <li class="${cls} break-words">
              <span class="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">${index === 0 ? t('versions.stepChange') : t('versions.stepAdjust', { n: index })}</span><br>${text}
            </li>`)}
        </ol>` : html`<span class="${cls} break-words">${steps[0] ?? this._title(v)}</span>`}
      ${v.who === 'ai' && v.request ? html`<span class="text-[11px] italic text-gray-500 dark:text-gray-400 break-words">${t('versions.aiRequestText', { request: v.request })}</span>` : nothing}
      ${toggle}
    `;
  }

  private _groupTitle(who: PageVersionWho, n: number): string {
    const id = who === 'me' ? 'versions.groupMe' : who === 'ai' ? 'versions.groupAi' : who === 'restore' ? 'versions.groupRestore' : 'versions.groupOther';
    return t(id, { n });
  }

  // ─── Actions ───

  private async _current(): Promise<{ ts: string; defs: string | null } | null> {
    const page = this._ref();
    if (!page) return null;
    const now = await snapshotPageFile(page.project, page.folder, page.shortName);
    return now ? { ts: now.source, defs: now.defs } : null;
  }

  private async _showLocalDiff(v: IPageVersion): Promise<void> {
    const row = `local:${v.id}`;
    const index = this._versions.findIndex(x => x.id === v.id);
    const latest = index === this._versions.length - 1;
    // The newest version against the one before it (what it changed); any other against the page now.
    if (latest) {
      const previous = this._versions[index - 1];
      if (!previous) return;
      this._openDiff(row, t('versions.diffAgainst').replace('{a}', this._time(previous.at)).replace('{b}', this._time(v.at)), previous, v);
      return;
    }
    const now = await this._current();
    if (!now) { this._error = t('versions.readFailed'); return; }
    this._openDiff(row, t('versions.diffAgainst').replace('{a}', this._time(v.at)).replace('{b}', t('versions.diffNow')), v, now);
  }

  private async _showSavedDiff(s: ISavedPageVersion): Promise<void> {
    const row = `saved:${s.ref}`;
    const page = this._ref();
    if (!page) return;
    const [then, now] = await Promise.all([readSavedPageVersion(page, s), this._current()]);
    if (!then || !now) { this._error = t('versions.readFailed'); return; }
    this._openDiff(row, t('versions.diffAgainst').replace('{a}', this._time(s.at)).replace('{b}', t('versions.diffNow')), then, now);
  }

  /** Opens the difference in the details panel on the right (the list is too narrow for a code diff). */
  private _openDiff(row: string, label: string, original: IPageVersionSide, modified: IPageVersionSide): void {
    this._error = '';
    const element = document.createElement(PAGE_VERSION_DIFF_TAG) as HTMLElement & {
      pageName: string; label: string; original: IPageVersionSide; modified: IPageVersionSide;
    };
    const page = this._ref();
    element.pageName = page ? `${page.folder.split('/')[0]}/${page.shortName}` : '';
    element.label = label;
    element.original = { ts: original.ts, defs: original.defs };
    element.modified = { ts: modified.ts, defs: modified.defs };
    this._diffRow = row;
    void openElementInServiceDetails(element);
  }

  /** Closes the difference this panel opened (and only that: the details panel may hold something else). */
  private _closeDiff(): void {
    if (this._diffRow === null) return;
    this._diffRow = null;
    void clearServiceDetails();
  }

  private async _restoreLocal(v: IPageVersion): Promise<void> {
    const page = this._ref();
    if (!page || this._busy) return;
    this._busy = `local:${v.id}`;
    this._error = '';
    this._message = '';
    try {
      const result = await restorePageVersion(page, v);
      this._done(v.at, result.live);
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._busy = null;
      this._confirm = null;
    }
  }

  private async _restoreSaved(s: ISavedPageVersion): Promise<void> {
    const page = this._ref();
    if (!page || this._busy) return;
    this._busy = `saved:${s.ref}`;
    this._error = '';
    this._message = '';
    try {
      const result = await restoreSavedPageVersion(page, s);
      if (!result) this._error = t('versions.readFailed');
      else this._done(s.at, result.live);
    } catch (error) {
      this._error = error instanceof Error ? error.message : String(error);
    } finally {
      this._busy = null;
      this._confirm = null;
    }
  }

  /** "Clear history": the page as it is now becomes the only version (the saved ones stay). */
  private async _clear(): Promise<void> {
    const page = this._ref();
    if (!page || this._busy) return;
    this._busy = 'clear';
    this._error = '';
    this._message = '';
    try {
      const result = await clearPageVersions(page);
      if (result === 'cleared') {
        this._closeDiff();
        this._openGroups = new Set();
        this._expanded = new Set();
        this._message = t('versions.cleared');
      } else {
        this._error = t(result === 'review' ? 'versions.clearBlockedReview' : result === 'aiUndo' ? 'versions.clearBlockedUndo' : 'versions.clearFailed');
      }
    } finally {
      this._busy = null;
      this._confirm = null;
    }
  }

  private _done(at: number, live: string | null): void {
    this._closeDiff();
    this._message = t('versions.restored').replace('{time}', this._time(at)).replace('{local}', t('versions.localOnly'));
    if (live) this._error = t('versions.liveNot').replace('{reason}', live);
  }

  private async _toggleSaved(): Promise<void> {
    this._savedOpen = !this._savedOpen;
    if (!this._savedOpen || this._saved || this._savedLoading) return;
    const page = this._ref();
    if (!page) return;
    this._savedLoading = true;
    this._savedError = '';
    try {
      const saved = await listSavedPageVersions(page);
      this._saved = saved;
      if (saved[0]) this._savedTs = (await readSavedPageVersion(page, saved[0]))?.ts ?? null;
    } catch (error) {
      this._savedError = t('versions.savedFailed').replace('{reason}', error instanceof Error ? error.message : String(error));
    } finally {
      this._savedLoading = false;
    }
  }

  // ─── Render ───

  render(): TemplateResult {
    const page = this._ref();
    return html`
      <div class="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2.5 flex flex-col gap-2">
        <div class="flex flex-col gap-0.5">
          <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">${t('versions.title')}</span>
          <span class="text-[10px] text-gray-500 dark:text-gray-400">${t('versions.hint')}</span>
        </div>
        ${!page ? html`<span class="text-xs text-gray-500 dark:text-gray-400">${t('versions.notVersioned')}</span>`
          : !pageVersionsAvailable() ? html`<span class="text-xs text-amber-600 dark:text-amber-400">${t('versions.unavailable')}</span>`
          : this._renderLocal()}
        ${this._message ? html`<div class="text-xs text-emerald-700 dark:text-emerald-300 rounded bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1.5">${this._message}</div>` : nothing}
        ${this._error ? html`<div class="text-xs text-red-600 dark:text-red-400">${this._error}</div>` : nothing}
        ${page ? this._renderSaved() : nothing}
      </div>
    `;
  }

  // ─── Timeline (newest first: a rail, a dot per version coloured by who, runs of the same kind folded) ───

  private _renderLocal(): TemplateResult {
    if (!this._versions.length) return html`<span class="text-xs text-gray-500 dark:text-gray-400">${t('versions.empty')}</span>`;
    const entries = groupTimeline(this._versions);
    const latestId = this._versions[this._versions.length - 1].id;
    const rows: TemplateResult[] = [];
    let day = '';
    entries.forEach((entry, index) => {
      const head = entry.kind === 'one' ? entry.version : entry.versions[0];
      const thisDay = new Date(head.at).toDateString();
      if (thisDay !== day) {
        day = thisDay;
        rows.push(html`<li class="pl-12 pt-1 pb-0.5 text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">${this._dayLabel(head.at)}</li>`);
      }
      const edge = { first: index === 0, last: index === entries.length - 1 };
      rows.push(entry.kind === 'one'
        ? this._renderLocalRow(entry.version, entry.version.id === latestId, edge)
        : this._renderGroup(entry.who, entry.versions, edge));
    });
    return html`<ol class="flex flex-col">${rows}</ol>`;
  }

  /** The rail column: the line through the row (cut at the ends of the list) and the dot of the version. */
  private _rail(who: PageVersionWho, edge: { first: boolean; last: boolean }, opts: { current?: boolean; stacked?: boolean } = {}): TemplateResult {
    const line = edge.first && edge.last ? 'hidden' : edge.first ? 'top-2.5 bottom-0' : edge.last ? 'top-0 h-2.5' : 'top-0 bottom-0';
    const size = opts.current ? 'h-3.5 w-3.5 mt-0.5' : 'h-3 w-3 mt-1';
    const ring = opts.current ? 'ring-4 ring-indigo-500/25' : opts.stacked ? 'ring-2 ring-gray-300 dark:ring-gray-600 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : 'ring-2 ring-white dark:ring-gray-900';
    return html`
      <span class="relative flex justify-center" aria-hidden="true">
        <span class="absolute left-1/2 -translate-x-1/2 w-0.5 bg-gray-200 dark:bg-gray-700 ${line}"></span>
        <span class="relative rounded-full ${size} ${ring} ${DOT[who]}"></span>
      </span>`;
  }

  private _renderLocalRow(v: IPageVersion, latest: boolean, edge: { first: boolean; last: boolean }): TemplateResult {
    const row = `local:${v.id}`;
    const busy = this._busy === row;
    const confirming = this._confirm === row;
    const saved = this._savedTs !== null && v.ts === this._savedTs;
    const pinned = latest || confirming || this._diffRow === row;
    const sub = this._subtitle(v);
    return html`
      <li class="group grid grid-cols-[2.5rem_1.25rem_1fr] gap-x-1.5 py-1">
        <span class="text-xs tabular-nums text-gray-500 dark:text-gray-400 text-right pt-0.5">${this._time(v.at, true)}</span>
        ${this._rail(v.who, edge, { current: latest })}
        <div class="flex flex-col gap-0.5 min-w-0 pb-1">
          ${this._renderTitle(v, 'text-xs font-medium text-gray-700 dark:text-gray-200')}
          ${latest || saved ? html`
            <div class="flex items-center gap-1.5">
              ${latest ? html`<span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">${t('versions.current')}</span>` : nothing}
              ${saved ? html`<span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">${t('versions.saved')}</span>` : nothing}
            </div>` : nothing}
          ${sub ? html`<span class="text-[11px] line-clamp-2 ${v.who === 'restore' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}" title=${sub}>${sub}</span>` : nothing}
          ${this._renderActions(v, row, latest, pinned, busy, confirming)}
        </div>
      </li>
    `;
  }

  /** "Difference" and "Back": shown on hover (or focus), always on the current version and on a row being acted on. */
  private _renderActions(v: IPageVersion, row: string, latest: boolean, pinned: boolean, busy: boolean, confirming: boolean): TemplateResult {
    return html`
      <div class="flex items-center gap-3 ${pinned ? '' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'} transition-opacity">
        ${this._versions.length > 1 ? html`<button type="button" class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          @click=${() => this._showLocalDiff(v)}>${t('versions.diff')}</button>` : nothing}
        ${!latest && !confirming ? html`<button type="button" class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer disabled:opacity-50"
          ?disabled=${!!this._busy} @click=${() => { this._confirm = row; }}>${busy ? t('versions.restoring') : t('versions.restoreShort')}</button>` : nothing}
      </div>
      ${confirming ? this._renderConfirm(
        [t('versions.confirmNewer').replace('{n}', String(newerThan(this._versions, v))), regenAfter(this._versions, v) ? t('versions.confirmRegen') : ''],
        () => this._restoreLocal(v), busy,
      ) : nothing}
      ${this._diffRow === row ? html`<span class="text-[10px] text-gray-500 dark:text-gray-400">${t('versions.diffOpenRight')}</span>` : nothing}
    `;
  }

  /** A run of versions of the same kind: one row ("3 Studio edits", 15:31–15:32) that opens into its versions. */
  private _renderGroup(who: PageVersionWho, versions: IPageVersion[], edge: { first: boolean; last: boolean }): TemplateResult {
    const key = versions[0].id;
    const open = this._openGroups.has(key) || versions.some(v => this._confirm === `local:${v.id}` || this._diffRow === `local:${v.id}`);
    const newest = this._time(versions[0].at, true);
    const oldest = this._time(versions[versions.length - 1].at, true);
    const toggle = () => {
      const next = new Set(this._openGroups);
      if (next.has(key)) next.delete(key); else next.add(key);
      this._openGroups = next;
    };
    return html`
      <li class="grid grid-cols-[2.5rem_1.25rem_1fr] gap-x-1.5 py-1">
        <span class="text-xs tabular-nums text-gray-500 dark:text-gray-400 text-right pt-0.5">${newest}</span>
        ${this._rail(who, edge, { stacked: true })}
        <div class="flex flex-col gap-0.5 min-w-0 pb-1">
          <button type="button" class="self-start flex items-baseline gap-1.5 text-left cursor-pointer" aria-expanded=${open ? 'true' : 'false'} @click=${toggle}>
            <span class="text-xs font-medium text-gray-700 dark:text-gray-200">${this._groupTitle(who, versions.length)}</span>
            <span class="text-[11px] text-indigo-600 dark:text-indigo-400">${open ? t('versions.groupClose') : t('versions.groupOpen')}</span>
          </button>
          <span class="text-[11px] text-gray-500 dark:text-gray-400">${oldest === newest ? newest : `${oldest}–${newest}`}</span>
          ${open ? html`
            <ul class="flex flex-col mt-1 border-l border-gray-200 dark:border-gray-700 pl-2">
              ${versions.map(v => this._renderGroupItem(v))}
            </ul>` : nothing}
        </div>
      </li>
    `;
  }

  private _renderGroupItem(v: IPageVersion): TemplateResult {
    const row = `local:${v.id}`;
    const busy = this._busy === row;
    const confirming = this._confirm === row;
    const pinned = confirming || this._diffRow === row;
    const sub = this._subtitle(v);
    return html`
      <li class="group flex flex-col gap-0.5 py-1">
        <span class="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">${this._time(v.at, true)}</span>
        ${this._renderTitle(v, 'text-xs text-gray-700 dark:text-gray-200')}
        ${sub ? html`<span class="text-[11px] line-clamp-2 ${v.who === 'restore' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}" title=${sub}>${sub}</span>` : nothing}
        ${this._renderActions(v, row, false, pinned, busy, confirming)}
      </li>
    `;
  }

  private _renderConfirm(lines: string[], run: () => void, busy: boolean, busyLabel = t('versions.restoring')): TemplateResult {
    return html`
      <div class="flex flex-col gap-1 pl-[1.125rem]">
        ${lines.filter(Boolean).map(line => html`<span class="text-[10px] text-amber-700 dark:text-amber-400">${line}</span>`)}
        <div class="flex items-center gap-2">
          <button type="button" class="text-xs px-2.5 py-1 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
            ?disabled=${busy} @click=${run}>${busy ? busyLabel : t('versions.confirm')}</button>
          <button type="button" class="text-xs text-gray-500 dark:text-gray-400 hover:underline cursor-pointer"
            ?disabled=${busy} @click=${() => { this._confirm = null; }}>${t('versions.cancel')}</button>
        </div>
      </div>
    `;
  }

  private _renderSaved(): TemplateResult {
    return html`
      <div class="flex flex-col gap-1 border-t border-gray-200 dark:border-gray-800 pt-2">
        <div class="flex items-center gap-2">
          <button type="button" class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            @click=${() => this._toggleSaved()}>${this._savedOpen ? t('versions.hideSaved') : t('versions.showSaved')}</button>
          ${this._renderClearButton()}
        </div>
        ${this._confirm === 'clear'
          ? this._renderConfirm([t('versions.clearConfirm').replace('{n}', String(this._versions.length - 1))], () => this._clear(), this._busy === 'clear', t('versions.clearing'))
          : nothing}
        ${!this._savedOpen ? nothing
          : this._savedLoading ? html`<span class="text-xs text-gray-500 dark:text-gray-400">${t('versions.savedLoading')}</span>`
          : this._savedError ? html`<span class="text-xs text-red-600 dark:text-red-400">${this._savedError}</span>`
          : !this._saved?.length ? html`<span class="text-xs text-gray-500 dark:text-gray-400">${t('versions.savedEmpty')}</span>`
          : html`
            <span class="text-xs font-medium text-gray-600 dark:text-gray-300">${t('versions.savedTitle')}</span>
            <ul class="flex flex-col gap-1">${this._saved.map(s => this._renderSavedRow(s))}</ul>
          `}
      </div>
    `;
  }

  /**
   * "Clear history", at the right of the saved versions. Disabled, with the reason as its title, while the timeline is
   * the way back of something open (an AI review, an AI change the AI tab can still discard) or holds nothing to clear.
   */
  private _renderClearButton(): TemplateResult | typeof nothing {
    const page = this._ref();
    if (!page || !pageVersionsAvailable() || this._confirm === 'clear') return nothing;
    const block = clearBlock(page, this._versions);
    const reason = block === 'review' ? t('versions.clearBlockedReview') : block === 'aiUndo' ? t('versions.clearBlockedUndo') : block === 'nothing' ? t('versions.clearNothing') : '';
    return html`
      <button type="button"
        class="ml-auto text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline disabled:hover:text-gray-500"
        title=${reason || t('versions.clearHint')}
        ?disabled=${!!block || !!this._busy}
        @click=${() => { this._confirm = 'clear'; }}>${t('versions.clear')}</button>
    `;
  }

  private _renderSavedRow(s: ISavedPageVersion): TemplateResult {
    const row = `saved:${s.ref}`;
    const busy = this._busy === row;
    const confirming = this._confirm === row;
    return html`
      <li class="flex flex-col gap-1 rounded-md px-2 py-1.5 bg-gray-50 dark:bg-gray-900/50">
        <div class="flex items-baseline gap-1.5">
          <span class="text-xs tabular-nums text-gray-500 dark:text-gray-400">${this._time(s.at)}</span>
          <span class="text-xs font-medium text-gray-700 dark:text-gray-200">${s.author}</span>
          <span class="ml-auto text-[10px] font-mono text-gray-400 dark:text-gray-500">${s.ref.slice(0, 7)}</span>
        </div>
        ${s.message ? html`<span class="text-xs text-gray-600 dark:text-gray-300 break-words">${s.message}</span>` : nothing}
        <div class="flex items-center gap-2">
          <button type="button" class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            @click=${() => this._showSavedDiff(s)}>${t('versions.diff')}</button>
          ${!confirming ? html`<button type="button" class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer disabled:opacity-50"
            ?disabled=${!!this._busy} @click=${() => { this._confirm = row; }}>${busy ? t('versions.restoring') : t('versions.restore')}</button>` : nothing}
        </div>
        ${confirming ? this._renderConfirm([], () => this._restoreSaved(s), busy) : nothing}
        ${this._diffRow === row ? html`<span class="text-[10px] text-gray-500 dark:text-gray-400">${t('versions.diffOpenRight')}</span>` : nothing}
      </li>
    `;
  }
}
