/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/my_conduct.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsMy_conductShared } from '/_102047_/l2/agents/web/shared/my_conduct.js';
import '/_102040_/l2/molecules/groupentertext/ml-multiline-text.js';
import '/_102040_/l2/molecules/groupexpandcontent/ml-single-expand-content.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-contextual-feedback.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
import '/_102040_/l2/molecules/groupviewcard/ml-vertical-card.js';
import '/_102020_/l2/molecules/ml-scenary.js';

/// **collab_i18n_start**
const pageMessage_en = {
  pageTitle: 'My conduct',
  currentConduct: 'Current conduct',
  changeConduct: 'Change my conduct',
  currentConductDescription: 'See how this agent behaves for you today.',
  changeConductDescription: 'Say what you would like to be different.',
  agentActsFor: 'Acts on behalf of',
  currentConductLabel: 'Current conduct',
  openAgentOverview: 'Open agent overview',
  historyOfMyChanges: 'History of my changes',
  when: 'When',
  who: 'Who',
  summary: 'Summary',
  noChangesYet: 'You have not made any changes yet.',
  loadMore: 'Load more',
  loadingHistory: 'Loading your changes…',
  historyCouldNotLoad: 'Your change history could not be loaded.',
  retry: 'Try again',
  whatDoYouWantToChange: 'What do you want to change?',
  changeHelper: 'Describe in plain words how you want this agent to behave for you. Only your own conduct will change.',
  changePlaceholder: 'For example, keep my updates shorter and focus on urgent items first.',
  sendChange: 'Send change',
  sendingChange: 'Sending change…',
  unsavedChanges: 'You have unsaved changes.',
  changeSentTitle: 'Your conduct was updated',
  changeSentMessage: 'Your request has been applied to your personal conduct.',
  changeCouldNotSendTitle: 'Your change could not be sent',
  changeCouldNotSend: 'Try sending your change again.',
  requiredChange: 'Enter what you want to change before sending.',
  chosenAgentMissing: 'Choose an agent to view your personal conduct.',
  conductCouldNotLoad: 'Your current conduct could not be loaded.',
  loadingConduct: 'Loading your current conduct…',
  selectSection: 'Select a section',
  backToSections: 'Back to sections',
  atSign: '@'
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = {
  'en': pageMessage_en
};
/// **collab_i18n_end**

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

@customElement('agents--web--mobile--page11--my_conduct-102047')
export class AgentsMobilePage11My_conductPage extends AgentsMy_conductShared {
  private msg: PageMessageType = pageMessage_en;

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] text-[var(--text-default,currentColor)]">
        <molecules--ml-scenary-102020
          mode="scenary"
          .value=${this.scenary || (this.agentId !== null ? 'conduct' : 'map')}
          .backLabel=${this.msg.backToSections}
          @change=${(e: CustomEvent<{ value: string }>) => {
            if (e.target === e.currentTarget) {
              this.setScenario(e.detail.value);
              if (e.detail.value === 'map') this.selectConductSummary(null);
            }
          }}
        >
          <Scene value="map" title=${this.msg.pageTitle}>
            ${this.renderMap()}
          </Scene>
          <Scene value="conduct" title=${this.msg.currentConduct} nav="back" backTo="map">
            ${this.renderConduct()}
          </Scene>
          <Scene value="change" title=${this.msg.changeConduct} nav="back" backTo="map">
            ${this.renderChange()}
          </Scene>
        </molecules--ml-scenary-102020>
      </main>
    `;
  }

  private renderMap() {
    return html`
      <nav class="px-4 py-5" aria-label=${this.msg.selectSection}>
        <ul class="overflow-hidden rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)]">
          <li>
            <button
              type="button"
              class="flex min-h-16 w-full items-center justify-between gap-4 border-b border-[var(--border-subtle,currentColor)] px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
              @click=${() => this.setScenario('conduct')}
            >
              <span>
                <span class="block font-semibold text-[var(--text-strong,currentColor)]">${this.msg.currentConduct}</span>
                <span class="mt-1 block text-sm text-[var(--text-muted,currentColor)]">${this.msg.currentConductDescription}</span>
              </span>
              <span aria-hidden="true" class="text-[var(--text-muted,currentColor)]">›</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              class="flex min-h-16 w-full items-center justify-between gap-4 px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
              @click=${() => this.setScenario('change')}
            >
              <span>
                <span class="flex items-center gap-2 font-semibold text-[var(--text-strong,currentColor)]">
                  ${this.msg.changeConduct}
                  ${this.sendConductChangeDraft.changeRequest !== null
                    ? html`<span aria-label=${this.msg.unsavedChanges} class="h-2 w-2 rounded-full bg-[var(--status-warning-bg,transparent)]"></span>`
                    : ''}
                </span>
                <span class="mt-1 block text-sm text-[var(--text-muted,currentColor)]">${this.msg.changeConductDescription}</span>
              </span>
              <span aria-hidden="true" class="text-[var(--text-muted,currentColor)]">›</span>
            </button>
          </li>
        </ul>
      </nav>
    `;
  }

  private renderConduct() {
    const conductError = this.getMyConductError;
    const preconditionMissing = conductError?.code === 'client.preconditionMissing';
    return html`
      <section data-organism-id="conductSummary" class="space-y-4 px-4 py-5" aria-busy=${this.getMyConductStatus === 'loading'}>
        ${this.getMyConductStatus === 'loading'
          ? html`<p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingConduct}</p>`
          : ''}
        ${preconditionMissing
          ? html`<p class="rounded-xl border border-[var(--status-warning-bg,transparent)] bg-[var(--surface-alt-bg,transparent)] px-4 py-3 text-sm">${this.msg.chosenAgentMissing}</p>`
          : ''}
        ${conductError !== null && !preconditionMissing
          ? html`
              <div class="rounded-xl border border-[var(--status-error-bg,transparent)] bg-[var(--surface-alt-bg,transparent)] p-4" aria-live="polite">
                <p class="text-sm">${conductError.message || this.msg.conductCouldNotLoad}</p>
                <button
                  type="button"
                  class="mt-3 min-h-11 text-sm font-semibold text-[var(--link-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
                  @click=${() => this.getMyConduct()}
                >${this.msg.retry}</button>
              </div>
            `
          : ''}
        ${this.conduct !== null
          ? html`
              <groupviewcard--ml-vertical-card data-class="w-full">
                <CardHeader>
                  <CardTitle data-class="text-[var(--text-strong,currentColor)]">${this.msg.atSign}${this.conduct.agent.name}</CardTitle>
                  ${this.conduct.agent.onBehalfOf
                    ? html`<CardDescription>${this.msg.agentActsFor} ${this.conduct.agent.onBehalfOf}</CardDescription>`
                    : ''}
                </CardHeader>
                <CardContent data-class="space-y-1">
                  <p class="text-sm font-medium text-[var(--text-muted,currentColor)]">${this.msg.currentConductLabel}</p>
                  <p>${this.conduct.summary}</p>
                </CardContent>
                <CardAction>
                  <button
                    type="button"
                    class="min-h-11 text-sm font-semibold text-[var(--link-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
                    @click=${() => this.openAgentOverview()}
                  >${this.msg.openAgentOverview}</button>
                </CardAction>
              </groupviewcard--ml-vertical-card>
              ${this.renderHistory()}
            `
          : ''}
      </section>
    `;
  }

  private renderHistory() {
    const historyError = this.listMyConductHistoryError;
    return html`
      <groupexpandcontent--ml-single-expand-content
        data-class="w-full"
        .loading=${this.listMyConductHistoryStatus === 'loading'}
        .expanded=${false}
      >
        <Section title=${this.msg.historyOfMyChanges}>
          ${historyError !== null
            ? html`
                <div class="py-3" aria-live="polite">
                  <p class="text-sm">${historyError.message || this.msg.historyCouldNotLoad}</p>
                  <button type="button" class="mt-2 min-h-11 text-sm font-semibold text-[var(--link-text,currentColor)]" @click=${() => this.listMyConductHistory(1, false)}>${this.msg.retry}</button>
                </div>
              `
            : this.history === null || this.history.items.length === 0
              ? html`<p class="py-3 text-sm text-[var(--text-muted,currentColor)]">${this.msg.noChangesYet}</p>`
              : html`
                  <ul class="divide-y divide-[var(--border-subtle,currentColor)] py-2">
                    ${this.history.items.map((entry) => html`
                      <li class="py-3">
                        <p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.when} ${formatDateTime(entry.changedAt)}</p>
                        <p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${this.msg.who} ${entry.changedBy}</p>
                        <p class="mt-2">${entry.summary}</p>
                      </li>
                    `)}
                  </ul>
                  ${this.history.hasMore
                    ? html`<button type="button" class="min-h-11 text-sm font-semibold text-[var(--link-text,currentColor)]" @click=${() => this.listMyConductHistory(this.history!.page + 1, true)}>${this.msg.loadMore}</button>`
                    : ''}
                `}
        </Section>
      </groupexpandcontent--ml-single-expand-content>
    `;
  }

  private renderChange() {
    const commandError = this.sendConductChangeError;
    const errorMessage = commandError?.message || (commandError?.code === 'client.requiredMissing' ? this.msg.requiredChange : this.msg.changeCouldNotSend);
    const canSend = this.sendConductChangeDraft.changeRequest !== null;
    return html`
      <section data-organism-id="conductChange" class="px-4 py-5" aria-busy=${this.sendConductChangeStatus === 'loading'}>
        <form class="space-y-4" @submit=${(e: SubmitEvent) => { e.preventDefault(); this.sendConductChange(); }}>
          <groupentertext--ml-multiline-text
            data-class="w-full"
            .value=${this.sendConductChangeDraft.changeRequest ?? ''}
            .name=${'changeRequest'}
            .placeholder=${this.msg.changePlaceholder}
            .rows=${4}
            .required=${true}
            .disabled=${this.sendConductChangeStatus === 'loading'}
            @input=${(e: CustomEvent<{ value: string }>) => this.setSendConductChangeDraft({ changeRequest: e.detail.value })}
          >
            <Label>${this.msg.whatDoYouWantToChange}</Label>
            <Helper>${this.msg.changeHelper}</Helper>
          </groupentertext--ml-multiline-text>
          ${this.sendConductChangeDraft.changeRequest !== null && this.sendConductChangeStatus !== 'success'
            ? html`<p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.unsavedChanges}</p>`
            : ''}
          <groupnotifyuser--ml-contextual-feedback
            .type=${this.sendConductChangeStatus === 'success' ? 'success' : 'error'}
            .visible=${this.sendConductChangeStatus === 'success' || this.sendConductChangeStatus === 'error'}
            .dismissible=${false}
          >
            <Title>${this.sendConductChangeStatus === 'success' ? this.msg.changeSentTitle : this.msg.changeCouldNotSendTitle}</Title>
            <Message>${this.sendConductChangeStatus === 'success' ? this.msg.changeSentMessage : errorMessage}</Message>
          </groupnotifyuser--ml-contextual-feedback>
          <grouptriggeraction--ml-button-standard
            data-class="w-full"
            data-variant="primary"
            type="submit"
            size="lg"
            .disabled=${!canSend}
            .loading=${this.sendConductChangeStatus === 'loading'}
          >
            <Label>${this.sendConductChangeStatus === 'loading' ? this.msg.sendingChange : this.msg.sendChange}</Label>
          </grouptriggeraction--ml-button-standard>
        </form>
      </section>
    `;
  }
}
