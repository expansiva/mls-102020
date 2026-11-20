/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/agent_behavior.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsAgent_behaviorShared } from '/_102047_/l2/agents/web/shared/agent_behavior.js';
import type { BehaviorChange, ErrorState } from '/_102047_/l2/agents/web/shared/agent_behavior.js';
import '/_102040_/l2/molecules/groupentertext/ml-multiline-text.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-contextual-feedback.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
import '/_102040_/l2/molecules/groupviewcard/ml-vertical-card.js';
import '/_102040_/l2/molecules/groupviewdata/ml-timeline-view.js';

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function errorText(error: ErrorState, fallback: string, required: string, precondition: string) {
  if (!error) return '';
  if (error.message) return error.message;
  if (error.code === 'client.requiredMissing') return required;
  if (error.code === 'client.preconditionMissing') return precondition;
  return fallback;
}

@customElement('agents--web--desktop--page11--agent_behavior-102047')
export class AgentsDesktopPage11Agent_behaviorPage extends AgentsAgent_behaviorShared {
  private msg: PageMessageType = pageMessage_en;

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const behaviorError = errorText(
      this.getAgentBehaviorError,
      this.msg.behaviorLoadFailed,
      this.msg.behaviorRequired,
      this.msg.agentMissing,
    );
    const historyError = errorText(
      this.listBehaviorChangesError,
      this.msg.historyLoadFailed,
      this.msg.historyRequired,
      this.msg.agentMissing,
    );

    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] px-8 py-8 text-[var(--text-default,currentColor)]">
        <div class="mx-auto max-w-7xl">
          <header class="mb-8 flex items-end justify-between border-b border-[var(--border-subtle,currentColor)] pb-5">
            <div>
              <p class="mb-2 text-sm font-medium text-[var(--text-muted,currentColor)]">${this.msg.agentWorkspace}</p>
              <h1 class="text-3xl font-semibold tracking-tight text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
            </div>
            ${this.behavior ? html`<p class="text-sm text-[var(--text-muted,currentColor)]">@${this.behavior.agent.agent.name}</p>` : ''}
          </header>

          <div class="grid grid-cols-12 gap-8">
            <section class="col-span-8 space-y-7" aria-label=${this.msg.currentBehaviorRegion}>
              ${this.renderCurrentBehavior(behaviorError)}
              ${this.renderRequest()}
            </section>
            <aside class="col-span-4" aria-label=${this.msg.historyRegion}>
              ${this.renderHistory(historyError)}
            </aside>
          </div>
        </div>
      </main>
    `;
  }

  private renderCurrentBehavior(behaviorError: string) {
    return html`
      <section data-organism-id="currentBehavior">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted,currentColor)]">${this.msg.today}</h2>
          ${this.getAgentBehaviorStatus === 'loading' ? html`<span class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingBehavior}</span>` : ''}
        </div>
        <groupnotifyuser--ml-contextual-feedback
          type="error"
          .visible=${Boolean(behaviorError)}
          .dismissible=${false}>
          <Title>${this.msg.behaviorUnavailable}</Title>
          <Message>${behaviorError}</Message>
        </groupnotifyuser--ml-contextual-feedback>
        <groupviewcard--ml-vertical-card
          data-class="w-full"
          .loading=${this.getAgentBehaviorStatus === 'loading'}>
          ${this.behavior ? html`
            <CardHeader>
              <CardTitle data-class="text-xl font-semibold text-[var(--text-strong,currentColor)]">${this.behavior.summary}</CardTitle>
              <CardDescription data-class="mt-1 text-sm text-[var(--text-muted,currentColor)]">@${this.behavior.agent.agent.name}</CardDescription>
            </CardHeader>
            <CardContent data-class="pt-5">
              <p class="whitespace-pre-wrap text-base leading-7 text-[var(--text-default,currentColor)]">${this.behavior.currentBehavior}</p>
            </CardContent>
          ` : html`
            <CardContent>
              <p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.noBehavior}</p>
            </CardContent>
          `}
        </groupviewcard--ml-vertical-card>
      </section>
    `;
  }

  private renderRequest() {
    const draft = this.requestBehaviorChangeDraft;
    const selectedChange = this.behaviorChangeRequest;
    const isUndo = draft.undoChangeRef !== null;
    const isReady = Boolean(draft.changeRequest || draft.undoChangeRef);
    const commandError = errorText(
      this.requestBehaviorChangeError,
      this.msg.requestFailed,
      this.msg.requestRequired,
      this.msg.agentMissing,
    );

    return html`
      <section data-organism-id="behaviorChangeRequest" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-6 shadow-sm">
        <div class="mb-5">
          <h2 class="text-lg font-semibold text-[var(--text-strong,currentColor)]">${this.msg.requestHeading}</h2>
          <p class="mt-1 text-sm leading-6 text-[var(--text-muted,currentColor)]">${this.msg.requestDescription}</p>
        </div>

        ${isUndo && selectedChange ? html`
          <div class="mb-5 rounded-lg border border-[var(--status-warning-bg,currentColor)] bg-[var(--surface-alt-bg,transparent)] px-4 py-3">
            <p class="text-sm font-medium text-[var(--text-strong,currentColor)]">${this.msg.undoSelected}</p>
            <p class="mt-1 text-sm text-[var(--text-default,currentColor)]">${selectedChange.summary}</p>
            <button
              type="button"
              class="mt-3 min-h-11 text-sm font-medium text-[var(--link-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
              @click=${() => this.setRequestBehaviorChangeDraft({ ...draft, undoChangeRef: null })}>
              ${this.msg.chooseDifferentChange}
            </button>
          </div>
        ` : ''}

        <groupentertext--ml-multiline-text
          data-class="w-full"
          .value=${draft.changeRequest ?? ''}
          .error=${''}
          .name=${this.msg.changeFieldName}
          .placeholder=${this.msg.changePlaceholder}
          .rows=${6}
          .required=${!isUndo}
          .disabled=${isUndo || this.requestBehaviorChangeStatus === 'loading'}
          .loading=${this.requestBehaviorChangeStatus === 'loading'}
          @input=${(e: CustomEvent<{ value: string }>) => this.setRequestBehaviorChangeDraft({ ...draft, changeRequest: e.detail.value || null })}>
          <Label>${this.msg.changeLabel}</Label>
          <Helper>${isUndo ? this.msg.undoHelper : this.msg.changeHelper}</Helper>
        </groupentertext--ml-multiline-text>

        <div class="mt-5 flex items-center justify-between gap-4 border-t border-[var(--border-subtle,currentColor)] pt-5">
          <p class="max-w-md text-sm text-[var(--text-muted,currentColor)]">${isUndo ? this.msg.undoNote : this.msg.changeNote}</p>
          <grouptriggeraction--ml-button-standard
            data-variant="primary"
            size="md"
            type="button"
            .disabled=${!isReady || this.requestBehaviorChangeStatus === 'loading'}
            .loading=${this.requestBehaviorChangeStatus === 'loading'}
            @action=${() => this.requestBehaviorChange()}>
            <Label>${isUndo ? this.msg.confirmUndo : this.msg.sendRequest}</Label>
          </grouptriggeraction--ml-button-standard>
        </div>

        <groupnotifyuser--ml-contextual-feedback
          data-class="mt-4"
          type="success"
          .visible=${this.requestBehaviorChangeStatus === 'success'}
          .dismissible=${false}>
          <Title>${this.msg.requestComplete}</Title>
          <Message>${this.msg.requestSuccess}</Message>
        </groupnotifyuser--ml-contextual-feedback>
        <groupnotifyuser--ml-contextual-feedback
          data-class="mt-4"
          type="error"
          .visible=${Boolean(commandError)}
          .dismissible=${false}>
          <Title>${this.msg.requestCouldNotComplete}</Title>
          <Message>${commandError}</Message>
        </groupnotifyuser--ml-contextual-feedback>
      </section>
    `;
  }

  private renderHistory(historyError: string) {
    const rows = this.changes.items;
    return html`
      <section data-organism-id="behaviorHistory" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-5 shadow-sm">
        <div class="mb-4">
          <h2 class="text-lg font-semibold text-[var(--text-strong,currentColor)]">${this.msg.historyHeading}</h2>
          <p class="mt-1 text-sm leading-6 text-[var(--text-muted,currentColor)]">${this.msg.historyDescription}</p>
        </div>
        <groupnotifyuser--ml-contextual-feedback
          data-class="mb-4"
          type="error"
          .visible=${Boolean(historyError)}
          .dismissible=${false}>
          <Title>${this.msg.historyUnavailable}</Title>
          <Message>${historyError}</Message>
        </groupnotifyuser--ml-contextual-feedback>
        <groupviewdata--ml-timeline-view
          data-class="w-full"
          .loading=${this.listBehaviorChangesStatus === 'loading'}
          .hoverable=${true}
          @row-click=${(e: CustomEvent<{ index: number; data: Element }>) => {
            const change: BehaviorChange | undefined = rows[e.detail.index];
            if (change && !change.undone) this.selectAgentBehavior(change.changeRef);
          }}>
          <Columns>
            <Column field="change" header=${this.msg.changeColumn}></Column>
            <Column field="when" header=${this.msg.whenColumn}></Column>
          </Columns>
          <Rows>
            ${rows.map((change: BehaviorChange) => html`
              <Row ?selected=${change.changeRef === this.selectedAgentBehavior} ?disabled=${Boolean(change.undone)}>
                <Cell>
                  <p class="font-medium text-[var(--text-strong,currentColor)]">${change.summary}</p>
                  <p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${change.changedBy}</p>
                  ${change.undone ? html`<span class="mt-2 inline-flex rounded-full bg-[var(--status-neutral-bg,transparent)] px-2 py-1 text-xs font-medium text-[var(--status-neutral-text,currentColor)]">${this.msg.undone}</span>` : html`
                    <grouptriggeraction--ml-button-standard
                      data-class="mt-3"
                      data-variant="secondary"
                      size="sm"
                      type="button"
                      .disabled=${this.requestBehaviorChangeStatus === 'loading'}
                      @action=${() => this.selectAgentBehavior(change.changeRef)}>
                      <Label>${this.msg.undoChange}</Label>
                    </grouptriggeraction--ml-button-standard>
                  `}
                </Cell>
                <Cell><span class="text-sm text-[var(--text-muted,currentColor)]">${formatDateTime(change.changedAt)}</span></Cell>
              </Row>
            `)}
          </Rows>
          <Loading><p class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingHistory}</p></Loading>
          <Empty><p class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.noHistory}</p></Empty>
        </groupviewdata--ml-timeline-view>
        ${this.changes.hasMore ? html`
          <div class="mt-5 border-t border-[var(--border-subtle,currentColor)] pt-4">
            <grouptriggeraction--ml-button-standard
              data-variant="secondary"
              size="sm"
              type="button"
              .disabled=${this.listBehaviorChangesStatus === 'loading'}
              .loading=${this.listBehaviorChangesStatus === 'loading'}
              @action=${() => this.listBehaviorChanges(undefined, true)}>
              <Label>${this.msg.loadMore}</Label>
            </grouptriggeraction--ml-button-standard>
          </div>
        ` : ''}
      </section>
    `;
  }
}

/// **collab_i18n_start**
const pageMessage_en = {
  agentWorkspace: 'Agents',
  pageTitle: 'Agent behavior',
  currentBehaviorRegion: 'Current behavior',
  historyRegion: 'Change history',
  today: 'Today',
  loadingBehavior: 'Loading current behavior',
  behaviorUnavailable: 'Current behavior is unavailable',
  behaviorLoadFailed: 'We could not load the current behavior.',
  behaviorRequired: 'The current behavior needs the selected agent.',
  agentMissing: 'Choose an agent from Agents, then return here.',
  noBehavior: 'No current behavior is available for this agent.',
  requestHeading: 'Request a change',
  requestDescription: 'Describe how this agent should behave differently. The current behavior above will update after the request is applied.',
  undoSelected: 'Ready to undo this change',
  chooseDifferentChange: 'Choose a different change',
  changeFieldName: 'behavior change request',
  changeLabel: 'What do you want to change?',
  changePlaceholder: 'Describe the behavior you want in plain language.',
  changeHelper: 'Be specific about what should change and when it should apply.',
  undoHelper: 'This request will restore the behavior from before the selected change.',
  changeNote: 'Review the current behavior above before sending your request.',
  undoNote: 'Confirming restores the behavior that existed before this change.',
  sendRequest: 'Request behavior change',
  confirmUndo: 'Confirm undo',
  requestComplete: 'Behavior updated',
  requestSuccess: 'The current behavior has been refreshed with the applied change.',
  requestCouldNotComplete: 'The request could not be completed',
  requestFailed: 'We could not update the agent behavior. Try again.',
  requestRequired: 'Describe what you want to change, or select a change to undo.',
  historyHeading: 'Change history',
  historyDescription: 'Newest first. Select a change to prepare its undo.',
  historyUnavailable: 'Change history is unavailable',
  historyLoadFailed: 'We could not load the change history.',
  historyRequired: 'The change history needs the selected agent.',
  changeColumn: 'Change',
  whenColumn: 'When',
  undone: 'Undone',
  undoChange: 'Undo change',
  loadingHistory: 'Loading change history',
  noHistory: 'No behavior changes have been recorded yet.',
  loadMore: 'Load more changes',
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = {
  'en': pageMessage_en,
};
/// **collab_i18n_end**
