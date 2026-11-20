/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/agent_overview.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsAgent_overviewShared } from '/_102047_/l2/agents/web/shared/agent_overview.js';

/// **collab_i18n_start**
const pageMessage_en = {
  pageTitle: 'Agent overview',
  statusLabel: 'Availability',
  statusOn: 'On',
  statusOff: 'Off',
  whatLabel: 'What the agent is',
  talksToLabel: 'Who it talks to',
  onBehalfOfLabel: 'On whose behalf it acts',
  responsibleLabel: 'Responsible person',
  activityLink: 'See activity',
  loadingStatus: 'Loading agent overview',
  loadingLabel: 'Loading availability',
  emptyTitle: 'No agent overview',
  emptyBody: 'There is no agent overview to show.',
  errorTitle: 'Couldn’t load agent overview',
  errorFallback: 'Try again to load the agent overview.',
  missingSelection: 'Choose an agent from the Agents list to see its overview.',
  retry: 'Retry'
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = {
  'en': pageMessage_en
};
/// **collab_i18n_end**

@customElement('agents--web--mobile--page11--agent_overview-102047')
export class AgentsMobilePage11Agent_overviewPage extends AgentsAgent_overviewShared {
  private msg: PageMessageType = pageMessage_en;

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];

    const isLoading = this.pageStatus === 'loading' || this.getAgentOverviewStatus === 'loading';
    const error = this.getAgentOverviewError;
    const errorMessage = error?.message || this.msg.errorFallback;

    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] px-4 py-6 text-[var(--text-default,currentColor)] sm:px-5">
        <div class="mx-auto w-full max-w-[430px]">
          <header class="mb-6">
            <h1 class="text-lg font-semibold tracking-tight text-[var(--text-strong,currentColor)]">
              ${this.msg.pageTitle}
            </h1>
          </header>

          <section data-organism-id="agentOverviewDetail" aria-busy=${isLoading ? 'true' : 'false'}>
            ${isLoading ? html`
              <div class="rounded-2xl border border-[var(--border-subtle,currentColor)] bg-[var(--surface-bg,transparent)] p-5" role="status" aria-label=${this.msg.loadingStatus}>
                <div class="h-3 w-24 animate-pulse rounded bg-[var(--surface-alt-bg,transparent)]"></div>
                <div class="mt-3 h-12 w-28 animate-pulse rounded bg-[var(--surface-alt-bg,transparent)]"></div>
                <div class="mt-4 h-5 w-40 animate-pulse rounded bg-[var(--surface-alt-bg,transparent)]"></div>
                <div class="mt-7 space-y-4">
                  <div class="h-16 animate-pulse rounded-xl bg-[var(--surface-alt-bg,transparent)]"></div>
                  <div class="h-16 animate-pulse rounded-xl bg-[var(--surface-alt-bg,transparent)]"></div>
                </div>
              </div>
            ` : error ? html`
              <div class="rounded-2xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-5" aria-live="polite">
                <h2 class="text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.errorTitle}</h2>
                <p class="mt-2 text-sm leading-6 text-[var(--text-default,currentColor)]">
                  ${error.code === 'client.preconditionMissing' ? this.msg.missingSelection : errorMessage}
                </p>
                ${error.code !== 'client.preconditionMissing' ? html`
                  <button
                    type="button"
                    class="mt-4 min-h-11 rounded-lg border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-medium text-[var(--button-secondary-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
                    @click=${() => this.getAgentOverview()}
                  >
                    ${this.msg.retry}
                  </button>
                ` : html``}
              </div>
            ` : this.agent ? html`
              <article class="overflow-hidden rounded-2xl border border-[var(--border-subtle,currentColor)] bg-[var(--surface-bg,transparent)]">
                <div class="border-b border-[var(--border-subtle,currentColor)] px-5 py-6">
                  <p class="text-sm font-medium text-[var(--text-muted,currentColor)]">${this.msg.statusLabel}</p>
                  <p class="mt-1 whitespace-nowrap text-5xl font-semibold leading-none tracking-tight text-[var(--text-strong,currentColor)]">
                    ${this.agent.isOn ? this.msg.statusOn : this.msg.statusOff}
                  </p>
                  <p class="mt-4 break-words text-xl font-semibold text-[var(--text-strong,currentColor)]">@${this.agent.name}</p>
                </div>

                <dl class="divide-y divide-[var(--border-subtle,currentColor)]">
                  ${this.agent.definition ? html`
                    <div class="px-5 py-4">
                      <dt class="text-sm font-medium text-[var(--text-muted,currentColor)]">${this.msg.whatLabel}</dt>
                      <dd class="mt-1 break-words text-sm leading-6 text-[var(--text-default,currentColor)]">${this.agent.definition}</dd>
                    </div>
                  ` : html``}
                  ${this.agent.talksTo ? html`
                    <div class="px-5 py-4">
                      <dt class="text-sm font-medium text-[var(--text-muted,currentColor)]">${this.msg.talksToLabel}</dt>
                      <dd class="mt-1 break-words text-sm leading-6 text-[var(--text-default,currentColor)]">${this.agent.talksTo}</dd>
                    </div>
                  ` : html``}
                  ${this.agent.onBehalfOf ? html`
                    <div class="px-5 py-4">
                      <dt class="text-sm font-medium text-[var(--text-muted,currentColor)]">${this.msg.onBehalfOfLabel}</dt>
                      <dd class="mt-1 break-words text-sm leading-6 text-[var(--text-default,currentColor)]">${this.agent.onBehalfOf}</dd>
                    </div>
                  ` : html``}
                  ${this.agent.responsibleName ? html`
                    <div class="px-5 py-4">
                      <dt class="text-sm font-medium text-[var(--text-muted,currentColor)]">${this.msg.responsibleLabel}</dt>
                      <dd class="mt-1 break-words text-sm leading-6 text-[var(--text-default,currentColor)]">${this.agent.responsibleName}</dd>
                    </div>
                  ` : html``}
                </dl>

                <div class="px-5 py-3">
                  <button
                    type="button"
                    class="min-h-11 text-sm font-medium text-[var(--link-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
                    @click=${() => this.seeAgentActivity()}
                  >
                    ${this.msg.activityLink}
                  </button>
                </div>
              </article>
            ` : html`
              <div class="rounded-2xl border border-[var(--border-subtle,currentColor)] bg-[var(--surface-bg,transparent)] p-5" aria-live="polite">
                <h2 class="text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.emptyTitle}</h2>
                <p class="mt-2 text-sm leading-6 text-[var(--text-muted,currentColor)]">${this.msg.emptyBody}</p>
              </div>
            `}
          </section>
        </div>
      </main>
    `;
  }
}
