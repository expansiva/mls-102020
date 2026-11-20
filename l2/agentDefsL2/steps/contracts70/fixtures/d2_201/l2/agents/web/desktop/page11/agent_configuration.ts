/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/agent_configuration.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsAgent_configurationShared } from '/_102047_/l2/agents/web/shared/agent_configuration.js';
import '/_102040_/l2/molecules/groupentertext/ml-enter-text.js';
import '/_102040_/l2/molecules/groupenterboolean/ml-toggle-switch.js';
import '/_102040_/l2/molecules/groupselectone/ml-select-one-autocomplete.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-contextual-feedback.js';
import '/_102040_/l2/molecules/groupviewdata/ml-vertical-record-list.js';
import '/_102020_/l2/molecules/ml-scenary.js';

/// **collab_i18n_start**
const pageMessage_en = {
  pageTitle: 'Agent configuration',
  configuration: 'Configuration',
  limits: 'Limits',
  nameLabel: 'Name (@name)',
  nameHelper: 'People use this name to call the agent in a chat.',
  namePlaceholder: 'Enter an @name',
  onLabel: 'On',
  onHelper: 'When on, the agent can answer requests.',
  onStateOn: 'On',
  onStateOff: 'Off',
  responsibleLabel: 'Responsible person',
  responsibleHelper: 'Choose the organization user responsible for this agent.',
  responsiblePlaceholder: 'Choose a responsible person',
  responsibleEmpty: 'No responsible people are available.',
  loadMore: 'Load more people',
  saveConfiguration: 'Save configuration',
  saving: 'Saving configuration…',
  saveSuccessTitle: 'Configuration saved',
  saveSuccessMessage: 'Your changes are now applied to this agent.',
  saveErrorTitle: 'Configuration was not saved',
  requiredFieldsPrefix: 'Complete these required fields:',
  saveFailed: 'We could not save the configuration. Try again.',
  loadingConfiguration: 'Loading agent configuration…',
  loadingLimits: 'Loading limits…',
  unavailable: 'Not available',
  loadErrorTitle: 'Agent configuration is unavailable',
  configurationFailed: 'We could not load this agent’s configuration. Try again.',
  missingAgentTitle: 'Choose an agent to configure',
  missingAgentMessage: 'Open an agent from the Agents area, then return here to configure it.',
  retry: 'Try again'
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = {
  'en': pageMessage_en
};
/// **collab_i18n_end**

function commandErrorMessage(
  error: { code: string; message: string; details?: unknown } | null,
  msg: PageMessageType
) {
  if (error?.message) return error.message;
  if (error?.code === 'client.requiredMissing') {
    const stateKeys = error.details && typeof error.details === 'object' && 'stateKeys' in error.details
      ? (error.details as { stateKeys?: unknown }).stateKeys
      : undefined;
    const labelKeys: Record<string, keyof PageMessageType> = {
      name: 'nameLabel',
      isOn: 'onLabel',
      responsible: 'responsibleLabel'
    };
    if (Array.isArray(stateKeys)) {
      const labels = stateKeys
        .filter((key): key is string => typeof key === 'string' && key in labelKeys)
        .map((key) => msg[labelKeys[key]]);
      if (labels.length > 0) return `${msg.requiredFieldsPrefix} ${labels.join(', ')}`;
    }
  }
  return msg.saveFailed;
}

@customElement('agents--web--desktop--page11--agent_configuration-102047')
export class AgentsDesktopPage11Agent_configurationPage extends AgentsAgent_configurationShared {
  private msg: PageMessageType = pageMessage_en;

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const isLoading = this.pageStatus === 'loading' || this.getAgentConfigurationStatus === 'loading';
    const hasPreconditionError = this.getAgentConfigurationError?.code === 'client.preconditionMissing';
    const loadMessage = this.getAgentConfigurationError?.message || this.msg.configurationFailed;

    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] px-8 py-8 text-[var(--text-default,currentColor)]">
        <header class="mx-auto mb-8 max-w-7xl border-b border-[var(--border-subtle,currentColor)] pb-6">
          <h1 class="text-2xl font-semibold tracking-tight text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
        </header>

        ${hasPreconditionError ? html`
          <section class="mx-auto max-w-2xl rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-8" aria-live="polite">
            <h2 class="text-lg font-semibold text-[var(--text-strong,currentColor)]">${this.msg.missingAgentTitle}</h2>
            <p class="mt-2 text-sm text-[var(--text-muted,currentColor)]">${this.msg.missingAgentMessage}</p>
          </section>
        ` : html`
          <molecules--ml-scenary-102020
            class="mx-auto block max-w-7xl"
            mode="tabs"
            .value=${this.scenary || 'configuration'}
            .loading=${isLoading}
            @change=${(e: CustomEvent<{ value: string }>) => {
              if (e.target === e.currentTarget) this.setScenario(e.detail.value);
            }}>
            <Scene value="configuration" title=${this.msg.configuration}>
              ${this.renderConfiguration(isLoading, loadMessage)}
            </Scene>
            <Scene value="limits" title=${this.msg.limits}>
              ${this.renderLimits(isLoading, loadMessage)}
            </Scene>
          </molecules--ml-scenary-102020>
        `}
      </main>
    `;
  }

  private renderConfiguration(isLoading: boolean, loadMessage: string) {
    const draft = this.saveAgentConfigurationDraft;
    const saving = this.saveAgentConfigurationStatus === 'loading';
    const commandError = this.saveAgentConfigurationError;
    const commandSuccess = this.saveAgentConfigurationStatus === 'success';
    const canEdit = this.configuration !== null && !isLoading;

    if (this.pageStatus === 'error' || (this.getAgentConfigurationStatus === 'error' && this.configuration === null)) {
      return html`
        <section class="grid min-h-80 place-items-center rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-8" aria-live="polite">
          <div class="max-w-md text-center">
            <h2 class="text-lg font-semibold text-[var(--text-strong,currentColor)]">${this.msg.loadErrorTitle}</h2>
            <p class="mt-2 text-sm text-[var(--text-muted,currentColor)]">${loadMessage}</p>
            <button type="button" class="mt-5 min-h-11 rounded-lg bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-medium text-[var(--button-secondary-text,currentColor)] ring-offset-2 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.getAgentConfiguration()}>${this.msg.retry}</button>
          </div>
        </section>
      `;
    }

    return html`
      <div class="grid grid-cols-[minmax(0,1fr)_18rem] gap-8">
        <form data-organism-id="agentConfigurationForm" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-7" aria-busy=${saving ? 'true' : 'false'} @submit=${(e: Event) => { e.preventDefault(); this.saveAgentConfiguration(); }}>
          ${isLoading ? html`<p class="py-16 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingConfiguration}</p>` : html`
            <div class="space-y-7">
              <groupentertext--ml-enter-text
                data-class="w-full"
                .value=${draft.name ?? ''}
                .error=${''}
                name="agent-name"
                placeholder=${this.msg.namePlaceholder}
                .rows=${1}
                .required=${true}
                .disabled=${saving || !canEdit}
                @input=${(e: CustomEvent<{ value: string }>) => this.setSaveAgentConfigurationDraft({ ...draft, name: e.detail.value })}>
                <Label>${this.msg.nameLabel}</Label>
                <Helper>${this.msg.nameHelper}</Helper>
              </groupentertext--ml-enter-text>

              <div>
                <groupenterboolean--ml-toggle-switch
                  data-class="w-full"
                  .value=${draft.isOn ?? false}
                  .error=${''}
                  name="agent-on"
                  .disabled=${saving || !canEdit}
                  @change=${(e: CustomEvent<{ value: boolean }>) => this.setSaveAgentConfigurationDraft({ ...draft, isOn: e.detail.value })}>
                  <Label>${this.msg.onLabel}</Label>
                  <Helper>${this.msg.onHelper}</Helper>
                </groupenterboolean--ml-toggle-switch>
                <p class="mt-2 text-sm text-[var(--text-muted,currentColor)]">${draft.isOn ? this.msg.onStateOn : this.msg.onStateOff}</p>
              </div>

              <groupselectone--ml-select-one-autocomplete
                data-class="w-full"
                .value=${draft.responsible}
                .error=${''}
                name="responsible-person"
                placeholder=${this.msg.responsiblePlaceholder}
                .searchable=${true}
                .clearable=${true}
                .required=${true}
                .loading=${this.searchResponsibleCandidatesStatus === 'loading'}
                .disabled=${saving || !canEdit}
                @focus=${() => this.searchResponsibleCandidates('', 1, false)}
                @change=${(e: CustomEvent<{ value: string | null }>) => this.setSaveAgentConfigurationDraft({ ...draft, responsible: e.detail.value })}>
                <Label>${this.msg.responsibleLabel}</Label>
                <Helper>${this.msg.responsibleHelper}</Helper>
                ${(this.users?.items ?? []).map((person) => html`<Item value=${person.agent.responsible}>${person.details.identification.name}</Item>`)}
                <Empty>${this.msg.responsibleEmpty}</Empty>
              </groupselectone--ml-select-one-autocomplete>
              ${this.users?.hasMore ? html`
                <button type="button" class="min-h-11 rounded-lg px-3 text-sm font-medium text-[var(--link-text,currentColor)] ring-offset-2 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" ?disabled=${saving} @click=${() => this.searchResponsibleCandidates('', undefined, true)}>${this.msg.loadMore}</button>
              ` : ''}
            </div>

            <div class="mt-9 border-t border-[var(--border-subtle,currentColor)] pt-5">
              <groupnotifyuser--ml-contextual-feedback .type=${commandSuccess ? 'success' : 'error'} .visible=${commandSuccess || commandError !== null} .dismissible=${false}>
                <Title>${commandSuccess ? this.msg.saveSuccessTitle : this.msg.saveErrorTitle}</Title>
                <Message>${commandSuccess ? this.msg.saveSuccessMessage : commandErrorMessage(commandError, this.msg)}</Message>
              </groupnotifyuser--ml-contextual-feedback>
              <button type="submit" class="mt-5 min-h-11 rounded-lg bg-[var(--button-primary-bg,transparent)] px-5 text-sm font-semibold text-[var(--button-primary-text,currentColor)] ring-offset-2 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)] disabled:cursor-not-allowed disabled:opacity-50" ?disabled=${saving || !canEdit}>${saving ? this.msg.saving : this.msg.saveConfiguration}</button>
            </div>
          `}
        </form>

        <aside class="self-start rounded-xl border border-[var(--border-subtle,currentColor)] bg-[var(--surface-alt-bg,transparent)] p-5">
          <p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.nameHelper}</p>
        </aside>
      </div>
    `;
  }

  private renderLimits(isLoading: boolean, loadMessage: string) {
    if (this.pageStatus === 'error' || (this.getAgentConfigurationStatus === 'error' && this.configuration === null)) {
      return html`
        <section class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-7" aria-live="polite">
          <p class="text-sm text-[var(--text-muted,currentColor)]">${loadMessage}</p>
          <button type="button" class="mt-4 min-h-11 rounded-lg bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-medium text-[var(--button-secondary-text,currentColor)] ring-offset-2 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.getAgentConfiguration()}>${this.msg.retry}</button>
        </section>
      `;
    }
    return html`
      <section data-organism-id="agentLimits" class="max-w-4xl rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-6">
        <groupviewdata--ml-vertical-record-list data-class="w-full" .loading=${isLoading} .hoverable=${false}>
          <Columns>
            <Column field="label" header=${this.msg.limits}></Column>
            <Column field="value" header=${this.msg.unavailable} align="right"></Column>
          </Columns>
          <Rows>
            ${this.limits.map((limit) => html`
              <Row>
                <Cell><span class="font-medium text-[var(--text-strong,currentColor)]">${limit.label}</span></Cell>
                <Cell><span class="text-[var(--text-default,currentColor)]">${limit.value ?? this.msg.unavailable}</span></Cell>
              </Row>
            `)}
          </Rows>
          <Loading><div class="py-12 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingLimits}</div></Loading>
          <Empty><div class="py-12 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.unavailable}</div></Empty>
        </groupviewdata--ml-vertical-record-list>
      </section>
    `;
  }
}
