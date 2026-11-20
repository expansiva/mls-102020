/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/tool_catalog.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsTool_catalogShared } from '/_102047_/l2/agents/web/shared/tool_catalog.js';
import type { CatalogTool, CatalogUpdate, ErrorState } from '/_102047_/l2/agents/web/shared/tool_catalog.js';
import '/_102040_/l2/molecules/groupviewhierarchy/ml-hierarchy-tree.js';
import '/_102040_/l2/molecules/groupviewdata/ml-card-grid.js';
import '/_102040_/l2/molecules/groupviewdata/ml-timeline-view.js';
import '/_102020_/l2/molecules/ml-scenary.js';

/// **collab_i18n_start**
const pageMessage_en = {
  pageTitle: 'Tool catalog',
  catalogSceneTitle: 'Catalog browser',
  updatesSceneTitle: 'Catalog updates',
  backToCatalog: 'Back to catalog',
  treeLabel: 'Tools by module',
  usageTitle: 'Agent usage',
  usageIntro: 'See which actions agents rely on most.',
  viewAgents: 'View agents',
  toolName: 'Tool',
  description: 'Description',
  module: 'Module',
  subject: 'Subject',
  agentsUsing: 'Agents using it',
  available: 'Available',
  removed: 'Removed',
  added: 'Added',
  removedOn: 'Removed on',
  addedOn: 'Added on',
  refreshCatalog: 'Refresh catalog',
  refreshUpdates: 'Refresh updates',
  loadUpdates: 'Load updates',
  loadMore: 'Load more updates',
  loadingCatalog: 'Loading the tool catalog…',
  loadingUpdates: 'Loading catalog updates…',
  noTools: 'No tools are available in the catalog yet.',
  noUsage: 'Usage information is not available to you.',
  noUpdates: 'No catalog updates have been recorded yet.',
  catalogUnavailable: 'We could not load the tool catalog.',
  updatesUnavailable: 'We could not load catalog updates.',
  missingAccess: 'This catalog needs the organization context that was not provided.',
  goToAgents: 'Go to agents',
  releaseHistory: 'Release history',
  currentCatalog: 'Current catalog'
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = {
  'en': pageMessage_en
};
/// **collab_i18n_end**

function statusKey(status: CatalogTool['status'] | CatalogUpdate['status']): keyof PageMessageType {
  return status === 'removed' ? 'removed' : 'available';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
    dateStyle: 'medium'
  }).format(new Date(value));
}

function messageFor(error: ErrorState, fallback: string): string {
  return error?.message || fallback;
}

@customElement('agents--web--desktop--page11--tool_catalog-102047')
export class AgentsDesktopPage11Tool_catalogPage extends AgentsTool_catalogShared {
  private msg: PageMessageType = pageMessage_en;

  renderTree() {
    const loading = this.getToolCatalogStatus === 'loading' || this.pageStatus === 'loading';
    const failure = this.getToolCatalogStatus === 'error' || this.pageStatus === 'error';
    const missingContext = this.getToolCatalogError?.code === 'client.preconditionMissing';

    return html`
      <section data-organism-id="toolCatalogTree" class="min-w-0 rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-5">
        ${failure ? html`
          <div class="flex min-h-72 flex-col items-start justify-center gap-4" role="alert" aria-live="polite">
            <p class="max-w-lg text-sm text-[var(--text-default,currentColor)]">
              ${missingContext
                ? this.msg.missingAccess
                : messageFor(this.getToolCatalogError, this.msg.catalogUnavailable)}
            </p>
            <div class="flex gap-3">
              <button type="button" @click=${() => this.getToolCatalog()} class="min-h-10 rounded-lg bg-[var(--button-primary-bg,transparent)] px-4 text-sm font-semibold text-[var(--button-primary-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">
                ${this.msg.refreshCatalog}
              </button>
              ${missingContext ? html`
                <button type="button" @click=${() => this.openAgents()} class="min-h-10 rounded-lg border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">
                  ${this.msg.goToAgents}
                </button>
              ` : ''}
            </div>
          </div>
        ` : html`
          <groupviewhierarchy--ml-hierarchy-tree
            data-class="w-full"
            .multiple=${true}
            .expandAll=${true}
            .loading=${loading}>
            <Label data-class="mb-4 text-sm font-semibold text-[var(--text-strong,currentColor)]">${this.msg.treeLabel}</Label>
            ${this.modules.map(module => html`
              <Node data-class="font-semibold text-[var(--text-strong,currentColor)]">
                <span>${module.details.moduleTitle}</span>
                ${module.subjects.map(subject => html`
                  <Node data-class="font-medium text-[var(--text-default,currentColor)]">
                    <span>${subject.details.subjectTitle}</span>
                    ${subject.tools.map(tool => html`
                      <Node data-class="text-[var(--text-default,currentColor)]">
                        <div class="flex max-w-2xl items-start justify-between gap-4 py-1">
                          <div class="min-w-0">
                            <p class="font-medium text-[var(--text-strong,currentColor)]">${tool.name}</p>
                            <p class="mt-1 text-sm font-normal text-[var(--text-muted,currentColor)]">${tool.details.description}</p>
                          </div>
                          ${tool.status === 'removed' ? html`
                            <span class="shrink-0 rounded-full bg-[var(--status-warning-bg,transparent)] px-2 py-1 text-xs font-semibold text-[var(--status-warning-text,currentColor)]">${this.msg[statusKey(tool.status)]}</span>
                          ` : ''}
                        </div>
                      </Node>
                    `)}
                  </Node>
                `)}
              </Node>
            `)}
            <Empty data-class="py-12 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.noTools}</Empty>
          </groupviewhierarchy--ml-hierarchy-tree>
        `}
      </section>
    `;
  }

  renderUsage() {
    const loading = this.getToolCatalogStatus === 'loading' || this.pageStatus === 'loading';
    return html`
      <aside data-organism-id="toolUsageHighlights" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-alt-bg,transparent)] p-5">
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 class="text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.usageTitle}</h2>
            <p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${this.msg.usageIntro}</p>
          </div>
          <button type="button" @click=${() => this.openAgents()} class="shrink-0 text-sm font-semibold text-[var(--link-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">
            ${this.msg.viewAgents}
          </button>
        </div>
        <groupviewdata--ml-card-grid
          data-class="w-full"
          .hoverable=${true}
          .loading=${loading}
          @row-click=${() => this.openAgents()}>
          <Columns>
            <Column field="name" header=${this.msg.toolName}></Column>
            <Column field="location" header=${this.msg.subject}></Column>
            <Column field="usage" header=${this.msg.agentsUsing}></Column>
          </Columns>
          <Rows>
            ${this.toolUsage.map(usage => html`
              <Row data-class="cursor-pointer">
                <Cell data-class="font-semibold text-[var(--text-strong,currentColor)]">${usage.name}</Cell>
                <Cell data-class="text-sm text-[var(--text-muted,currentColor)]">${usage.details.moduleTitle} · ${usage.details.subjectTitle}</Cell>
                <Cell>
                  <span class="inline-flex rounded-full bg-[var(--status-info-bg,transparent)] px-2 py-1 text-sm font-semibold text-[var(--status-info-text,currentColor)]">${usage.usedByAgents} ${this.msg.agentsUsing}</span>
                </Cell>
              </Row>
            `)}
          </Rows>
          <Loading data-class="py-10 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingCatalog}</Loading>
          <Empty data-class="py-10 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.noUsage}</Empty>
        </groupviewdata--ml-card-grid>
      </aside>
    `;
  }

  renderUpdates() {
    const loading = this.listCatalogUpdatesStatus === 'loading';
    const error = this.listCatalogUpdatesStatus === 'error';
    const updates = this.updates?.items ?? [];

    return html`
      <section data-organism-id="catalogUpdatesTimeline" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-6">
        <div class="mb-6 flex items-center justify-between gap-4">
          <div>
            <p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.releaseHistory}</p>
            <p class="mt-1 text-sm text-[var(--text-default,currentColor)]">${this.msg.currentCatalog}</p>
          </div>
          <button type="button" ?disabled=${loading} @click=${() => this.listCatalogUpdates()} class="min-h-10 rounded-lg border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">
            ${this.updates === null ? this.msg.loadUpdates : this.msg.refreshUpdates}
          </button>
        </div>
        ${error ? html`
          <div class="flex flex-wrap items-center gap-4 rounded-lg bg-[var(--status-error-bg,transparent)] p-4" role="alert" aria-live="polite">
            <p class="text-sm text-[var(--status-error-text,currentColor)]">${messageFor(this.listCatalogUpdatesError, this.msg.updatesUnavailable)}</p>
            <button type="button" @click=${() => this.listCatalogUpdates()} class="text-sm font-semibold text-[var(--link-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">${this.msg.refreshUpdates}</button>
          </div>
        ` : html`
          <groupviewdata--ml-timeline-view data-class="w-full" .hoverable=${true} .loading=${loading}>
            <Columns>
              <Column field="tool" header=${this.msg.toolName}></Column>
              <Column field="change" header=${this.msg.releaseHistory}></Column>
            </Columns>
            <Rows>
              ${updates.map(update => {
                const date = update.status === 'removed' ? update.details.removedAt : update.details.addedAt;
                const dateLabel = update.status === 'removed' ? this.msg.removedOn : this.msg.addedOn;
                return html`
                  <Row>
                    <Cell>
                      <p class="font-semibold text-[var(--text-strong,currentColor)]">${update.name}</p>
                      <p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${update.details.moduleTitle} · ${update.details.subjectTitle}</p>
                    </Cell>
                    <Cell>
                      <span class="inline-flex rounded-full ${update.status === 'removed' ? 'bg-[var(--status-warning-bg,transparent)] text-[var(--status-warning-text,currentColor)]' : 'bg-[var(--status-success-bg,transparent)] text-[var(--status-success-text,currentColor)]'} px-2 py-1 text-xs font-semibold">${this.msg[statusKey(update.status)]}</span>
                      ${date ? html`<p class="mt-2 text-sm text-[var(--text-muted,currentColor)]">${dateLabel} ${formatDate(date)}</p>` : ''}
                    </Cell>
                  </Row>
                `;
              })}
            </Rows>
            <Loading data-class="py-12 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingUpdates}</Loading>
            <Empty data-class="py-12 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.noUpdates}</Empty>
          </groupviewdata--ml-timeline-view>
          ${this.updates?.hasMore ? html`
            <div class="mt-6 flex justify-center">
              <button type="button" ?disabled=${loading} @click=${() => this.listCatalogUpdates(this.updates!.page + 1, true)} class="min-h-10 rounded-lg border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">${this.msg.loadMore}</button>
            </div>
          ` : ''}
        `}
      </section>
    `;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] px-8 py-7 text-[var(--text-default,currentColor)]">
        <header class="mx-auto mb-7 flex max-w-screen-2xl items-center justify-between gap-6">
          <div>
            <h1 class="text-2xl font-semibold tracking-tight text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
          </div>
          <button type="button" @click=${() => this.getToolCatalog()} class="min-h-10 rounded-lg border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">${this.msg.refreshCatalog}</button>
        </header>
        <molecules--ml-scenary-102020
          class="mx-auto block max-w-screen-2xl"
          mode="tabs"
          .value=${this.scenary || 'catalog'}
          .backLabel=${this.msg.backToCatalog}
          @change=${(e: CustomEvent<{ value: string }>) => { if (e.target === e.currentTarget) this.setScenario(e.detail.value); }}>
          <Scene value="catalog" title=${this.msg.catalogSceneTitle}>
            <div class="grid grid-cols-[minmax(0,1fr)_22rem] items-start gap-6">
              ${this.renderTree()}
              ${this.renderUsage()}
            </div>
          </Scene>
          <Scene value="updates" title=${this.msg.updatesSceneTitle}>
            ${this.renderUpdates()}
          </Scene>
        </molecules--ml-scenary-102020>
      </main>
    `;
  }
}
