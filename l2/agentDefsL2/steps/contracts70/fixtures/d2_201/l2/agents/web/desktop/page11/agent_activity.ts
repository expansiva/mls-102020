/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/agent_activity.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsAgent_activityShared } from '/_102047_/l2/agents/web/shared/agent_activity.js';
import type { ErrorState, ExecutionAction, ExecutionEntry } from '/_102047_/l2/agents/web/shared/agent_activity.js';
import '/_102040_/l2/molecules/groupviewdata/ml-timeline-view.js';
import '/_102040_/l2/molecules/groupexpandcontent/ml-collapsible-panel.js';

/// **collab_i18n_start**
const pageMessage_en = {
  pageTitle: 'Agent activity',
  activityFor: 'Activity for',
  startedAt: 'Started at',
  execution: 'Execution',
  duration: 'Duration',
  cost: 'Cost',
  calledBy: 'Called by',
  personTookOver: 'A person took over',
  agentHandled: 'Agent handled the conversation',
  actionsAndResults: 'Actions and results',
  action: 'Action',
  result: 'Result',
  resultNote: 'Result note',
  succeeded: 'Succeeded',
  failed: 'Failed',
  refused: 'Refused',
  openConversation: 'Open conversation',
  noActivity: 'No finished runs yet',
  noActivityDescription: 'This agent has no finished activity to review.',
  loadingActivity: 'Loading agent activity…',
  loadingOlderRuns: 'Loading older runs…',
  loadOlderRuns: 'Load older runs',
  retry: 'Try again',
  unableToLoad: 'We could not load this agent’s activity.',
  chooseAgent: 'Choose an agent from Agents to view its activity.',
  unknownAgent: 'Agent',
  noCaller: 'Unknown caller',
  notReported: 'Not reported'
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = { 'en': pageMessage_en };
/// **collab_i18n_end**

const RESULT_KEY: Record<ExecutionAction['result'], keyof PageMessageType> = {
  succeeded: 'succeeded',
  failed: 'failed',
  refused: 'refused'
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) return `${durationMs} ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)} s`;
  return `${Math.floor(durationMs / 60000)} min ${Math.floor((durationMs % 60000) / 1000)} s`;
}

function errorText(error: ErrorState, msg: PageMessageType) {
  if (error?.message) return error.message;
  if (error?.code === 'client.preconditionMissing') return msg.chooseAgent;
  return msg.unableToLoad;
}

@customElement('agents--web--desktop--page11--agent_activity-102047')
export class AgentsDesktopPage11Agent_activityPage extends AgentsAgent_activityShared {
  private msg: PageMessageType = pageMessage_en;

  private renderActions(entry: ExecutionEntry) {
    return html`
      <groupexpandcontent--ml-collapsible-panel
        .multiple=${true}
        .loading=${false}
        data-class="mt-4 w-full border-t border-[var(--border-subtle,currentColor)] pt-3">
        <Section title=${this.msg.actionsAndResults}>
          <div class="overflow-hidden rounded-lg border border-[var(--border-subtle,currentColor)]">
            <div class="grid grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] gap-4 bg-[var(--surface-alt-bg,transparent)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted,currentColor)]">
              <span>${this.msg.action}</span>
              <span>${this.msg.result}</span>
              <span>${this.msg.resultNote}</span>
            </div>
            ${entry.details.actions.map((action) => html`
              <div class="grid grid-cols-[minmax(0,1fr)_9rem_minmax(0,1fr)] gap-4 border-t border-[var(--border-subtle,currentColor)] px-4 py-3 text-sm text-[var(--text-default,currentColor)]">
                <span class="font-medium text-[var(--text-strong,currentColor)]">${action.toolName}</span>
                <span class="font-medium">${this.msg[RESULT_KEY[action.result]]}</span>
                <span class="text-[var(--text-muted,currentColor)]">${action.resultNote ?? this.msg.notReported}</span>
              </div>
            `)}
          </div>
        </Section>
      </groupexpandcontent--ml-collapsible-panel>
    `;
  }

  private renderTimeline() {
    const executions = this.executions;
    const isOpening = this.pageStatus === 'loading';
    const openingError = this.pageStatus === 'error';

    if (openingError) {
      return html`
        <section class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-8" aria-live="polite">
          <p class="text-sm text-[var(--text-default,currentColor)]">${errorText(this.getAgentActivityError, this.msg)}</p>
          <button
            type="button"
            class="mt-4 rounded-lg border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 py-2 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
            @click=${() => this.getAgentActivity()}>
            ${this.msg.retry}
          </button>
        </section>
      `;
    }

    return html`
      <groupviewdata--ml-timeline-view
        .loading=${isOpening}
        .hoverable=${true}
        data-class="block w-full"
        aria-label=${this.msg.pageTitle}>
        <Columns>
          <Column field="startedAt" header=${this.msg.startedAt} width="12rem"></Column>
          <Column field="execution" header=${this.msg.execution}></Column>
        </Columns>
        <Rows>
          ${(executions?.items ?? []).map((entry) => html`
            <Row>
              <Cell data-class="text-sm text-[var(--text-muted,currentColor)]">
                ${formatDateTime(entry.startedAt)}
              </Cell>
              <Cell>
                <div class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-4">
                  <dl class="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    <div>
                      <dt class="text-[var(--text-muted,currentColor)]">${this.msg.duration}</dt>
                      <dd class="mt-1 font-semibold text-[var(--text-strong,currentColor)]">${formatDuration(entry.details.durationMs)}</dd>
                    </div>
                    <div>
                      <dt class="text-[var(--text-muted,currentColor)]">${this.msg.cost}</dt>
                      <dd class="mt-1 font-semibold text-[var(--text-strong,currentColor)]">${entry.details.cost ?? this.msg.notReported}</dd>
                    </div>
                    <div>
                      <dt class="text-[var(--text-muted,currentColor)]">${this.msg.calledBy}</dt>
                      <dd class="mt-1 font-semibold text-[var(--text-strong,currentColor)]">${entry.organizationUser?.details.identification.name ?? this.msg.noCaller}</dd>
                    </div>
                    <div>
                      <dt class="text-[var(--text-muted,currentColor)]">${this.msg.personTookOver}</dt>
                      <dd class="mt-1 font-semibold text-[var(--text-strong,currentColor)]">${entry.details.tookOver ? this.msg.personTookOver : this.msg.agentHandled}</dd>
                    </div>
                  </dl>
                  ${this.renderActions(entry)}
                  ${entry.details.conversationLink ? html`
                    <a
                      class="mt-4 inline-flex text-sm font-semibold text-[var(--link-text,currentColor)] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
                      href=${entry.details.conversationLink}
                      target="_blank"
                      rel="noopener noreferrer">
                      ${this.msg.openConversation}
                    </a>
                  ` : ''}
                </div>
              </Cell>
            </Row>
          `)}
        </Rows>
        <Loading>
          <div class="space-y-4 p-6" aria-live="polite">
            <p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingActivity}</p>
            <div class="h-24 animate-pulse rounded-xl bg-[var(--surface-alt-bg,transparent)]"></div>
            <div class="h-24 animate-pulse rounded-xl bg-[var(--surface-alt-bg,transparent)]"></div>
          </div>
        </Loading>
        <Empty>
          <div class="p-10 text-center">
            <p class="font-semibold text-[var(--text-strong,currentColor)]">${this.msg.noActivity}</p>
            <p class="mt-2 text-sm text-[var(--text-muted,currentColor)]">${this.msg.noActivityDescription}</p>
          </div>
        </Empty>
      </groupviewdata--ml-timeline-view>
      ${executions?.hasMore ? html`
        <div class="mt-6 flex flex-col items-start gap-3" aria-live="polite">
          ${this.listAgentExecutionsError ? html`
            <p class="text-sm text-[var(--text-default,currentColor)]">${errorText(this.listAgentExecutionsError, this.msg)}</p>
          ` : ''}
          <button
            type="button"
            ?disabled=${this.listAgentExecutionsStatus === 'loading'}
            class="rounded-lg border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 py-2 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
            @click=${() => this.listAgentExecutions((executions.page + 1), true)}>
            ${this.listAgentExecutionsStatus === 'loading' ? this.msg.loadingOlderRuns : this.msg.loadOlderRuns}
          </button>
        </div>
      ` : ''}
    `;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] px-8 py-8 text-[var(--text-default,currentColor)]">
        <div class="mx-auto max-w-6xl">
          <header class="mb-8 border-b border-[var(--border-subtle,currentColor)] pb-6">
            <p class="text-sm font-medium text-[var(--text-muted,currentColor)]">${this.msg.activityFor}</p>
            <h1 class="mt-1 text-3xl font-semibold tracking-tight text-[var(--text-strong,currentColor)]">@${this.agent?.name ?? this.msg.unknownAgent}</h1>
          </header>
          <section data-organism-id="executionTimeline" aria-label=${this.msg.pageTitle}>
            ${this.renderTimeline()}
          </section>
        </div>
      </main>
    `;
  }
}
