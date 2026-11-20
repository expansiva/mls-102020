/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/agent_activity.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsAgent_activityShared } from '/_102047_/l2/agents/web/shared/agent_activity.js';
import type { ErrorState, ExecutionAction, ExecutionEntry } from '/_102047_/l2/agents/web/shared/agent_activity.js';
import '/_102040_/l2/molecules/groupexpandcontent/ml-accordion.js';
import '/_102040_/l2/molecules/groupviewdata/ml-timeline-view.js';

const formatStartedAt = (value: string) => new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

const formatDuration = (value: number) => `${new Intl.NumberFormat(document.documentElement.lang || undefined).format(value)} ms`;

const actionTone = (action: ExecutionAction) => {
  if (action.result === 'succeeded') return 'bg-[var(--status-success-bg,transparent)] text-[var(--status-success-text,currentColor)]';
  if (action.result === 'failed') return 'bg-[var(--status-error-bg,transparent)] text-[var(--status-error-text,currentColor)]';
  return 'bg-[var(--status-warning-bg,transparent)] text-[var(--status-warning-text,currentColor)]';
};

const errorMessage = (error: ErrorState, missingContext: string, fallback: string) => {
  if (error?.message) return error.message;
  if (error?.code === 'client.preconditionMissing') return missingContext;
  return fallback;
};

/// **collab_i18n_start**
const pageMessage_en = {
  pageTitle: 'Agent activity',
  agentPrefix: 'Activity for',
  timelineSummary: 'Execution',
  timelineDetails: 'Run details',
  startedAt: 'Started at',
  duration: 'Duration',
  cost: 'Cost',
  calledBy: 'Called by',
  personTookOver: 'A person took over',
  agentCompleted: 'Agent completed the conversation',
  actionsAndResults: 'Actions and results',
  action: 'Action',
  result: 'Result',
  resultSucceeded: 'Succeeded',
  resultFailed: 'Failed',
  resultRefused: 'Refused',
  noActions: 'No actions were reported for this run.',
  openConversation: 'Open conversation',
  loadingActivity: 'Loading activity…',
  noActivity: 'No activity has been recorded for this agent yet.',
  missingAgent: 'Choose an agent to see its activity.',
  loadActivityFailed: 'We could not load this activity.',
  loadMoreFailed: 'We could not load older runs.',
  retry: 'Try again',
  loadOlder: 'Load older runs',
  loadingOlder: 'Loading older runs…',
  activityFeed: 'Agent execution activity',
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = { 'en': pageMessage_en };
/// **collab_i18n_end**

@customElement('agents--web--mobile--page11--agent_activity-102047')
export class AgentsMobilePage11Agent_activityPage extends AgentsAgent_activityShared {
  private msg: PageMessageType = pageMessage_en;

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const openingError = this.getAgentActivityError;

    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] px-4 py-5 text-[var(--text-default,currentColor)]">
        <header class="mb-5">
          <h1 class="text-xl font-semibold tracking-tight text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
          ${this.agent ? html`
            <p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">
              ${this.msg.agentPrefix} <span class="font-medium text-[var(--text-default,currentColor)]">@${this.agent.name}</span>
            </p>
          ` : ''}
        </header>

        <section data-organism-id="executionTimeline" aria-label=${this.msg.activityFeed}>
          ${this.pageStatus === 'error' ? html`
            <div class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-5" aria-live="polite">
              <p class="text-sm leading-6 text-[var(--text-default,currentColor)]">${errorMessage(openingError, this.msg.missingAgent, this.msg.loadActivityFailed)}</p>
              ${openingError?.code !== 'client.preconditionMissing' ? html`
                <button type="button"
                  class="mt-4 min-h-11 rounded-lg border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-medium text-[var(--button-secondary-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
                  @click=${() => this.getAgentActivity()}>
                  ${this.msg.retry}
                </button>
              ` : ''}
            </div>
          ` : html`
            ${this.renderTimeline()}
          `}
        </section>
      </main>
    `;
  }

  private renderTimeline() {
    const items = this.executions?.items ?? [];
    const loading = this.pageStatus === 'loading' || this.getAgentActivityStatus === 'loading';
    const moreError = this.listAgentExecutionsError;

    return html`
      <groupviewdata--ml-timeline-view
        data-class="w-full"
        .loading=${loading}
        .hoverable=${true}>
        <Columns>
          <Column field="execution" header=${this.msg.timelineSummary}></Column>
          <Column field="details" header=${this.msg.timelineDetails}></Column>
        </Columns>
        <Rows>
          ${items.map((entry: ExecutionEntry) => html`
            <Row data-class="pb-4">
              <Cell data-class="min-w-0">
                <div class="space-y-1">
                  <p class="text-sm font-semibold text-[var(--text-strong,currentColor)]">${formatStartedAt(entry.startedAt)}</p>
                  ${entry.organizationUser ? html`
                    <p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.calledBy}: ${entry.organizationUser.details.identification.name}</p>
                  ` : ''}
                </div>
              </Cell>
              <Cell data-class="min-w-0">
                <div class="space-y-3 rounded-xl border border-[var(--border-subtle,currentColor)] bg-[var(--surface-bg,transparent)] p-3">
                  <dl class="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <div>
                      <dt class="text-xs text-[var(--text-muted,currentColor)]">${this.msg.duration}</dt>
                      <dd class="mt-0.5 font-medium text-[var(--text-default,currentColor)]">${formatDuration(entry.details.durationMs)}</dd>
                    </div>
                    ${entry.details.cost ? html`
                      <div>
                        <dt class="text-xs text-[var(--text-muted,currentColor)]">${this.msg.cost}</dt>
                        <dd class="mt-0.5 font-medium text-[var(--text-default,currentColor)]">${entry.details.cost}</dd>
                      </div>
                    ` : ''}
                  </dl>
                  <p class="text-xs font-medium ${entry.details.tookOver ? 'text-[var(--status-info-text,currentColor)]' : 'text-[var(--text-muted,currentColor)]'}">
                    ${entry.details.tookOver ? this.msg.personTookOver : this.msg.agentCompleted}
                  </p>
                  <groupexpandcontent--ml-accordion .multiple=${true}>
                    <Section title=${this.msg.actionsAndResults} data-class="border-t border-[var(--border-subtle,currentColor)] pt-2">
                      <div class="space-y-3 py-3">
                        ${entry.details.actions.length ? entry.details.actions.map((action: ExecutionAction) => html`
                          <div class="rounded-lg bg-[var(--surface-alt-bg,transparent)] p-3">
                            <div class="flex items-start justify-between gap-3">
                              <div class="min-w-0">
                                <p class="text-xs text-[var(--text-muted,currentColor)]">${this.msg.action}</p>
                                <p class="break-words text-sm font-medium text-[var(--text-strong,currentColor)]">${action.toolName}</p>
                              </div>
                              <span class="shrink-0 rounded-full px-2 py-1 text-xs font-medium ${actionTone(action)}">
                                ${action.result === 'succeeded' ? this.msg.resultSucceeded : action.result === 'failed' ? this.msg.resultFailed : this.msg.resultRefused}
                              </span>
                            </div>
                            ${action.resultNote ? html`<p class="mt-2 text-sm leading-5 text-[var(--text-default,currentColor)]">${action.resultNote}</p>` : ''}
                          </div>
                        `) : html`<p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.noActions}</p>`}
                        ${entry.details.conversationLink ? html`
                          <a class="inline-flex min-h-11 items-center text-sm font-medium text-[var(--link-text,currentColor)] underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" href=${entry.details.conversationLink} target="_blank" rel="noreferrer">
                            ${this.msg.openConversation}
                          </a>
                        ` : ''}
                      </div>
                    </Section>
                  </groupexpandcontent--ml-accordion>
                </div>
              </Cell>
            </Row>
          `)}
        </Rows>
        <Loading><div class="py-10 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingActivity}</div></Loading>
        <Empty><div class="py-10 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.noActivity}</div></Empty>
      </groupviewdata--ml-timeline-view>

      ${moreError ? html`
        <div class="mt-4 rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-4" aria-live="polite">
          <p class="text-sm text-[var(--text-default,currentColor)]">${errorMessage(moreError, this.msg.loadMoreFailed, this.msg.loadMoreFailed)}</p>
          <button type="button" class="mt-3 min-h-11 text-sm font-medium text-[var(--link-text,currentColor)] underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.listAgentExecutions((this.executions?.page ?? 0) + 1, true)}>${this.msg.retry}</button>
        </div>
      ` : ''}
      ${this.executions?.hasMore ? html`
        <button type="button"
          class="mt-4 min-h-11 w-full rounded-lg border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-medium text-[var(--button-secondary-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)] disabled:opacity-50"
          ?disabled=${this.listAgentExecutionsStatus === 'loading'}
          aria-busy=${this.listAgentExecutionsStatus === 'loading' ? 'true' : 'false'}
          @click=${() => this.listAgentExecutions(this.executions!.page + 1, true)}>
          ${this.listAgentExecutionsStatus === 'loading' ? this.msg.loadingOlder : this.msg.loadOlder}
        </button>
      ` : ''}
    `;
  }
}
