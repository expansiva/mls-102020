/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/tool_catalog.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsTool_catalogShared } from '/_102047_/l2/agents/web/shared/tool_catalog.js';
import type { CatalogModule, CatalogUpdate, ErrorState, ToolUsage } from '/_102047_/l2/agents/web/shared/tool_catalog.js';
import '/_102040_/l2/molecules/groupviewhierarchy/ml-hierarchy-tree.js';
import '/_102040_/l2/molecules/groupviewdata/ml-vertical-record-list.js';
import '/_102040_/l2/molecules/groupviewdata/ml-timeline-view.js';

const formatDate = (value: string | undefined): string => {
  if (!value) return '';
  return new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(value));
};

const errorText = (error: ErrorState, fallback: string): string => error?.message || fallback;

const STATUS_KEY: Record<CatalogUpdate['status'], keyof PageMessageType> = {
  available: 'statusAdded',
  removed: 'statusRemoved',
};

/// **collab_i18n_start**
const pageMessage_en = {
  pageTitle: 'Tool catalog',
  pageIntro: 'Browse every action available across the workspace.',
  catalogTitle: 'Browse tools',
  catalogHint: 'Expand a module, then a subject, to read its actions.',
  moduleLabel: 'Module',
  subjectLabel: 'Subject',
  removed: 'Removed',
  catalogLoading: 'Loading the tool catalog…',
  catalogEmpty: 'No tools are available in the catalog yet.',
  catalogError: 'The tool catalog could not be loaded.',
  retryCatalog: 'Retry catalog',
  usageTitle: 'Agents using tools',
  usageIntro: 'See which tools are turned on for agents.',
  agentsUsing: 'agents using it',
  usageEmpty: 'Tool usage is not available for your account.',
  openAgents: 'Open Agents',
  updatesTitle: 'Recent catalog updates',
  updatesIntro: 'Changes from new modules and releases appear here.',
  updatesLoading: 'Loading catalog updates…',
  updatesEmpty: 'No catalog updates yet.',
  updatesError: 'Catalog updates could not be loaded.',
  retryUpdates: 'Retry updates',
  loadMore: 'Load more updates',
  statusAdded: 'Added',
  statusRemoved: 'Marked removed',
  on: 'on',
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = { en: pageMessage_en };
/// **collab_i18n_end**

@customElement('agents--web--mobile--page11--tool_catalog-102047')
export class AgentsMobilePage11Tool_catalogPage extends AgentsTool_catalogShared {
  private msg: PageMessageType = pageMessage_en;

  private renderTree(modules: CatalogModule[]) {
    return html`
      <groupviewhierarchy--ml-hierarchy-tree
        .multiple=${false}
        .loading=${this.getToolCatalogStatus === 'loading'}
        data-class="w-full"
      >
        <Label data-class="text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.catalogTitle}</Label>
        ${modules.map((module) => html`
          <Node data-class="min-h-11 py-1 font-semibold text-[var(--text-strong,currentColor)]">
            <span>${module.details.moduleTitle}</span>
            ${module.subjects.map((subject) => html`
              <Node data-class="min-h-11 py-1 font-medium text-[var(--text-default,currentColor)]">
                <span>${subject.details.subjectTitle}</span>
                ${subject.tools.map((tool) => html`
                  <Node data-class="min-h-11 py-1">
                    <div class="flex items-start gap-2 py-1">
                      <div class="min-w-0">
                        <div class="flex flex-wrap items-center gap-2 font-medium text-[var(--text-strong,currentColor)]">
                          <span>${tool.name}</span>
                          ${tool.status === 'removed' ? html`
                            <span class="rounded-full bg-[var(--status-warning-bg,transparent)] px-2 py-0.5 text-xs font-semibold text-[var(--status-warning-text,currentColor)]">${this.msg.removed}</span>
                          ` : ''}
                        </div>
                        <p class="mt-1 text-sm leading-5 text-[var(--text-muted,currentColor)]">${tool.details.description}</p>
                      </div>
                    </div>
                  </Node>
                `)}
              </Node>
            `)}
          </Node>
        `)}
        <Empty data-class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.catalogEmpty}</Empty>
      </groupviewhierarchy--ml-hierarchy-tree>
    `;
  }

  private renderUsage(rows: ToolUsage[]) {
    return html`
      <groupviewdata--ml-vertical-record-list
        .loading=${this.getToolCatalogStatus === 'loading'}
        .hoverable=${true}
        @row-click=${() => this.openAgents()}
        data-class="w-full"
      >
        <Columns>
          <Column field="tool" header="${this.msg.catalogTitle}"></Column>
          <Column field="usage" header="${this.msg.usageTitle}"></Column>
        </Columns>
        <Rows>
          ${rows.map((tool) => html`
            <Row data-class="cursor-pointer">
              <Cell>
                <div class="font-medium text-[var(--text-strong,currentColor)]">${tool.name}</div>
                <div class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${tool.details.moduleTitle} · ${tool.details.subjectTitle}</div>
              </Cell>
              <Cell data-class="text-right">
                <div class="font-semibold text-[var(--text-strong,currentColor)]">${tool.usedByAgents}</div>
                <div class="text-xs text-[var(--text-muted,currentColor)]">${this.msg.agentsUsing}</div>
              </Cell>
            </Row>
          `)}
        </Rows>
        <Empty data-class="py-7 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.usageEmpty}</Empty>
        <Loading data-class="py-7 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.catalogLoading}</Loading>
      </groupviewdata--ml-vertical-record-list>
    `;
  }

  private renderUpdates(rows: CatalogUpdate[]) {
    return html`
      <groupviewdata--ml-timeline-view
        .loading=${this.listCatalogUpdatesStatus === 'loading' && this.updates === null}
        .hoverable=${true}
        data-class="w-full"
      >
        <Columns>
          <Column field="update" header="${this.msg.updatesTitle}"></Column>
          <Column field="date" header="${this.msg.on}"></Column>
        </Columns>
        <Rows>
          ${rows.map((update) => {
            const occurredAt = update.status === 'available' ? update.details.addedAt : update.details.removedAt;
            return html`
              <Row>
                <Cell>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-medium text-[var(--text-strong,currentColor)]">${update.name}</span>
                    <span class="rounded-full bg-[var(--status-neutral-bg,transparent)] px-2 py-0.5 text-xs font-semibold text-[var(--status-neutral-text,currentColor)]">${this.msg[STATUS_KEY[update.status]]}</span>
                  </div>
                  <div class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${update.details.moduleTitle} · ${update.details.subjectTitle}</div>
                </Cell>
                <Cell><span class="text-sm text-[var(--text-muted,currentColor)]">${formatDate(occurredAt)}</span></Cell>
              </Row>
            `;
          })}
        </Rows>
        <Empty data-class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.updatesEmpty}</Empty>
        <Loading data-class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.updatesLoading}</Loading>
      </groupviewdata--ml-timeline-view>
    `;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const catalogError = this.getToolCatalogStatus === 'error';
    const updatesError = this.listCatalogUpdatesStatus === 'error';
    const updates = this.updates?.items ?? [];

    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] px-4 py-5 text-[var(--text-default,currentColor)]">
        <header class="mb-6">
          <h1 class="text-2xl font-bold tracking-tight text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
          <p class="mt-2 text-sm leading-5 text-[var(--text-muted,currentColor)]">${this.msg.pageIntro}</p>
        </header>

        <section data-organism-id="toolCatalogTree" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-4">
          <p class="mb-4 text-sm leading-5 text-[var(--text-muted,currentColor)]">${this.msg.catalogHint}</p>
          ${catalogError ? html`
            <div class="rounded-lg bg-[var(--status-error-bg,transparent)] p-4" role="alert" aria-live="polite">
              <p class="text-sm text-[var(--status-error-text,currentColor)]">${errorText(this.getToolCatalogError, this.msg.catalogError)}</p>
              <button type="button" @click=${() => this.getToolCatalog()} class="mt-3 min-h-11 rounded-lg bg-[var(--button-secondary-bg,transparent)] px-3 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">${this.msg.retryCatalog}</button>
            </div>
          ` : this.renderTree(this.modules)}
        </section>

        <section data-organism-id="toolUsageHighlights" class="mt-5 rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-4">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-[var(--text-strong,currentColor)]">${this.msg.usageTitle}</h2>
              <p class="mt-1 text-sm leading-5 text-[var(--text-muted,currentColor)]">${this.msg.usageIntro}</p>
            </div>
            <button type="button" @click=${() => this.openAgents()} class="min-h-11 shrink-0 rounded-lg bg-[var(--button-secondary-bg,transparent)] px-3 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">${this.msg.openAgents}</button>
          </div>
          ${this.renderUsage(this.toolUsage)}
        </section>

        <section data-organism-id="catalogUpdatesTimeline" class="mt-5 rounded-xl border border-[var(--border-subtle,currentColor)] bg-[var(--surface-alt-bg,transparent)] p-4">
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-[var(--text-strong,currentColor)]">${this.msg.updatesTitle}</h2>
            <p class="mt-1 text-sm leading-5 text-[var(--text-muted,currentColor)]">${this.msg.updatesIntro}</p>
          </div>
          ${updatesError ? html`
            <div class="rounded-lg bg-[var(--status-error-bg,transparent)] p-4" role="alert" aria-live="polite">
              <p class="text-sm text-[var(--status-error-text,currentColor)]">${errorText(this.listCatalogUpdatesError, this.msg.updatesError)}</p>
              <button type="button" @click=${() => this.listCatalogUpdates()} class="mt-3 min-h-11 rounded-lg bg-[var(--button-secondary-bg,transparent)] px-3 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">${this.msg.retryUpdates}</button>
            </div>
          ` : html`
            ${this.renderUpdates(updates)}
            ${this.updates?.hasMore ? html`
              <button type="button" ?disabled=${this.listCatalogUpdatesStatus === 'loading'} @click=${() => this.listCatalogUpdates((this.updates?.page ?? 1) + 1, true)} class="mt-4 min-h-11 w-full rounded-lg border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">${this.msg.loadMore}</button>
            ` : ''}
          `}
        </section>
      </main>
    `;
  }
}
