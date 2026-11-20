/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/agent_configuration.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsAgent_configurationShared } from '/_102047_/l2/agents/web/shared/agent_configuration.js';
import type { ErrorState, ResponsiblePerson } from '/_102047_/l2/agents/web/shared/agent_configuration.js';
import '/_102040_/l2/molecules/groupentertext/ml-floating-text-input.js';
import '/_102040_/l2/molecules/groupenterboolean/ml-toggle-switch.js';
import '/_102040_/l2/molecules/groupselectone/ml-select-one-autocomplete.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-contextual-feedback.js';
import '/_102040_/l2/molecules/groupviewdata/ml-vertical-record-list.js';
import '/_102020_/l2/molecules/ml-scenary.js';

/// **collab_i18n_start**
const pageMessage_en = {
  pageTitle: 'Agent configuration',
  backToSections: 'Sections',
  settings: 'Settings',
  limits: 'Limits',
  settingsDescription: 'Choose how people call this agent, whether it can answer, and who is responsible for it.',
  limitsDescription: 'Review the limits reported for this agent.',
  openSettings: 'Open settings',
  openLimits: 'Open limits',
  loadingConfiguration: 'Loading agent configuration…',
  loadingCandidates: 'Loading people…',
  loadingLimits: 'Loading limits…',
  noLimits: 'No limits are available for this agent.',
  noResponsiblePeople: 'No people are available to choose.',
  nameLabel: 'Name (@name)',
  namePlaceholder: 'Enter an @name',
  nameHelper: 'People use this name to call the agent in a chat.',
  onLabel: 'On',
  onHelper: 'When on, the agent can answer requests.',
  responsibleLabel: 'Responsible person',
  responsiblePlaceholder: 'Choose a person',
  responsibleHelper: 'Choose the organization user responsible for this agent.',
  active: 'Active',
  inactive: 'Inactive',
  merged: 'Merged',
  blocked: 'Blocked',
  loadMorePeople: 'Load more people',
  saveSettings: 'Save settings',
  savingSettings: 'Saving settings…',
  savedTitle: 'Settings saved',
  savedMessage: 'The agent configuration has been updated.',
  saveErrorTitle: 'Settings were not saved',
  saveErrorFallback: 'We could not save the agent configuration. Try again.',
  loadErrorTitle: 'Configuration unavailable',
  loadErrorFallback: 'We could not load this agent configuration. Try again.',
  retry: 'Try again',
  missingAgent: 'Choose an agent from Agents, then open its configuration.',
  noConfiguration: 'There is no configuration available for this agent.',
  limitColumn: 'Limit',
  valueColumn: 'Value',
  unavailableValue: 'Not available'
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = {
  'en': pageMessage_en
};
/// **collab_i18n_end**

const RESPONSIBLE_STATUS_KEY: Record<ResponsiblePerson['details']['identification']['status'], keyof PageMessageType> = {
  Active: 'active',
  Inactive: 'inactive',
  Merged: 'merged',
  Blocked: 'blocked'
};

function errorText(error: ErrorState, fallback: string) {
  return error?.message || fallback;
}

@customElement('agents--web--mobile--page11--agent_configuration-102047')
export class AgentsMobilePage11Agent_configurationPage extends AgentsAgent_configurationShared {
  private msg: PageMessageType = pageMessage_en;

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const isLoading = this.pageStatus === 'loading' || this.getAgentConfigurationStatus === 'loading';

    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] text-[var(--text-default,currentColor)]">
        <molecules--ml-scenary-102020
          class="block min-h-full"
          mode="scenary"
          .value=${this.scenary || 'sections'}
          .loading=${isLoading}
          backLabel=${this.msg.backToSections}
          @change=${(e: CustomEvent<{ value: string }>) => {
            if (e.target === e.currentTarget) this.setScenario(e.detail.value);
          }}
        >
          <Scene value="sections" title=${this.msg.pageTitle}>
            <div class="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-5">
              ${this.renderInitialFeedback()}
              <nav aria-label=${this.msg.pageTitle} class="overflow-hidden rounded-2xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)]">
                <button
                  type="button"
                  class="flex min-h-16 w-full items-center justify-between gap-4 border-b border-[var(--border-subtle,currentColor)] px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
                  @click=${() => this.setScenario('settings')}
                >
                  <span>
                    <span class="block font-semibold text-[var(--text-strong,currentColor)]">${this.msg.settings}</span>
                    <span class="mt-1 block text-sm text-[var(--text-muted,currentColor)]">${this.msg.settingsDescription}</span>
                  </span>
                  <span class="shrink-0 text-sm font-medium text-[var(--link-text,currentColor)]">${this.msg.openSettings}</span>
                </button>
                <button
                  type="button"
                  class="flex min-h-16 w-full items-center justify-between gap-4 px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
                  @click=${() => this.setScenario('limits')}
                >
                  <span>
                    <span class="block font-semibold text-[var(--text-strong,currentColor)]">${this.msg.limits}</span>
                    <span class="mt-1 block text-sm text-[var(--text-muted,currentColor)]">${this.msg.limitsDescription}</span>
                  </span>
                  <span class="shrink-0 text-sm font-medium text-[var(--link-text,currentColor)]">${this.msg.openLimits}</span>
                </button>
              </nav>
            </div>
          </Scene>

          <Scene value="settings" title=${this.msg.settings} nav="back" backTo="sections">
            ${this.renderSettings()}
          </Scene>

          <Scene value="limits" title=${this.msg.limits} nav="back" backTo="sections">
            ${this.renderLimits()}
          </Scene>
        </molecules--ml-scenary-102020>
      </main>
    `;
  }

  private renderInitialFeedback() {
    const precondition = this.getAgentConfigurationError?.code === 'client.preconditionMissing';
    const hasError = this.pageStatus === 'error' || this.getAgentConfigurationStatus === 'error';
    return html`
      ${isLoadingMessage(this.pageStatus === 'loading' || this.getAgentConfigurationStatus === 'loading', this.msg.loadingConfiguration)}
      <groupnotifyuser--ml-contextual-feedback
        type="error"
        .visible=${hasError}
        .dismissible=${false}
        .duration=${0}
      >
        <Title>${this.msg.loadErrorTitle}</Title>
        <Message>${precondition ? this.msg.missingAgent : errorText(this.getAgentConfigurationError, this.msg.loadErrorFallback)}</Message>
        ${precondition ? '' : html`<Action><button type="button" class="min-h-11 font-semibold text-[var(--link-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.getAgentConfiguration()}>${this.msg.retry}</button></Action>`}
      </groupnotifyuser--ml-contextual-feedback>
      ${this.pageStatus === 'empty' ? html`<p class="rounded-xl bg-[var(--surface-alt-bg,transparent)] px-4 py-3 text-sm text-[var(--text-muted,currentColor)]">${this.msg.noConfiguration}</p>` : ''}
    `;
  }

  private renderSettings() {
    const draft = this.saveAgentConfigurationDraft;
    const saving = this.saveAgentConfigurationStatus === 'loading';
    const saveFailed = this.saveAgentConfigurationStatus === 'error';
    const saved = this.saveAgentConfigurationStatus === 'success';
    const feedbackType = saveFailed ? 'error' : 'success';
    const feedbackTitle = saveFailed ? this.msg.saveErrorTitle : this.msg.savedTitle;
    const feedbackMessage = saveFailed
      ? errorText(this.saveAgentConfigurationError, this.msg.saveErrorFallback)
      : this.msg.savedMessage;

    return html`
      <form
        data-organism-id="agentConfigurationForm"
        class="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-5"
        aria-busy=${saving ? 'true' : 'false'}
        @submit=${(e: SubmitEvent) => {
          e.preventDefault();
          this.saveAgentConfiguration();
        }}
      >
        ${isLoadingMessage(this.getAgentConfigurationStatus === 'loading', this.msg.loadingConfiguration)}
        <groupentertext--ml-floating-text-input
          .value=${draft.name ?? ''}
          .error=${''}
          name="agent-name"
          placeholder=${this.msg.namePlaceholder}
          .required=${true}
          .disabled=${saving}
          .loading=${this.getAgentConfigurationStatus === 'loading'}
          @input=${(e: CustomEvent<{ value: string }>) => this.setSaveAgentConfigurationDraft({ ...draft, name: e.detail.value })}
        >
          <Label>${this.msg.nameLabel}</Label>
          <Helper>${this.msg.nameHelper}</Helper>
        </groupentertext--ml-floating-text-input>

        <groupenterboolean--ml-toggle-switch
          .value=${draft.isOn ?? false}
          .error=${''}
          name="agent-on"
          .disabled=${saving}
          @change=${(e: CustomEvent<{ value: boolean }>) => this.setSaveAgentConfigurationDraft({ ...draft, isOn: e.detail.value })}
        >
          <Label>${this.msg.onLabel}</Label>
          <Helper>${this.msg.onHelper}</Helper>
        </groupenterboolean--ml-toggle-switch>

        <groupselectone--ml-select-one-autocomplete
          .value=${draft.responsible}
          .error=${''}
          name="responsible-person"
          placeholder=${this.msg.responsiblePlaceholder}
          .searchable=${true}
          .clearable=${true}
          .disabled=${saving}
          .loading=${this.searchResponsibleCandidatesStatus === 'loading'}
          @focus=${() => this.searchResponsibleCandidates('', 1, false)}
          @change=${(e: CustomEvent<{ value: string | null }>) => this.setSaveAgentConfigurationDraft({ ...draft, responsible: e.detail.value })}
        >
          <Label>${this.msg.responsibleLabel}</Label>
          <Helper>${this.msg.responsibleHelper}</Helper>
          ${this.users?.items.map((person) => html`
            <Item value=${person.agent.responsible}>
              <span class="block font-medium">${person.details.identification.name}</span>
              <span class="block text-sm text-[var(--text-muted,currentColor)]">${this.msg[RESPONSIBLE_STATUS_KEY[person.details.identification.status]]}${person.details.agents.loginEmail ? html` · ${person.details.agents.loginEmail}` : ''}</span>
            </Item>
          `)}
          <Empty>${this.msg.noResponsiblePeople}</Empty>
        </groupselectone--ml-select-one-autocomplete>

        ${this.users?.hasMore ? html`
          <button
            type="button"
            class="min-h-11 self-start px-1 text-sm font-semibold text-[var(--link-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
            ?disabled=${saving || this.searchResponsibleCandidatesStatus === 'loading'}
            @click=${() => this.searchResponsibleCandidates('', undefined, true)}
          >${this.msg.loadMorePeople}</button>
        ` : ''}

        <groupnotifyuser--ml-contextual-feedback
          type=${feedbackType}
          .visible=${saveFailed || saved}
          .dismissible=${false}
          .duration=${saveFailed ? 0 : 4000}
        >
          <Title>${feedbackTitle}</Title>
          <Message>${feedbackMessage}</Message>
        </groupnotifyuser--ml-contextual-feedback>

        <div class="mt-2 border-t border-[var(--border-subtle,currentColor)] pt-4">
          <button
            type="submit"
            class="min-h-12 w-full rounded-xl bg-[var(--button-primary-bg,transparent)] px-4 font-semibold text-[var(--button-primary-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)] disabled:opacity-50"
            ?disabled=${saving || this.getAgentConfigurationStatus === 'loading'}
          >${saving ? this.msg.savingSettings : this.msg.saveSettings}</button>
        </div>
      </form>
    `;
  }

  private renderLimits() {
    return html`
      <section data-organism-id="agentLimits" class="mx-auto w-full max-w-lg px-4 py-5">
        <groupviewdata--ml-vertical-record-list .loading=${this.getAgentConfigurationStatus === 'loading'} .hoverable=${false}>
          <Columns>
            <Column field="label" header=${this.msg.limitColumn}></Column>
            <Column field="value" header=${this.msg.valueColumn}></Column>
          </Columns>
          <Rows>
            ${this.limits.map((limit) => html`
              <Row>
                <Cell><span class="font-medium text-[var(--text-strong,currentColor)]">${limit.label}</span></Cell>
                <Cell><span class="text-[var(--text-muted,currentColor)]">${limit.value ?? this.msg.unavailableValue}</span></Cell>
              </Row>
            `)}
          </Rows>
          <Loading><p class="px-4 py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingLimits}</p></Loading>
          <Empty><p class="px-4 py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.noLimits}</p></Empty>
        </groupviewdata--ml-vertical-record-list>
      </section>
    `;
  }
}

function isLoadingMessage(visible: boolean, message: string) {
  return visible ? html`<p class="rounded-xl bg-[var(--surface-alt-bg,transparent)] px-4 py-3 text-sm text-[var(--text-muted,currentColor)]" aria-live="polite">${message}</p>` : '';
}
