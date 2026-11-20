/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/agent_behavior.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsAgent_behaviorShared } from '/_102047_/l2/agents/web/shared/agent_behavior.js';
import type { ErrorState } from '/_102047_/l2/agents/web/shared/agent_behavior.js';
import '/_102040_/l2/molecules/groupentertext/ml-multiline-text.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-contextual-feedback.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-icon-button.js';
import '/_102040_/l2/molecules/groupviewcard/ml-vertical-card.js';
import '/_102040_/l2/molecules/groupviewdata/ml-timeline-view.js';

const formatDateTime = (value: string) => new Intl.DateTimeFormat(
  document.documentElement.lang || undefined,
  { dateStyle: 'medium', timeStyle: 'short' },
).format(new Date(value));

const errorText = (error: ErrorState, fallback: string, required: string) => {
  if (!error) return '';
  if (error.message) return error.message;
  if (error.code === 'client.requiredMissing') return required;
  return fallback;
};

/// **collab_i18n_start**
const pageMessage_en = {
  pageTitle: 'Agent behavior',
  currentBehavior: 'Current behavior',
  behaviorUnavailable: 'Current behavior could not be loaded.',
  missingAgent: 'Choose an agent before opening its behavior.',
  retry: 'Try again',
  loadingBehavior: 'Loading current behavior…',
  behaviorSummary: 'Summary',
  behaviorDetails: 'Current behavior',
  requestChange: 'Request a change',
  requestPrompt: 'Describe how the agent should behave differently.',
  requestHelper: 'Use plain language. The change is sent to the agent’s cm for review and update.',
  requestPlaceholder: 'For example, ask follow-up questions before suggesting a solution.',
  requestRequired: 'What do you want to change is required.',
  sendChange: 'Request behavior change',
  sendingChange: 'Requesting behavior change…',
  changeRequested: 'Behavior change requested',
  changeRequestedMessage: 'The agent’s current behavior has been updated.',
  requestFailed: 'The behavior change could not be requested.',
  undoConfirmation: 'Confirm undo',
  undoExplanation: 'This restores the behavior that was in place before the selected change.',
  confirmUndo: 'Undo this change',
  undoSelected: 'Selected change',
  history: 'Change history',
  historyDescription: 'Newest changes first.',
  who: 'Who',
  when: 'When',
  changeSummary: 'Summary',
  actions: 'Actions',
  undo: 'Undo',
  undone: 'Undone',
  loadingHistory: 'Loading change history…',
  historyUnavailable: 'Change history could not be loaded.',
  noChanges: 'No behavior changes yet.',
  loadMore: 'Load more changes',
  loadingMore: 'Loading more changes…',
  loadMoreFailed: 'More changes could not be loaded.',
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = { 'en': pageMessage_en };
/// **collab_i18n_end**

@customElement('agents--web--mobile--page11--agent_behavior-102047')
export class AgentsMobilePage11Agent_behaviorPage extends AgentsAgent_behaviorShared {
  private msg: PageMessageType = pageMessage_en;

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const draft = this.requestBehaviorChangeDraft;
    const isUndo = draft.undoChangeRef !== null;
    const isRequestLoading = this.requestBehaviorChangeStatus === 'loading';
    const canSubmit = isUndo || Boolean(draft.changeRequest?.trim());
    const requestError = errorText(
      this.requestBehaviorChangeError,
      this.msg.requestFailed,
      this.msg.requestRequired,
    );
    const behaviorError = errorText(
      this.getAgentBehaviorError,
      this.msg.behaviorUnavailable,
      this.msg.behaviorUnavailable,
    );
    const historyError = errorText(
      this.listBehaviorChangesError,
      this.msg.historyUnavailable,
      this.msg.historyUnavailable,
    );

    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] px-4 py-5 text-[var(--text-default,currentColor)]">
        <div class="mx-auto flex w-full max-w-md flex-col gap-6">
          <header class="space-y-1">
            <h1 class="text-xl font-semibold tracking-tight text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
            ${this.behavior ? html`
              <p class="text-sm text-[var(--text-muted,currentColor)]">@${this.behavior.agent.agent.name}</p>
            ` : ''}
          </header>

          <section data-organism-id="currentBehavior" aria-labelledby="current-behavior-heading" class="space-y-3">
            <h2 id="current-behavior-heading" class="text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.currentBehavior}</h2>
            ${behaviorError ? html`
              <groupnotifyuser--ml-contextual-feedback .type=${'error'} .visible=${true} .dismissible=${false}>
                <Title>${this.getAgentBehaviorError?.code === 'client.preconditionMissing' ? this.msg.missingAgent : this.msg.behaviorUnavailable}</Title>
                <Message>${behaviorError}</Message>
                <Action>
                  <button type="button" class="min-h-11 text-sm font-medium text-[var(--link-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.getAgentBehavior()}>${this.msg.retry}</button>
                </Action>
              </groupnotifyuser--ml-contextual-feedback>
            ` : ''}
            <groupviewcard--ml-vertical-card
              data-class="w-full"
              .loading=${this.getAgentBehaviorStatus === 'loading'}>
              <CardHeader>
                <CardTitle>${this.behavior?.summary ?? this.msg.loadingBehavior}</CardTitle>
                <CardDescription>${this.msg.behaviorSummary}</CardDescription>
              </CardHeader>
              ${this.behavior ? html`
                <CardContent data-class="whitespace-pre-wrap leading-6 text-[var(--text-default,currentColor)]">
                  ${this.behavior.currentBehavior}
                </CardContent>
              ` : ''}
            </groupviewcard--ml-vertical-card>
          </section>

          <section data-organism-id="behaviorChangeRequest" aria-labelledby="request-change-heading" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-4 shadow-sm">
            <div class="space-y-1">
              <h2 id="request-change-heading" class="text-base font-semibold text-[var(--text-strong,currentColor)]">${isUndo ? this.msg.undoConfirmation : this.msg.requestChange}</h2>
              ${isUndo ? html`<p class="text-sm leading-5 text-[var(--text-muted,currentColor)]">${this.msg.undoExplanation}</p>` : ''}
            </div>
            <div class="mt-4 space-y-3">
              ${isUndo ? html`
                <div class="rounded-lg border border-[var(--selected-border,currentColor)] bg-[var(--selected-bg,transparent)] px-3 py-3">
                  <p class="text-xs font-medium text-[var(--selected-text,currentColor)]">${this.msg.undoSelected}</p>
                  <p class="mt-1 text-sm text-[var(--text-strong,currentColor)]">${this.behaviorChangeRequest?.summary ?? ''}</p>
                </div>
              ` : html`
                <groupentertext--ml-multiline-text
                  data-class="w-full"
                  .value=${draft.changeRequest ?? ''}
                  .name=${this.msg.requestPrompt}
                  .placeholder=${this.msg.requestPlaceholder}
                  .rows=${5}
                  .required=${true}
                  .disabled=${isRequestLoading}
                  .loading=${isRequestLoading}
                  .error=${requestError}
                  @input=${(e: CustomEvent<{ value: string }>) => this.setRequestBehaviorChangeDraft({
                    ...this.requestBehaviorChangeDraft,
                    changeRequest: e.detail.value || null,
                    undoChangeRef: null,
                  })}>
                  <Label>${this.msg.requestPrompt}</Label>
                  <Helper>${this.msg.requestHelper}</Helper>
                </groupentertext--ml-multiline-text>
              `}
              ${isUndo && requestError ? html`
                <groupnotifyuser--ml-contextual-feedback .type=${'error'} .visible=${true} .dismissible=${false}>
                  <Message>${requestError}</Message>
                </groupnotifyuser--ml-contextual-feedback>
              ` : ''}
              ${this.requestBehaviorChangeStatus === 'success' ? html`
                <groupnotifyuser--ml-contextual-feedback .type=${'success'} .visible=${true} .dismissible=${false}>
                  <Title>${this.msg.changeRequested}</Title>
                  <Message>${this.msg.changeRequestedMessage}</Message>
                </groupnotifyuser--ml-contextual-feedback>
              ` : ''}
              <grouptriggeraction--ml-button-standard
                data-class="w-full"
                data-variant=${isUndo ? 'danger' : 'primary'}
                size="lg"
                type="button"
                .disabled=${!canSubmit}
                .loading=${isRequestLoading}
                @action=${() => this.requestBehaviorChange()}>
                <Label>${isRequestLoading ? this.msg.sendingChange : (isUndo ? this.msg.confirmUndo : this.msg.sendChange)}</Label>
              </grouptriggeraction--ml-button-standard>
            </div>
          </section>

          <section data-organism-id="behaviorHistory" aria-labelledby="history-heading" class="space-y-3 pb-4">
            <div class="space-y-1">
              <h2 id="history-heading" class="text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.history}</h2>
              <p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.historyDescription}</p>
            </div>
            ${historyError ? html`
              <groupnotifyuser--ml-contextual-feedback .type=${'error'} .visible=${true} .dismissible=${false}>
                <Message>${historyError}</Message>
              </groupnotifyuser--ml-contextual-feedback>
            ` : ''}
            <groupviewdata--ml-timeline-view
              data-class="w-full"
              .loading=${this.listBehaviorChangesStatus === 'loading' && this.changes.items.length === 0}
              .hoverable=${true}
              @row-click=${(e: CustomEvent<{ index: number }>) => {
                const change = this.changes.items[e.detail.index];
                if (change) this.selectAgentBehavior(change.changeRef);
              }}>
              <Columns>
                <Column field="summary" header=${this.msg.changeSummary}></Column>
                <Column field="details" header=${this.msg.when}></Column>
                <Column field="actions" header=${this.msg.actions}></Column>
              </Columns>
              <Rows>
                ${this.changes.items.map((change) => html`
                  <Row ?selected=${change.changeRef === this.selectedAgentBehavior}>
                    <Cell>
                      <p class="font-medium text-[var(--text-strong,currentColor)]">${change.summary}</p>
                      ${change.undone ? html`<span class="mt-1 inline-flex rounded-full bg-[var(--status-neutral-bg,transparent)] px-2 py-0.5 text-xs font-medium text-[var(--status-neutral-text,currentColor)]">${this.msg.undone}</span>` : ''}
                    </Cell>
                    <Cell>
                      <p class="text-sm text-[var(--text-muted,currentColor)]">${change.changedBy}</p>
                      <p class="text-xs text-[var(--text-muted,currentColor)]">${formatDateTime(change.changedAt)}</p>
                    </Cell>
                    <Cell>
                      <grouptriggeraction--ml-icon-button
                        aria-label=${this.msg.undo}
                        data-variant="secondary"
                        size="md"
                        type="button"
                        @action=${() => this.selectAgentBehavior(change.changeRef)}>
                        <Icon aria-hidden="true">↶</Icon>
                        <Label>${this.msg.undo}</Label>
                      </grouptriggeraction--ml-icon-button>
                    </Cell>
                  </Row>
                `)}
              </Rows>
              <Loading><p class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingHistory}</p></Loading>
              <Empty><p class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.noChanges}</p></Empty>
            </groupviewdata--ml-timeline-view>
            ${this.changes.hasMore ? html`
              <grouptriggeraction--ml-button-standard
                data-class="w-full"
                data-variant="secondary"
                size="lg"
                type="button"
                .loading=${this.listBehaviorChangesStatus === 'loading' && this.changes.items.length > 0}
                @action=${() => this.listBehaviorChanges(this.changes.page + 1, true)}>
                <Label>${this.listBehaviorChangesStatus === 'loading' ? this.msg.loadingMore : this.msg.loadMore}</Label>
              </grouptriggeraction--ml-button-standard>
            ` : ''}
          </section>
        </div>
      </main>
    `;
  }
}
