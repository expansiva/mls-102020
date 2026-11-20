/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/my_conduct.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import {
  AgentsMy_conductShared,
  type ErrorState,
} from '/_102047_/l2/agents/web/shared/my_conduct.js';
import '/_102040_/l2/molecules/groupentertext/ml-multiline-text.js';
import '/_102040_/l2/molecules/groupexpandcontent/ml-collapsible-panel.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-contextual-feedback.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
import '/_102040_/l2/molecules/groupviewcard/ml-vertical-card.js';
import '/_102020_/l2/molecules/ml-scenary.js';

/// **collab_i18n_start**
const pageMessage_en = {
  pageTitle: 'My conduct',
  pageDescription: 'Review how an agent acts for you, then describe what should change.',
  conductSection: 'Current conduct',
  changeSection: 'Change my conduct',
  sectionMap: 'Conduct sections',
  currentConduct: 'Current conduct',
  onBehalfOf: 'On whose behalf it acts',
  openAgentOverview: 'Open agent overview',
  history: 'History of my changes',
  when: 'When',
  who: 'Who',
  summary: 'Summary',
  noHistory: 'You have not made any changes yet.',
  loadMore: 'Load more changes',
  loadingHistory: 'Loading change history…',
  loadingConduct: 'Loading your conduct…',
  chooseAgentTitle: 'Choose an agent first',
  chooseAgentMessage: 'Open an agent that acts on your behalf to review or change your personal conduct.',
  agentsHome: 'Go to Agents',
  unableToLoadConduct: 'We could not load your conduct right now.',
  unableToLoadHistory: 'We could not load your change history right now.',
  whatToChange: 'What do you want to change',
  changeHelper: 'Describe in plain words how you want this agent to behave differently for you. Only your own conduct changes.',
  changePlaceholder: 'For example, keep status updates brief and ask before scheduling meetings.',
  sendChange: 'Send change request',
  sendingChange: 'Sending your change request…',
  unsavedChanges: 'Your request has not been sent yet.',
  changeAppliedTitle: 'Your conduct was updated',
  changeAppliedMessage: 'Your request has been applied to how this agent behaves for you.',
  changeNotSentTitle: 'Your request was not sent',
  changeRequired: 'What do you want to change is required.',
  unableToSendChange: 'We could not send your change request right now.',
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = {
  en: pageMessage_en,
};
/// **collab_i18n_end**

function errorMessage(error: ErrorState, requiredMessage: string, fallback: string) {
  if (error?.message) return error.message;
  if (error?.code === 'client.requiredMissing') return requiredMessage;
  return fallback;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

@customElement('agents--web--desktop--page11--my_conduct-102047')
export class AgentsDesktopPage11My_conductPage extends AgentsMy_conductShared {
  private msg: PageMessageType = pageMessage_en;

  renderSummary() {
    const conductError = errorMessage(
      this.getMyConductError,
      this.msg.unableToLoadConduct,
      this.msg.unableToLoadConduct,
    );
    const historyError = errorMessage(
      this.listMyConductHistoryError,
      this.msg.unableToLoadHistory,
      this.msg.unableToLoadHistory,
    );

    if (!this.agentId) {
      return html`
        <section data-organism-id="conductSummary" class="max-w-2xl rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-8">
          <h2 class="text-xl font-semibold text-[var(--text-strong,currentColor)]">${this.msg.chooseAgentTitle}</h2>
          <p class="mt-2 text-sm leading-6 text-[var(--text-muted,currentColor)]">${this.msg.chooseAgentMessage}</p>
          <a href="/agents" class="mt-6 inline-flex min-h-11 items-center text-sm font-medium text-[var(--link-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">
            ${this.msg.agentsHome}
          </a>
        </section>
      `;
    }

    return html`
      <section data-organism-id="conductSummary" class="max-w-3xl space-y-6">
        ${this.getMyConductStatus === 'error' ? html`
          <p aria-live="polite" class="rounded-lg border border-[var(--status-error-text,currentColor)] bg-[var(--status-error-bg,transparent)] p-4 text-sm text-[var(--status-error-text,currentColor)]">
            ${conductError}
          </p>
        ` : html``}

        <groupviewcard--ml-vertical-card
          data-class="w-full"
          .loading=${this.getMyConductStatus === 'loading'}>
          <CardHeader>
            <CardTitle>${this.conduct ? `@${this.conduct.agent.name}` : this.msg.loadingConduct}</CardTitle>
            ${this.conduct?.agent.onBehalfOf ? html`
              <CardDescription>${this.msg.onBehalfOf}: ${this.conduct.agent.onBehalfOf}</CardDescription>
            ` : html``}
          </CardHeader>
          ${this.conduct ? html`
            <CardContent data-class="space-y-2">
              <p class="text-sm font-medium text-[var(--text-strong,currentColor)]">${this.msg.currentConduct}</p>
              <p class="text-sm leading-6 text-[var(--text-default,currentColor)]">${this.conduct.summary}</p>
            </CardContent>
            <CardAction data-class="pt-4">
              <button
                type="button"
                @click=${() => this.openAgentOverview()}
                class="min-h-11 text-sm font-medium text-[var(--link-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">
                ${this.msg.openAgentOverview}
              </button>
            </CardAction>
          ` : html``}
        </groupviewcard--ml-vertical-card>

        <div class="border-t border-[var(--border-subtle,currentColor)] pt-6">
          ${this.listMyConductHistoryStatus === 'error' ? html`
            <p aria-live="polite" class="mb-4 rounded-lg border border-[var(--status-error-text,currentColor)] bg-[var(--status-error-bg,transparent)] p-4 text-sm text-[var(--status-error-text,currentColor)]">
              ${historyError}
            </p>
          ` : html``}
          <groupexpandcontent--ml-collapsible-panel
            data-class="w-full"
            .multiple=${true}
            .loading=${this.listMyConductHistoryStatus === 'loading' && this.history === null}>
            <Label data-class="text-base font-semibold">${this.msg.history}</Label>
            ${this.history?.items.map((entry) => html`
              <Section title="${formatDateTime(entry.changedAt)} — ${entry.summary}">
                <dl class="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 py-2 text-sm">
                  <dt class="text-[var(--text-muted,currentColor)]">${this.msg.when}</dt>
                  <dd class="text-[var(--text-default,currentColor)]">${formatDateTime(entry.changedAt)}</dd>
                  <dt class="text-[var(--text-muted,currentColor)]">${this.msg.who}</dt>
                  <dd class="text-[var(--text-default,currentColor)]">${entry.changedBy}</dd>
                  <dt class="text-[var(--text-muted,currentColor)]">${this.msg.summary}</dt>
                  <dd class="text-[var(--text-default,currentColor)]">${entry.summary}</dd>
                </dl>
              </Section>
            `)}
          </groupexpandcontent--ml-collapsible-panel>
          ${this.history && this.history.items.length === 0 ? html`
            <p class="mt-3 text-sm text-[var(--text-muted,currentColor)]">${this.msg.noHistory}</p>
          ` : html``}
          ${this.history?.hasMore ? html`
            <button
              type="button"
              ?disabled=${this.listMyConductHistoryStatus === 'loading'}
              @click=${() => this.listMyConductHistory(this.history!.page + 1, true)}
              class="mt-4 min-h-11 rounded-md border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-medium text-[var(--button-secondary-text,currentColor)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">
              ${this.listMyConductHistoryStatus === 'loading' ? this.msg.loadingHistory : this.msg.loadMore}
            </button>
          ` : html``}
        </div>
      </section>
    `;
  }

  renderChange() {
    const sendError = errorMessage(
      this.sendConductChangeError,
      this.msg.changeRequired,
      this.msg.unableToSendChange,
    );
    const isSending = this.sendConductChangeStatus === 'loading';
    const isSuccess = this.sendConductChangeStatus === 'success';
    const isError = this.sendConductChangeStatus === 'error';

    return html`
      <section data-organism-id="conductChange" class="max-w-3xl">
        <form
          @submit=${(event: SubmitEvent) => {
            event.preventDefault();
            this.sendConductChange().then(() => this.listMyConductHistory(1, false));
          }}
          class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-6">
          <groupentertext--ml-multiline-text
            data-class="w-full"
            name="changeRequest"
            .value=${this.sendConductChangeDraft.changeRequest ?? ''}
            .error=${isError ? sendError : ''}
            .placeholder=${this.msg.changePlaceholder}
            .rows=${6}
            .required=${true}
            .disabled=${isSending}
            .loading=${isSending}
            @input=${(event: CustomEvent<{ value: string }>) => this.setSendConductChangeDraft({ changeRequest: event.detail.value })}>
            <Label>${this.msg.whatToChange}</Label>
            <Helper>${this.msg.changeHelper}</Helper>
          </groupentertext--ml-multiline-text>

          <div class="mt-5 flex items-center justify-between gap-4 border-t border-[var(--border-subtle,currentColor)] pt-5">
            <p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.unsavedChanges}</p>
            <grouptriggeraction--ml-button-standard
              data-variant="primary"
              size="md"
              type="submit"
              .disabled=${!this.sendConductChangeDraft.changeRequest || isSending}
              .loading=${isSending}
              @action=${() => this.sendConductChange().then(() => this.listMyConductHistory(1, false))}>
              <Label>${isSending ? this.msg.sendingChange : this.msg.sendChange}</Label>
            </grouptriggeraction--ml-button-standard>
          </div>

          <groupnotifyuser--ml-contextual-feedback
            data-class="mt-5 w-full"
            .type=${isSuccess ? 'success' : 'error'}
            .visible=${isSuccess || isError}
            .dismissible=${false}
            .duration=${isSuccess ? 5000 : 0}>
            <Title>${isSuccess ? this.msg.changeAppliedTitle : this.msg.changeNotSentTitle}</Title>
            <Message>${isSuccess ? this.msg.changeAppliedMessage : sendError}</Message>
          </groupnotifyuser--ml-contextual-feedback>
        </form>
      </section>
    `;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] px-8 py-8 text-[var(--text-default,currentColor)]">
        <header class="mx-auto mb-8 max-w-7xl">
          <h1 class="text-2xl font-semibold tracking-tight text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
          <p class="mt-2 text-sm text-[var(--text-muted,currentColor)]">${this.msg.pageDescription}</p>
        </header>

        <div class="mx-auto grid max-w-7xl grid-cols-[15rem_minmax(0,1fr)] gap-10">
          <aside aria-label="${this.msg.sectionMap}" class="self-start border-r border-[var(--border-subtle,currentColor)] pr-5">
            <nav class="space-y-1">
              <button
                type="button"
                @click=${() => this.setScenario('summary')}
                class="flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm font-medium text-[var(--nav-text,currentColor)] hover:bg-[var(--nav-active-bg,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">
                ${this.msg.conductSection}
              </button>
              <button
                type="button"
                @click=${() => this.setScenario('change')}
                class="flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm font-medium text-[var(--nav-text,currentColor)] hover:bg-[var(--nav-active-bg,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">
                ${this.msg.changeSection}
              </button>
            </nav>
          </aside>

          <molecules--ml-scenary-102020
            mode="scenary"
            .value=${this.scenary || 'summary'}
            @change=${(event: CustomEvent<{ value: string }>) => {
              if (event.target === event.currentTarget) this.setScenario(event.detail.value);
            }}>
            <Scene value="summary" title="${this.msg.conductSection}">
              ${this.renderSummary()}
            </Scene>
            <Scene value="change" title="${this.msg.changeSection}">
              ${this.renderChange()}
            </Scene>
          </molecules--ml-scenary-102020>
        </div>
      </main>
    `;
  }
}
