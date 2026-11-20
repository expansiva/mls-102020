/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/agent_overview.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsAgent_overviewShared } from '/_102047_/l2/agents/web/shared/agent_overview.js';
import type { ErrorState } from '/_102047_/l2/agents/web/shared/agent_overview.js';

/// **collab_i18n_start**
const pageMessage_en = {
  pageTitle: 'Agent overview',
  agentName: 'Name (@name)',
  availability: 'Availability',
  statusOn: 'On',
  statusOff: 'Off',
  statusOnDescription: 'This agent is on and answers requests.',
  statusOffDescription: 'This agent is off and does not answer requests.',
  agentDetails: 'Agent details',
  talksTo: 'Who it talks to',
  onBehalfOf: 'On whose behalf it acts',
  responsiblePerson: 'Responsible person',
  whatAgentIs: 'What the agent is',
  viewActivity: 'View activity',
  loading: 'Loading agent overview',
  loadError: 'The agent overview could not be loaded.',
  retry: 'Try again',
  noOverview: 'No agent overview is available.',
  selectionRequired: 'Choose an agent from the agents list to view its overview.'
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = {
  'en': pageMessage_en
};
/// **collab_i18n_end**

function errorCopy(error: ErrorState, msg: PageMessageType) {
  if (error?.code === 'client.preconditionMissing') return msg.selectionRequired;
  return error?.message || msg.loadError;
}

@customElement('agents--web--desktop--page11--agent_overview-102047')
export class AgentsDesktopPage11Agent_overviewPage extends AgentsAgent_overviewShared {
  private msg: PageMessageType = pageMessage_en;

  private renderLoading() {
    return html`
      <section aria-label=${this.msg.loading} aria-busy="true" class="rounded-2xl border border-[var(--border-subtle,currentColor)] bg-[var(--surface-bg,transparent)] p-10 shadow-sm">
        <div class="h-4 w-28 animate-pulse rounded bg-[var(--surface-alt-bg,transparent)]"></div>
        <div class="mt-4 h-16 w-44 animate-pulse rounded bg-[var(--surface-alt-bg,transparent)]"></div>
        <div class="mt-10 grid grid-cols-3 gap-5">
          <div class="h-20 animate-pulse rounded-xl bg-[var(--surface-alt-bg,transparent)]"></div>
          <div class="h-20 animate-pulse rounded-xl bg-[var(--surface-alt-bg,transparent)]"></div>
          <div class="h-20 animate-pulse rounded-xl bg-[var(--surface-alt-bg,transparent)]"></div>
        </div>
      </section>
    `;
  }

  private renderError() {
    const error = this.getAgentOverviewError;
    const canRetry = error?.code !== 'client.preconditionMissing';
    return html`
      <section aria-live="polite" class="rounded-2xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-10">
        <p class="max-w-xl text-base leading-7 text-[var(--text-default,currentColor)]">${errorCopy(error, this.msg)}</p>
        ${canRetry ? html`
          <button type="button" @click=${() => this.getAgentOverview()} class="mt-6 min-h-11 rounded-lg border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">
            ${this.msg.retry}
          </button>
        ` : ''}
      </section>
    `;
  }

  private renderOverview() {
    const agent = this.agent;
    if (agent === null) {
      return html`
        <section aria-live="polite" class="rounded-2xl border border-[var(--border-subtle,currentColor)] bg-[var(--surface-bg,transparent)] p-10">
          <p class="text-base text-[var(--text-default,currentColor)]">${this.pageStatus === 'idle' ? this.msg.selectionRequired : this.msg.noOverview}</p>
        </section>
      `;
    }
    const status = agent.isOn ? this.msg.statusOn : this.msg.statusOff;
    const statusDescription = agent.isOn ? this.msg.statusOnDescription : this.msg.statusOffDescription;
    return html`
      <article class="overflow-hidden rounded-2xl border border-[var(--border-subtle,currentColor)] bg-[var(--surface-bg,transparent)] shadow-sm">
        <div class="border-b border-[var(--border-subtle,currentColor)] px-10 py-9">
          <p class="text-sm font-medium text-[var(--text-muted,currentColor)]">${this.msg.agentName}</p>
          <p class="mt-1 text-xl font-semibold tracking-tight text-[var(--text-strong,currentColor)]"><span aria-hidden="true">@</span>${agent.name}</p>
          <div class="mt-10">
            <p class="text-sm font-medium text-[var(--text-muted,currentColor)]">${this.msg.availability}</p>
            <p class="mt-1 text-6xl font-semibold tracking-tight text-[var(--text-strong,currentColor)]">${status}</p>
            <p class="mt-3 text-sm text-[var(--text-muted,currentColor)]">${statusDescription}</p>
          </div>
        </div>

        <div class="px-10 py-8">
          ${(agent.talksTo || agent.onBehalfOf || agent.responsibleName) ? html`
            <dl aria-label=${this.msg.agentDetails} class="grid grid-cols-3 gap-x-8 gap-y-7">
              ${agent.talksTo ? html`<div><dt class="text-sm font-medium text-[var(--text-muted,currentColor)]">${this.msg.talksTo}</dt><dd class="mt-2 text-base leading-6 text-[var(--text-default,currentColor)]">${agent.talksTo}</dd></div>` : ''}
              ${agent.onBehalfOf ? html`<div><dt class="text-sm font-medium text-[var(--text-muted,currentColor)]">${this.msg.onBehalfOf}</dt><dd class="mt-2 text-base leading-6 text-[var(--text-default,currentColor)]">${agent.onBehalfOf}</dd></div>` : ''}
              ${agent.responsibleName ? html`<div><dt class="text-sm font-medium text-[var(--text-muted,currentColor)]">${this.msg.responsiblePerson}</dt><dd class="mt-2 text-base leading-6 text-[var(--text-default,currentColor)]">${agent.responsibleName}</dd></div>` : ''}
            </dl>
          ` : ''}
          ${agent.definition ? html`
            <div class="mt-9 max-w-3xl border-t border-[var(--border-subtle,currentColor)] pt-7">
              <p class="text-sm font-medium text-[var(--text-muted,currentColor)]">${this.msg.whatAgentIs}</p>
              <p class="mt-3 whitespace-pre-wrap text-base leading-7 text-[var(--text-default,currentColor)]">${agent.definition}</p>
            </div>
          ` : ''}
          <div class="mt-9 border-t border-[var(--border-subtle,currentColor)] pt-6">
            <button type="button" @click=${() => this.seeAgentActivity()} class="min-h-11 rounded-lg bg-[var(--button-primary-bg,transparent)] px-4 text-sm font-semibold text-[var(--button-primary-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]">
              ${this.msg.viewActivity}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const loading = this.pageStatus === 'loading' || this.getAgentOverviewStatus === 'loading';
    const failed = this.pageStatus === 'error' || this.getAgentOverviewStatus === 'error';
    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] px-10 py-10 text-[var(--text-default,currentColor)]">
        <div class="mx-auto max-w-5xl">
          <header class="mb-8">
            <h1 class="text-2xl font-semibold tracking-tight text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
          </header>
          <div data-organism-id="agentOverviewDetail">
            ${loading ? this.renderLoading() : failed ? this.renderError() : this.renderOverview()}
          </div>
        </div>
      </main>
    `;
  }
}
