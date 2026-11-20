/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/agent_tools.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsAgent_toolsShared } from '/_102047_/l2/agents/web/shared/agent_tools.js';
import type { AutomaticToolChoice, ErrorState, ToolTreeAction } from '/_102047_/l2/agents/web/shared/agent_tools.js';
import '/_102040_/l2/molecules/groupenterboolean/ml-checkbox-preference.js';
import '/_102040_/l2/molecules/groupviewdata/ml-timeline-view.js';
import '/_102040_/l2/molecules/groupviewhierarchy/ml-hierarchy-tree.js';

type SubjectGroup = {
  title: string;
  actions: ToolTreeAction[];
};

type ModuleGroup = {
  title: string;
  subjects: Map<string, SubjectGroup>;
};

function treeGroups(actions: ToolTreeAction[]): ModuleGroup[] {
  const modules = new Map<string, ModuleGroup>();
  for (const action of actions) {
    let module = modules.get(action.moduleName);
    if (!module) {
      module = { title: action.details.moduleTitle, subjects: new Map<string, SubjectGroup>() };
      modules.set(action.moduleName, module);
    }
    let subject = module.subjects.get(action.subject);
    if (!subject) {
      subject = { title: action.details.subjectTitle, actions: [] };
      module.subjects.set(action.subject, subject);
    }
    subject.actions.push(action);
  }
  return [...modules.values()];
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

/// **collab_i18n_start**
const pageMessage_en = {
  pageTitle: 'Agent tools',
  agentContext: 'Set the actions available to this agent.',
  loadingPage: 'Loading agent tools…',
  missingAgentTitle: 'Choose an agent first',
  missingAgentText: 'This page needs an agent before its tools can be shown.',
  backToAgents: 'Back to Agents',
  catalogTitle: 'Tool catalog',
  catalogHint: 'Turn actions on or off for this agent. Removed actions stay visible but cannot be used.',
  automaticTitle: 'Automatic choices',
  automaticHint: 'System choices are shown here. Your choices are never changed automatically.',
  openCatalog: 'Open tool catalog',
  loadingTree: 'Loading the tool catalog…',
  loadingHistory: 'Loading automatic choices…',
  emptyTree: 'No tools are available in the catalog.',
  emptyHistory: 'No tools have been chosen automatically.',
  removed: 'Removed',
  available: 'Available',
  on: 'On',
  off: 'Off',
  chosenOn: 'Chosen on',
  chosenBy: 'Chosen by person',
  automatic: 'Automatic choice',
  draftSuggestion: 'Suggested by a ready draft',
  catalogRefresh: 'Chosen after a catalog refresh',
  release: 'Release',
  toolChoiceUpdated: 'Tool choice updated.',
  retryCatalog: 'Retry loading catalog',
  retryHistory: 'Retry loading history',
  errorFallback: 'Something went wrong. Please try again.',
  preconditionError: 'The agent needed to show these tools is unavailable.',
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = {
  'en': pageMessage_en,
};
/// **collab_i18n_end**

const ORIGIN_KEY: Record<NonNullable<AutomaticToolChoice['details']['automaticOrigin']>, keyof PageMessageType> = {
  draftSuggestion: 'draftSuggestion',
  catalogRefresh: 'catalogRefresh',
};

function errorText(error: ErrorState, msg: PageMessageType): string {
  if (!error) return '';
  if (error.message) return error.message;
  if (error.code === 'client.preconditionMissing') return msg.preconditionError;
  return msg.errorFallback;
}

@customElement('agents--web--desktop--page11--agent_tools-102047')
export class AgentsDesktopPage11Agent_toolsPage extends AgentsAgent_toolsShared {
  private msg: PageMessageType = pageMessage_en;

  private renderAction(action: ToolTreeAction) {
    const choice = action.agentTool;
    const removed = action.status === 'removed';
    const busy = this.enableUnchosenToolStatus === 'loading' || this.toggleToolChoiceStatus === 'loading';
    const choiceMeta = choice
      ? html`
          <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted,currentColor)]">
            <span>${this.msg.chosenOn} ${formatDateTime(choice.details.decidedAt)}</span>
            ${choice.details.decidedBy
              ? html`<span>${this.msg.chosenBy} ${choice.details.decidedBy}</span>`
              : html`<span>${this.msg.automatic}</span>`}
          </div>
        `
      : html``;
    return html`
      <Node value=${action.id} ?disabled=${removed} data-class="py-2">
        <div class="flex items-start gap-3 rounded-lg px-2 py-2 ${removed ? 'bg-[var(--surface-alt-bg,transparent)]' : ''}">
          <groupenterboolean--ml-checkbox-preference
            .value=${choice?.enabled ?? false}
            .isEditing=${true}
            .disabled=${removed || busy}
            @change=${(e: CustomEvent<{ value: boolean }>) => {
              if (choice) {
                this.toggleToolChoice(action.id, e.detail.value);
              } else if (e.detail.value) {
                this.enableUnchosenTool(action.id);
              }
            }}
          >
            <Label data-class="font-medium text-[var(--text-strong,currentColor)]">${action.name}</Label>
            <Helper data-class="text-[var(--text-muted,currentColor)]">${action.details.description}</Helper>
          </groupenterboolean--ml-checkbox-preference>
          <div class="shrink-0 pt-1 text-xs font-medium ${removed ? 'text-[var(--status-warning-text,currentColor)]' : 'text-[var(--text-muted,currentColor)]'}">
            ${removed ? this.msg.removed : choice?.enabled ? this.msg.on : this.msg.off}
          </div>
        </div>
        ${choiceMeta}
      </Node>
    `;
  }

  private renderTree() {
    const treeError = errorText(this.getAgentToolTreeError, this.msg);
    const commandError = errorText(this.enableUnchosenToolError ?? this.toggleToolChoiceError, this.msg);
    const success = this.enableUnchosenToolStatus === 'success' || this.toggleToolChoiceStatus === 'success';
    return html`
      <section data-organism-id="agentToolTree" class="min-w-0 rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-5 shadow-sm">
        <div class="mb-4 flex items-start justify-between gap-5">
          <div>
            <h2 class="text-lg font-semibold text-[var(--text-strong,currentColor)]">${this.msg.catalogTitle}</h2>
            <p class="mt-1 max-w-3xl text-sm text-[var(--text-muted,currentColor)]">${this.msg.catalogHint}</p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-md border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-3 py-2 text-sm font-medium text-[var(--button-secondary-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
            ?disabled=${this.getAgentToolTreeStatus === 'loading'}
            @click=${() => this.getAgentToolTree()}
          >${this.msg.retryCatalog}</button>
        </div>
        ${treeError ? html`<p aria-live="polite" class="mb-4 rounded-md bg-[var(--status-error-bg,transparent)] px-3 py-2 text-sm text-[var(--status-error-text,currentColor)]">${treeError}</p>` : html``}
        ${commandError ? html`<p aria-live="polite" class="mb-4 rounded-md bg-[var(--status-error-bg,transparent)] px-3 py-2 text-sm text-[var(--status-error-text,currentColor)]">${commandError}</p>` : html``}
        ${success ? html`<p aria-live="polite" class="mb-4 rounded-md bg-[var(--status-success-bg,transparent)] px-3 py-2 text-sm text-[var(--status-success-text,currentColor)]">${this.msg.toolChoiceUpdated}</p>` : html``}
        <groupviewhierarchy--ml-hierarchy-tree
          .multiple=${true}
          .expandAll=${true}
          .loading=${this.getAgentToolTreeStatus === 'loading'}
          data-class="w-full"
        >
          ${treeGroups(this.actions).map((module) => html`
            <Node expanded data-class="font-semibold text-[var(--text-strong,currentColor)]">
              ${module.title}
              ${[...module.subjects.values()].map((subject) => html`
                <Node expanded data-class="font-medium text-[var(--text-default,currentColor)]">
                  ${subject.title}
                  ${subject.actions.map((action) => this.renderAction(action))}
                </Node>
              `)}
            </Node>
          `)}
          <Empty data-class="py-10 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.emptyTree}</Empty>
        </groupviewhierarchy--ml-hierarchy-tree>
      </section>
    `;
  }

  private renderHistory() {
    const historyError = errorText(this.listAutomaticToolChoicesError, this.msg);
    return html`
      <aside data-organism-id="automaticToolChoices" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-5 shadow-sm">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-[var(--text-strong,currentColor)]">${this.msg.automaticTitle}</h2>
            <p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${this.msg.automaticHint}</p>
          </div>
          <button type="button" class="shrink-0 rounded-md bg-[var(--button-primary-bg,transparent)] px-3 py-2 text-sm font-medium text-[var(--button-primary-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.openToolCatalog()}>${this.msg.openCatalog}</button>
        </div>
        ${historyError ? html`
          <div class="mt-4" aria-live="polite">
            <p class="rounded-md bg-[var(--status-error-bg,transparent)] px-3 py-2 text-sm text-[var(--status-error-text,currentColor)]">${historyError}</p>
            <button type="button" class="mt-2 text-sm font-medium text-[var(--link-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.listAutomaticToolChoices()}>${this.msg.retryHistory}</button>
          </div>
        ` : html``}
        <div class="mt-5">
          <groupviewdata--ml-timeline-view .loading=${this.listAutomaticToolChoicesStatus === 'loading'} .hoverable=${false}>
            <Columns>
              <Column field="tool" header=${this.msg.catalogTitle}></Column>
              <Column field="choice" header=${this.msg.automaticTitle}></Column>
            </Columns>
            <Rows>
              ${this.choices.map((choice) => html`
                <Row ?disabled=${choice.details.toolRemoved}>
                  <Cell>
                    <div class="font-medium text-[var(--text-strong,currentColor)]">${choice.details.toolName}</div>
                    <div class="mt-1 text-xs text-[var(--text-muted,currentColor)]">${choice.enabled ? this.msg.on : this.msg.off}${choice.details.toolRemoved ? html` · ${this.msg.removed}` : html``}</div>
                  </Cell>
                  <Cell>
                    <div class="text-sm text-[var(--text-default,currentColor)]">${choice.details.automaticOrigin ? this.msg[ORIGIN_KEY[choice.details.automaticOrigin]] : this.msg.automatic}</div>
                    <div class="mt-1 text-xs text-[var(--text-muted,currentColor)]">${this.msg.chosenOn} ${formatDateTime(choice.details.decidedAt)}</div>
                    ${choice.tool.details.releaseLabel ? html`<div class="mt-1 text-xs text-[var(--text-muted,currentColor)]">${this.msg.release} ${choice.tool.details.releaseLabel}</div>` : html``}
                  </Cell>
                </Row>
              `)}
            </Rows>
            <Loading><div class="py-10 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingHistory}</div></Loading>
            <Empty><div class="py-10 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.emptyHistory}</div></Empty>
          </groupviewdata--ml-timeline-view>
        </div>
      </aside>
    `;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    if (this.pageStatus === 'loading') {
      return html`<main class="min-h-full bg-[var(--page-bg,transparent)] p-8" aria-busy="true"><p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingPage}</p></main>`;
    }
    if (!this.agentId) {
      return html`
        <main class="min-h-full bg-[var(--page-bg,transparent)] p-8">
          <section class="max-w-xl rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-6">
            <h1 class="text-xl font-semibold text-[var(--text-strong,currentColor)]">${this.msg.missingAgentTitle}</h1>
            <p class="mt-2 text-sm text-[var(--text-muted,currentColor)]">${this.msg.missingAgentText}</p>
            <a href="/agents" class="mt-5 inline-flex rounded-md bg-[var(--button-primary-bg,transparent)] px-4 py-2 text-sm font-medium text-[var(--button-primary-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">${this.msg.backToAgents}</a>
          </section>
        </main>
      `;
    }
    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] p-8">
        <header class="mb-7">
          <h1 class="text-2xl font-semibold tracking-tight text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
          <p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">@${this.name} · ${this.msg.agentContext}</p>
        </header>
        <div class="grid grid-cols-[minmax(0,1fr)_24rem] items-start gap-6">
          ${this.renderTree()}
          ${this.renderHistory()}
        </div>
      </main>
    `;
  }
}
