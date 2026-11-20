/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/agent_tools.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsAgent_toolsShared } from '/_102047_/l2/agents/web/shared/agent_tools.js';
import type { AutomaticToolChoice, ErrorState, ToolTreeAction } from '/_102047_/l2/agents/web/shared/agent_tools.js';
import '/_102040_/l2/molecules/groupenterboolean/ml-toggle-switch.js';
import '/_102040_/l2/molecules/groupviewdata/ml-timeline-view.js';
import '/_102040_/l2/molecules/groupviewhierarchy/ml-hierarchy-tree.js';

type ToolSubject = {
  key: string;
  title: string;
  actions: ToolTreeAction[];
};

type ToolModule = {
  key: string;
  title: string;
  subjects: ToolSubject[];
};

function toolModules(actions: ToolTreeAction[]): ToolModule[] {
  const modules = new Map<string, ToolModule>();
  for (const action of actions) {
    let module = modules.get(action.moduleName);
    if (!module) {
      module = {
        key: action.moduleName,
        title: action.details.moduleTitle,
        subjects: [],
      };
      modules.set(action.moduleName, module);
    }
    let subject = module.subjects.find((item) => item.key === action.subject);
    if (!subject) {
      subject = {
        key: action.subject,
        title: action.details.subjectTitle,
        actions: [],
      };
      module.subjects.push(subject);
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

function errorText(error: ErrorState, fallback: string): string {
  return error?.message || fallback;
}

/// **collab_i18n_start**
const pageMessage_en = {
  pageTitle: 'Agent tools',
  toolsFor: 'Tools for',
  toolsTree: 'Available tools',
  automaticChoices: 'Automatic choices',
  on: 'On',
  choiceUpdated: 'Tool choice updated.',
  removed: 'Removed from release',
  chosenOn: 'Chosen on',
  chosenBy: 'Chosen by',
  automaticFromDraft: 'Turned on from a ready draft',
  automaticFromRelease: 'Turned on after a new release',
  automaticChoiceNote: 'Automatic choices do not override choices made by an admin.',
  noTools: 'No tools are available in the catalog yet.',
  noAutomaticChoices: 'No tools have been turned on automatically.',
  loadingTools: 'Loading tools…',
  loadingAutomaticChoices: 'Loading automatic choices…',
  toolsLoadFailed: 'Could not load the tools. Try again.',
  automaticChoicesLoadFailed: 'Could not load automatic choices. Try again.',
  toolChoiceFailed: 'Could not update this tool choice. Try again.',
  retryTools: 'Retry tools',
  retryAutomaticChoices: 'Retry automatic choices',
  noAgentSelected: 'Choose an agent before adjusting its tools.',
  openToolCatalog: 'Open tool catalog',
  catalogHelp: 'Use the catalog to review the tools available in this release.',
  situationAvailable: 'Available',
  situationRemoved: 'Removed',
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = {
  en: pageMessage_en,
};
/// **collab_i18n_end**

@customElement('agents--web--mobile--page11--agent_tools-102047')
export class AgentsMobilePage11Agent_toolsPage extends AgentsAgent_toolsShared {
  private msg: PageMessageType = pageMessage_en;

  renderToolTree() {
    const busy = this.enableUnchosenToolStatus === 'loading' || this.toggleToolChoiceStatus === 'loading';
    const commandError = this.enableUnchosenToolError ?? this.toggleToolChoiceError;

    return html`
      <section data-organism-id="agentToolTree" class="rounded-2xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-3 shadow-sm">
        ${this.getAgentToolTreeError
          ? html`
              <div aria-live="polite" class="mb-3 rounded-xl bg-[var(--status-error-bg,transparent)] px-3 py-3 text-sm text-[var(--status-error-text,currentColor)]">
                <p>${errorText(this.getAgentToolTreeError, this.msg.toolsLoadFailed)}</p>
                <button type="button" @click=${() => this.getAgentToolTree()} class="mt-2 min-h-11 rounded-lg border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-3 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">
                  ${this.msg.retryTools}
                </button>
              </div>
            `
          : ''}
        ${commandError
          ? html`<p aria-live="polite" class="mb-3 rounded-xl bg-[var(--status-error-bg,transparent)] px-3 py-3 text-sm text-[var(--status-error-text,currentColor)]">${errorText(commandError, this.msg.toolChoiceFailed)}</p>`
          : ''}
        ${(this.enableUnchosenToolStatus === 'success' || this.toggleToolChoiceStatus === 'success')
          ? html`<p aria-live="polite" class="mb-3 rounded-xl bg-[var(--status-success-bg,transparent)] px-3 py-2 text-sm text-[var(--status-success-text,currentColor)]">${this.msg.choiceUpdated}</p>`
          : ''}
        <groupviewhierarchy--ml-hierarchy-tree
          .multiple=${true}
          .expandAll=${true}
          .loading=${this.getAgentToolTreeStatus === 'loading'}
          data-class="w-full"
        >
          <Label data-class="mb-3 block text-sm font-semibold text-[var(--text-strong,currentColor)]">${this.msg.toolsTree}</Label>
          ${toolModules(this.actions).map((module) => html`
            <Node value=${module.key} expanded data-class="min-h-11 rounded-lg text-[var(--text-strong,currentColor)]">
              <span class="font-semibold">${module.title}</span>
              ${module.subjects.map((subject) => html`
                <Node value=${`${module.key}-${subject.key}`} expanded data-class="min-h-11 rounded-lg text-[var(--text-default,currentColor)]">
                  <span class="font-medium">${subject.title}</span>
                  ${subject.actions.map((action) => html`
                    <Node value=${action.id} ?disabled=${action.status === 'removed'} data-class="min-h-11 rounded-lg">
                      <div class="w-full py-2 pr-1">
                        <div class="flex items-start gap-2">
                          <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-2">
                              <span class="font-medium text-[var(--text-strong,currentColor)]">${action.name}</span>
                              ${action.status === 'removed'
                                ? html`<span class="rounded-full bg-[var(--status-warning-bg,transparent)] px-2 py-0.5 text-xs font-semibold text-[var(--status-warning-text,currentColor)]">${this.msg.removed}</span>`
                                : ''}
                            </div>
                            <p class="mt-1 text-sm leading-5 text-[var(--text-muted,currentColor)]">${action.details.description}</p>
                            ${action.agentTool
                              ? html`
                                  <p class="mt-2 text-xs text-[var(--text-muted,currentColor)]">
                                    ${this.msg.chosenOn} ${formatDateTime(action.agentTool.details.decidedAt)}
                                    ${action.agentTool.details.decidedBy ? html` · ${this.msg.chosenBy} ${action.agentTool.details.decidedBy}` : ''}
                                  </p>
                                `
                              : ''}
                          </div>
                          <div @click=${(event: MouseEvent) => event.stopPropagation()}>
                            <groupenterboolean--ml-toggle-switch
                              .value=${action.agentTool?.enabled ?? false}
                              .name=${this.msg.on}
                              .isEditing=${true}
                              .disabled=${busy || action.status === 'removed'}
                              @change=${(event: CustomEvent<{ value: boolean }>) => {
                                if (action.agentTool) {
                                  this.toggleToolChoice(action.id, event.detail.value);
                                } else if (event.detail.value) {
                                  this.enableUnchosenTool(action.id);
                                }
                              }}
                            >
                              <Label>${this.msg.on}</Label>
                            </groupenterboolean--ml-toggle-switch>
                          </div>
                        </div>
                      </div>
                    </Node>
                  `)}
                </Node>
              `)}
            </Node>
          `)}
          <Empty data-class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.noTools}</Empty>
        </groupviewhierarchy--ml-hierarchy-tree>
        ${this.getAgentToolTreeStatus === 'loading'
          ? html`<p class="sr-only" aria-live="polite">${this.msg.loadingTools}</p>`
          : ''}
      </section>
    `;
  }

  renderAutomaticChoices() {
    return html`
      <section data-organism-id="automaticToolChoices" class="mt-5 rounded-2xl border border-[var(--border-subtle,currentColor)] bg-[var(--surface-alt-bg,transparent)] p-3">
        ${this.listAutomaticToolChoicesError
          ? html`
              <div aria-live="polite" class="mb-3 rounded-xl bg-[var(--status-error-bg,transparent)] px-3 py-3 text-sm text-[var(--status-error-text,currentColor)]">
                <p>${errorText(this.listAutomaticToolChoicesError, this.msg.automaticChoicesLoadFailed)}</p>
                <button type="button" @click=${() => this.listAutomaticToolChoices()} class="mt-2 min-h-11 rounded-lg border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-3 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">${this.msg.retryAutomaticChoices}</button>
              </div>
            `
          : ''}
        <h2 class="mb-1 text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.automaticChoices}</h2>
        <p class="mb-3 text-sm leading-5 text-[var(--text-muted,currentColor)]">${this.msg.automaticChoiceNote}</p>
        <groupviewdata--ml-timeline-view .loading=${this.listAutomaticToolChoicesStatus === 'loading'} .hoverable=${false}>
          <Columns>
            <Column field="tool" header=${this.msg.toolsTree}></Column>
            <Column field="chosenOn" header=${this.msg.chosenOn}></Column>
          </Columns>
          <Rows>
            ${this.choices.map((choice: AutomaticToolChoice) => html`
              <Row>
                <Cell>
                  <div class="font-medium text-[var(--text-strong,currentColor)]">${choice.details.toolName}</div>
                  <div class="mt-1 text-sm text-[var(--text-muted,currentColor)]">
                    ${choice.details.automaticOrigin === 'draftSuggestion' ? this.msg.automaticFromDraft : this.msg.automaticFromRelease}
                    ${choice.details.toolRemoved ? html` · ${this.msg.removed}` : ''}
                  </div>
                </Cell>
                <Cell><span class="text-sm text-[var(--text-muted,currentColor)]">${formatDateTime(choice.details.decidedAt)}</span></Cell>
              </Row>
            `)}
          </Rows>
          <Empty data-class="py-7 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.noAutomaticChoices}</Empty>
          <Loading data-class="py-7 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingAutomaticChoices}</Loading>
        </groupviewdata--ml-timeline-view>
        <div class="mt-4 border-t border-[var(--border-subtle,currentColor)] pt-3">
          <p class="mb-2 text-sm text-[var(--text-muted,currentColor)]">${this.msg.catalogHelp}</p>
          <button type="button" @click=${() => this.openToolCatalog()} class="min-h-11 rounded-lg border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">${this.msg.openToolCatalog}</button>
        </div>
      </section>
    `;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    if (!this.agentId) {
      return html`
        <main class="min-h-full bg-[var(--page-bg,transparent)] px-4 py-5 text-[var(--text-default,currentColor)]">
          <h1 class="text-xl font-semibold text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
          <section class="mt-5 rounded-2xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-4">
            <p class="text-sm leading-6 text-[var(--text-default,currentColor)]">${this.msg.noAgentSelected}</p>
            <button type="button" @click=${() => this.openToolCatalog()} class="mt-4 min-h-11 rounded-lg bg-[var(--button-primary-bg,transparent)] px-4 text-sm font-semibold text-[var(--button-primary-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">${this.msg.openToolCatalog}</button>
          </section>
        </main>
      `;
    }
    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] px-4 py-5 text-[var(--text-default,currentColor)]">
        <header class="mb-5">
          <h1 class="text-xl font-semibold text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
          ${this.name ? html`<p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${this.msg.toolsFor} @${this.name}</p>` : ''}
        </header>
        ${this.renderToolTree()}
        ${this.renderAutomaticChoices()}
      </main>
    `;
  }
}
