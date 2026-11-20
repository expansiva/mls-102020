/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/agent_simulation.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsAgent_simulationShared } from '/_102047_/l2/agents/web/shared/agent_simulation.js';
import type { ErrorState, ToolVerdict } from '/_102047_/l2/agents/web/shared/agent_simulation.js';
import '/_102040_/l2/molecules/groupentertext/ml-multiline-text.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-contextual-feedback.js';
import '/_102040_/l2/molecules/groupsearchcontent/ml-search-filters.js';
import '/_102040_/l2/molecules/groupselectone/ml-combobox.js';
import '/_102040_/l2/molecules/groupselectone/ml-segmented-control.js';
import '/_102040_/l2/molecules/groupselectone/ml-select-one-autocomplete.js';
import '/_102040_/l2/molecules/groupshowprogress/ml-indeterminate-spinner.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
import '/_102040_/l2/molecules/groupviewdata/ml-vertical-record-list.js';
import '/_102040_/l2/molecules/groupviewhierarchy/ml-hierarchy-tree.js';
import '/_102040_/l2/molecules/groupviewtable/ml-grouping-table.js';

/// **collab_i18n_start**
const pageMessage_en = {
  pageTitle: 'Agent simulation',
  pageIntro: 'Try this agent before you rely on it. Simulation results are temporary and nothing is saved.',
  agentLabel: 'Agent',
  opening: 'Opening simulation…',
  openingErrorTitle: 'Simulation could not open',
  openingError: 'We could not open this agent simulation. Try again.',
  missingAgent: 'Choose an agent from the Agents list before opening a simulation.',
  reload: 'Try again',
  whatItCan: 'What it can do',
  whatItCanIntro: 'See the tools this agent may use for a person or role and why each tool is available or blocked.',
  simulateFor: 'Simulate for',
  person: 'Person',
  role: 'Role',
  choosePerson: 'Choose a person',
  noPeople: 'No active people found',
  searchPeople: 'Search people',
  searchPeoplePlaceholder: 'Type a name to find a person',
  roleName: 'Role',
  rolePlaceholder: 'Enter a role name',
  runSimulation: 'Run simulation',
  runningSimulation: 'Running simulation…',
  toolCatalog: 'Open tool catalog',
  toolsFor: 'Tools for this person or role',
  module: 'Module',
  subject: 'Subject',
  action: 'Action',
  availability: 'Availability',
  why: 'Why',
  canUse: 'Can be used',
  cannotUse: 'Blocked',
  allowed: 'Allowed',
  restrictedForPerson: 'Restricted for this person',
  notPermittedForRole: 'Not permitted for this role',
  removedFromRelease: 'Removed from the release',
  noToolsTitle: 'No tools are on',
  noTools: 'This agent has no tools available for this simulation.',
  simulationErrorTitle: 'Simulation could not run',
  simulationError: 'Check the simulation details and try again.',
  chooseSimulationFields: 'Choose who to simulate for and provide the required person or role.',
  peopleErrorTitle: 'People could not be loaded',
  peopleError: 'Try searching again.',
  whatItUnderstands: 'What it understands',
  understandsIntro: 'Test a sample request and inspect the action path the agent reads from it.',
  sentence: 'Sentence',
  sentencePlaceholder: 'For example, prepare this month’s sales report',
  testSentence: 'Test sentence',
  readingSentence: 'Reading the sentence…',
  understandsErrorTitle: 'Sentence could not be tested',
  understandsError: 'Enter a sentence and try again.',
  sentenceRequired: 'Enter a sentence.',
  asksForAction: 'This sentence asks for an action',
  doesNotAskForAction: 'This sentence does not ask for an action',
  actionPath: 'Action path',
  noPath: 'No tool path was identified',
  actions: 'Actions the agent would take',
  tool: 'Tool',
  explanation: 'Explanation',
  noActions: 'No actions were identified for this sentence.',
  waitingForSentence: 'Enter a sentence to see how the agent reads it.'
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = { 'en': pageMessage_en };
/// **collab_i18n_end**

function errorMessage(error: ErrorState, fallback: string, precondition: string, required: string): string {
  if (!error) return '';
  if (error.message) return error.message;
  if (error.code === 'client.preconditionMissing') return precondition;
  if (error.code === 'client.requiredMissing') return required;
  return fallback;
}

function reasonKey(reason: ToolVerdict['reason']): keyof PageMessageType {
  const keys: Record<ToolVerdict['reason'], keyof PageMessageType> = {
    allowed: 'allowed',
    restrictedForPerson: 'restrictedForPerson',
    notPermittedForRole: 'notPermittedForRole',
    removedFromRelease: 'removedFromRelease'
  };
  return keys[reason];
}

@customElement('agents--web--desktop--page11--agent_simulation-102047')
export class AgentsDesktopPage11Agent_simulationPage extends AgentsAgent_simulationShared {
  private msg: PageMessageType = pageMessage_en;

  renderWhatItCan() {
    const draft = this.simulateWhatItCanDraft;
    const result = this.whatItCan;
    const simulationError = errorMessage(
      this.simulateWhatItCanError,
      this.msg.simulationError,
      this.msg.missingAgent,
      this.msg.chooseSimulationFields
    );
    const peopleError = errorMessage(
      this.findPeopleToSimulateError,
      this.msg.peopleError,
      this.msg.missingAgent,
      this.msg.chooseSimulationFields
    );
    const isRunning = this.simulateWhatItCanStatus === 'loading';
    const isSearching = this.findPeopleToSimulateStatus === 'loading';
    return html`
      <section data-organism-id="whatItCan" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-6 shadow-sm">
        <div class="flex items-start justify-between gap-6">
          <div>
            <h2 class="text-xl font-semibold text-[var(--text-strong,currentColor)]">${this.msg.whatItCan}</h2>
            <p class="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-muted,currentColor)]">${this.msg.whatItCanIntro}</p>
          </div>
          <grouptriggeraction--ml-button-standard data-variant="link" size="sm" @action=${() => this.openToolCatalog()}>
            <Label>${this.msg.toolCatalog}</Label>
          </grouptriggeraction--ml-button-standard>
        </div>

        <div class="mt-6 rounded-lg border border-[var(--border-subtle,currentColor)] bg-[var(--surface-alt-bg,transparent)] p-4">
          <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-4">
            <groupselectone--ml-segmented-control
              .value=${draft.subjectKind}
              name="subjectKind"
              @change=${(e: CustomEvent<{ value: string | null }>) => this.setSimulateWhatItCanDraft({ ...draft, subjectKind: e.detail.value === 'person' || e.detail.value === 'role' ? e.detail.value : null, person: e.detail.value === 'role' ? null : draft.person, roleName: e.detail.value === 'person' ? null : draft.roleName })}>
              <Label>${this.msg.simulateFor}</Label>
              <Item value="person">${this.msg.person}</Item>
              <Item value="role">${this.msg.role}</Item>
            </groupselectone--ml-segmented-control>

            ${draft.subjectKind === 'role' ? html`
              <groupselectone--ml-combobox
                .value=${draft.roleName}
                .freeText=${true}
                .clearable=${true}
                name="roleName"
                placeholder=${this.msg.rolePlaceholder}
                @change=${(e: CustomEvent<{ value: string | null }>) => this.setSimulateWhatItCanDraft({ ...draft, roleName: e.detail.value })}>
                <Label>${this.msg.roleName}</Label>
              </groupselectone--ml-combobox>
            ` : html`
              <groupselectone--ml-select-one-autocomplete
                .value=${draft.person}
                .loading=${isSearching}
                .clearable=${true}
                name="person"
                placeholder=${this.msg.choosePerson}
                @focus=${() => this.findPeopleToSimulate()}
                @change=${(e: CustomEvent<{ value: string | null }>) => this.setSimulateWhatItCanDraft({ ...draft, person: e.detail.value })}>
                <Label>${this.msg.person}</Label>
                ${(this.people?.items ?? []).map((person) => html`<Item value=${person.id}>${person.details.identification.name}</Item>`)}
                <Empty>${this.msg.noPeople}</Empty>
              </groupselectone--ml-select-one-autocomplete>
            `}

            <grouptriggeraction--ml-button-standard .loading=${isRunning} .disabled=${isRunning} size="md" @action=${() => this.simulateWhatItCan()}>
              <Label>${this.msg.runSimulation}</Label>
            </grouptriggeraction--ml-button-standard>
          </div>

          ${draft.subjectKind !== 'role' ? html`
            <div class="mt-4 max-w-md">
              <groupsearchcontent--ml-search-filters
                .value=${this.peopleSearch || null}
                .loading=${isSearching}
                name="peopleSearch"
                placeholder=${this.msg.searchPeoplePlaceholder}
                @search=${(e: CustomEvent<{ query: string }>) => this.findPeopleToSimulate(e.detail.query)}
                @clear=${() => this.findPeopleToSimulate('')}>
                <Label>${this.msg.searchPeople}</Label>
                ${(this.people?.items ?? []).map((person) => html`<Suggestion value=${person.details.identification.name}>${person.details.identification.name}</Suggestion>`)}
                <Empty>${this.msg.noPeople}</Empty>
              </groupsearchcontent--ml-search-filters>
            </div>
          ` : ''}
          <groupnotifyuser--ml-contextual-feedback type="error" .visible=${Boolean(peopleError)} .dismissible=${false}>
            <Title>${this.msg.peopleErrorTitle}</Title><Message>${peopleError}</Message>
          </groupnotifyuser--ml-contextual-feedback>
        </div>

        <groupnotifyuser--ml-contextual-feedback data-class="mt-4" type="error" .visible=${Boolean(simulationError)} .dismissible=${false}>
          <Title>${this.msg.simulationErrorTitle}</Title><Message>${simulationError}</Message>
        </groupnotifyuser--ml-contextual-feedback>

        <div class="mt-6">
          ${isRunning ? html`<div class="flex items-center justify-center py-12"><groupshowprogress--ml-indeterminate-spinner size="md" label=${this.msg.runningSimulation}></groupshowprogress--ml-indeterminate-spinner></div>` : html`
            <groupviewtable--ml-grouping-table .loading=${this.getSimulationPageStatus === 'loading'} .value=${''}>
              <TableHeader><TableRow>
                <TableHead key="module" groupable sortable>${this.msg.module}</TableHead>
                <TableHead key="subject" groupable sortable>${this.msg.subject}</TableHead>
                <TableHead key="action" sortable>${this.msg.action}</TableHead>
                <TableHead key="availability">${this.msg.availability}</TableHead>
                <TableHead key="why">${this.msg.why}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                ${(result?.toolVerdicts ?? []).map((verdict) => html`<TableRow key=${verdict.tool}>
                  <TableCell>${verdict.moduleName}</TableCell>
                  <TableCell>${verdict.subjectName}</TableCell>
                  <TableCell>${verdict.actionName}</TableCell>
                  <TableCell><span class=${verdict.canUse ? 'font-medium text-[var(--status-success-text,currentColor)]' : 'font-medium text-[var(--status-error-text,currentColor)]'}>${verdict.canUse ? this.msg.canUse : this.msg.cannotUse}</span></TableCell>
                  <TableCell>${verdict.reasonText || this.msg[reasonKey(verdict.reason)]}</TableCell>
                </TableRow>`)}
              </TableBody>
              <Loading><div class="py-10 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.opening}</div></Loading>
              <Empty><div class="py-10 text-center"><p class="font-medium text-[var(--text-strong,currentColor)]">${this.msg.noToolsTitle}</p><p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${this.msg.noTools}</p></div></Empty>
            </groupviewtable--ml-grouping-table>
          `}
        </div>
      </section>`;
  }

  renderWhatItUnderstands() {
    const draft = this.simulateWhatItUnderstandsDraft;
    const result = this.whatItUnderstands;
    const understanding = result?.understanding;
    const isRunning = this.simulateWhatItUnderstandsStatus === 'loading';
    const requestError = errorMessage(this.simulateWhatItUnderstandsError, this.msg.understandsError, this.msg.missingAgent, this.msg.sentenceRequired);
    return html`
      <section data-organism-id="whatItUnderstands" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-6 shadow-sm">
        <h2 class="text-xl font-semibold text-[var(--text-strong,currentColor)]">${this.msg.whatItUnderstands}</h2>
        <p class="mt-1 text-sm leading-6 text-[var(--text-muted,currentColor)]">${this.msg.understandsIntro}</p>
        <div class="mt-5">
          <groupentertext--ml-multiline-text .value=${draft.sentence ?? ''} name="sentence" rows=${4} placeholder=${this.msg.sentencePlaceholder} @input=${(e: CustomEvent<{ value: string }>) => this.setSimulateWhatItUnderstandsDraft({ sentence: e.detail.value })}>
            <Label>${this.msg.sentence}</Label>
          </groupentertext--ml-multiline-text>
          <div class="mt-3 flex justify-end"><grouptriggeraction--ml-button-standard .loading=${isRunning} .disabled=${isRunning} @action=${() => this.simulateWhatItUnderstands()}><Label>${this.msg.testSentence}</Label></grouptriggeraction--ml-button-standard></div>
        </div>
        <groupnotifyuser--ml-contextual-feedback data-class="mt-4" type="error" .visible=${Boolean(requestError)} .dismissible=${false}><Title>${this.msg.understandsErrorTitle}</Title><Message>${requestError}</Message></groupnotifyuser--ml-contextual-feedback>
        ${isRunning ? html`<div class="flex justify-center py-12"><groupshowprogress--ml-indeterminate-spinner size="md" label=${this.msg.readingSentence}></groupshowprogress--ml-indeterminate-spinner></div>` : understanding ? html`
          <groupnotifyuser--ml-contextual-feedback data-class="mt-5" type=${understanding.asksForAction ? 'success' : 'info'} .visible=${true} .dismissible=${false}><Message>${understanding.asksForAction ? this.msg.asksForAction : this.msg.doesNotAskForAction}</Message></groupnotifyuser--ml-contextual-feedback>
          <div class="mt-5"><groupviewhierarchy--ml-hierarchy-tree .expandAll=${true}><Label>${this.msg.actionPath}</Label>${understanding.moduleName ? html`<Node expanded>${understanding.moduleName}${understanding.subjectName ? html`<Node expanded>${understanding.subjectName}</Node>` : ''}</Node>` : html`<Empty>${this.msg.noPath}</Empty>`}</groupviewhierarchy--ml-hierarchy-tree></div>
          <div class="mt-5"><groupviewdata--ml-vertical-record-list .hoverable=${false}><Columns><Column field="tool" header=${this.msg.tool}></Column><Column field="action" header=${this.msg.action}></Column></Columns><Rows>${understanding.actions.map((action) => html`<Row><Cell>${action.tool}</Cell><Cell>${action.actionName}</Cell></Row>`)}</Rows><Empty>${this.msg.noActions}</Empty></groupviewdata--ml-vertical-record-list></div>
          ${understanding.explanation ? html`<div class="mt-5 rounded-lg bg-[var(--surface-alt-bg,transparent)] p-4"><h3 class="text-sm font-semibold text-[var(--text-strong,currentColor)]">${this.msg.explanation}</h3><p class="mt-1 text-sm leading-6 text-[var(--text-default,currentColor)]">${understanding.explanation}</p></div>` : ''}
        ` : html`<p class="mt-8 rounded-lg border border-dashed border-[var(--border-subtle,currentColor)] p-6 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.waitingForSentence}</p>`}
      </section>`;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const openingError = errorMessage(this.getSimulationPageError, this.msg.openingError, this.msg.missingAgent, this.msg.missingAgent);
    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] p-8 text-[var(--text-default,currentColor)]">
        <div class="mx-auto max-w-[1440px]">
          <header class="mb-7 flex items-end justify-between gap-6"><div><p class="text-sm font-medium text-[var(--text-muted,currentColor)]">${this.msg.agentLabel}${this.agent ? html`: @${this.agent.name}` : ''}</p><h1 class="mt-1 text-3xl font-semibold tracking-tight text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1><p class="mt-2 text-sm text-[var(--text-muted,currentColor)]">${this.msg.pageIntro}</p></div></header>
          <groupnotifyuser--ml-contextual-feedback type="error" .visible=${Boolean(openingError)} .dismissible=${false} @action=${() => this.getSimulationPage()}><Title>${this.msg.openingErrorTitle}</Title><Message>${openingError}</Message><Action><button type="button">${this.msg.reload}</button></Action></groupnotifyuser--ml-contextual-feedback>
          ${this.getSimulationPageStatus === 'loading' ? html`<div class="flex justify-center py-24"><groupshowprogress--ml-indeterminate-spinner size="lg" label=${this.msg.opening}></groupshowprogress--ml-indeterminate-spinner></div>` : html`<div class="grid grid-cols-[minmax(0,1.45fr)_minmax(360px,0.85fr)] items-start gap-6">${this.renderWhatItCan()}${this.renderWhatItUnderstands()}</div>`}
        </div>
      </main>`;
  }
}
