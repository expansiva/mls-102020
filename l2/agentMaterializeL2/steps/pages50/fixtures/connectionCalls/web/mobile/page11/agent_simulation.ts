/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/agent_simulation.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsAgent_simulationShared } from '/_102047_/l2/agents/web/shared/agent_simulation.js';
import type { ErrorState, ToolVerdict } from '/_102047_/l2/agents/web/shared/agent_simulation.js';
import '/_102040_/l2/molecules/groupentertext/ml-enter-text.js';
import '/_102040_/l2/molecules/groupentertext/ml-multiline-text.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-contextual-feedback.js';
import '/_102040_/l2/molecules/groupselectone/ml-segmented-control.js';
import '/_102040_/l2/molecules/groupselectone/ml-select-one-autocomplete.js';
import '/_102040_/l2/molecules/groupshowprogress/ml-indeterminate-spinner.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
import '/_102040_/l2/molecules/groupviewdata/ml-vertical-record-list.js';
import '/_102040_/l2/molecules/groupviewhierarchy/ml-hierarchy-tree.js';
import '/_102040_/l2/molecules/groupviewtable/ml-responsive-table.js';
import '/_102020_/l2/molecules/ml-scenary.js';

/// **collab_i18n_start**
const pageMessage_en = {
  pageTitle: 'Agent simulation',
  opening: 'Opening agent simulation',
  agentMissingTitle: 'Choose an agent to simulate',
  agentMissingMessage: 'This simulation needs an agent selected from the Agents area.',
  reload: 'Try again',
  capabilitiesTitle: 'What it can do',
  understandingTitle: 'How it reads a request',
  agentLabel: 'Agent',
  simulateFor: 'Simulate for',
  person: 'Person',
  role: 'Role',
  personLabel: 'Person',
  personPlaceholder: 'Find a person',
  noPeople: 'No active people found.',
  loadMorePeople: 'Load more people',
  roleLabel: 'Role',
  rolePlaceholder: 'Enter a role name',
  subjectHelp: 'Choose a person or role to see the tools available to the agent.',
  runSimulation: 'Check available tools',
  runningSimulation: 'Checking available tools',
  toolsTitle: 'Tools for this person or role',
  tool: 'Tool',
  module: 'Module',
  subject: 'Subject',
  action: 'Action',
  availability: 'Availability',
  reason: 'Why',
  usable: 'Usable',
  blocked: 'Blocked',
  allowed: 'Available for this simulation.',
  restrictedForPerson: 'Restricted for this person.',
  notPermittedForRole: 'Not permitted for this role.',
  removedFromRelease: 'No longer available in this release.',
  noToolsTitle: 'No tools are on',
  noToolsMessage: 'There are no enabled tools to simulate for this agent.',
  simulationNoteTitle: 'Simulation only',
  simulationNote: 'These results are not saved.',
  openCatalog: 'Open tool catalog',
  continueToSentence: 'Test a sentence',
  sentenceLabel: 'Sentence',
  sentencePlaceholder: 'Type a sample request for the agent',
  sentenceHelp: 'Use a natural request to see how the agent reads it.',
  testSentence: 'Test sentence',
  readingSentence: 'Reading sentence',
  actionRequestedTitle: 'This request asks for an action',
  noActionTitle: 'This request does not ask for an action',
  actionRequestedMessage: 'The agent identified an action in the sentence.',
  noActionMessage: 'The agent did not identify an action in the sentence.',
  pathTitle: 'Where this request leads',
  actionsTitle: 'Actions it would take',
  actionTool: 'Tool',
  actionName: 'Action',
  noActions: 'No actions were identified.',
  explanationTitle: 'Explanation',
  capabilitiesErrorTitle: 'Could not check available tools',
  peopleErrorTitle: 'Could not find people',
  understandingErrorTitle: 'Could not test this sentence',
  genericError: 'Please try again.',
  chooseSubject: 'Choose a person or enter a role.',
  sentenceRequired: 'Enter a sentence to test.',
  preconditionError: 'Open this page from an agent to run its simulation.'
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = { 'en': pageMessage_en };
/// **collab_i18n_end**

const REASON_KEY: Record<ToolVerdict['reason'], keyof PageMessageType> = {
  allowed: 'allowed',
  restrictedForPerson: 'restrictedForPerson',
  notPermittedForRole: 'notPermittedForRole',
  removedFromRelease: 'removedFromRelease'
};

function errorText(error: ErrorState, fallback: string, message: PageMessageType) {
  if (!error) return '';
  if (error.message) return error.message;
  if (error.code === 'client.requiredMissing') return fallback;
  if (error.code === 'client.preconditionMissing') return message.preconditionError;
  return message.genericError;
}

@customElement('agents--web--mobile--page11--agent_simulation-102047')
export class AgentsMobilePage11Agent_simulationPage extends AgentsAgent_simulationShared {
  private msg: PageMessageType = pageMessage_en;

  private renderCapabilityScene() {
    const draft = this.simulateWhatItCanDraft;
    const isLoading = this.simulateWhatItCanStatus === 'loading';
    const peopleLoading = this.findPeopleToSimulateStatus === 'loading';
    const subjectError = errorText(this.simulateWhatItCanError, this.msg.chooseSubject, this.msg);
    const peopleError = errorText(this.findPeopleToSimulateError, this.msg.genericError, this.msg);
    const verdicts = this.whatItCan?.toolVerdicts ?? [];

    return html`
      <section data-organism-id="whatItCan" class="space-y-5">
        <div class="rounded-2xl border border-[var(--border-subtle,currentColor)] bg-[var(--surface-alt-bg,transparent)] p-4">
          <p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.agentLabel}</p>
          <p class="mt-1 break-words text-lg font-semibold text-[var(--text-strong,currentColor)]">@${this.agent?.name ?? ''}</p>
        </div>

        <div class="space-y-4 rounded-2xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-4">
          <groupselectone--ml-segmented-control
            .value=${draft.subjectKind}
            name="simulateFor"
            .loading=${isLoading}
            @change=${(e: CustomEvent<{ value: string | null }>) => this.setSimulateWhatItCanDraft({
              subjectKind: e.detail.value === 'person' || e.detail.value === 'role' ? e.detail.value : null,
              person: null,
              roleName: null
            })}>
            <Label>${this.msg.simulateFor}</Label>
            <Item value="person">${this.msg.person}</Item>
            <Item value="role">${this.msg.role}</Item>
          </groupselectone--ml-segmented-control>

          ${draft.subjectKind === 'person' ? html`
            <groupselectone--ml-select-one-autocomplete
              .value=${draft.person}
              name="person"
              .searchable=${true}
              .clearable=${true}
              .loading=${peopleLoading || isLoading}
              .error=${subjectError}
              @focus=${() => this.findPeopleToSimulate()}
              @change=${(e: CustomEvent<{ value: string | null }>) => this.setSimulateWhatItCanDraft({ ...draft, person: e.detail.value })}>
              <Label>${this.msg.personLabel}</Label>
              <Trigger>${this.msg.personPlaceholder}</Trigger>
              ${(this.people?.items ?? []).map(person => html`<Item value=${person.id}>${person.details.identification.name}</Item>`)}
              <Empty>${this.msg.noPeople}</Empty>
            </groupselectone--ml-select-one-autocomplete>
            <groupnotifyuser--ml-contextual-feedback .type=${'error'} .visible=${Boolean(peopleError)} .dismissible=${false}>
              <Title>${this.msg.peopleErrorTitle}</Title>
              <Message>${peopleError}</Message>
            </groupnotifyuser--ml-contextual-feedback>
            ${this.people?.hasMore ? html`
              <grouptriggeraction--ml-button-standard data-variant="secondary" size="md" data-class="w-full" .loading=${peopleLoading}
                @action=${() => this.findPeopleToSimulate(undefined, this.people ? this.people.page + 1 : 1, true)}>
                <Label>${this.msg.loadMorePeople}</Label>
              </grouptriggeraction--ml-button-standard>` : ''}
          ` : ''}

          ${draft.subjectKind === 'role' ? html`
            <groupentertext--ml-enter-text
              .value=${draft.roleName ?? ''}
              name="roleName"
              .placeholder=${this.msg.rolePlaceholder}
              .loading=${isLoading}
              .error=${subjectError}
              @input=${(e: CustomEvent<{ value: string }>) => this.setSimulateWhatItCanDraft({ ...draft, roleName: e.detail.value || null })}>
              <Label>${this.msg.roleLabel}</Label>
            </groupentertext--ml-enter-text>
          ` : ''}

          <p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.subjectHelp}</p>
          <grouptriggeraction--ml-button-standard data-variant="primary" size="lg" data-class="w-full" .loading=${isLoading}
            @action=${() => this.simulateWhatItCan()}>
            <Label>${this.msg.runSimulation}</Label>
          </grouptriggeraction--ml-button-standard>
        </div>

        <groupnotifyuser--ml-contextual-feedback .type=${'error'} .visible=${Boolean(subjectError)} .dismissible=${false}>
          <Title>${this.msg.capabilitiesErrorTitle}</Title>
          <Message>${subjectError}</Message>
        </groupnotifyuser--ml-contextual-feedback>

        ${isLoading ? html`
          <div class="flex justify-center py-8"><groupshowprogress--ml-indeterminate-spinner size="md" .label=${this.msg.runningSimulation}></groupshowprogress--ml-indeterminate-spinner></div>
        ` : ''}

        <groupviewtable--ml-responsive-table
          .value=${''}
          .loading=${this.getSimulationPageStatus === 'loading'}
          .error=${''}
          .page=${1}
          .pageSize=${0}
          .totalItems=${0}>
          <TableCaption>${this.msg.toolsTitle}</TableCaption>
          <TableHeader><TableRow>
            <TableHead key="tool">${this.msg.tool}</TableHead>
            <TableHead key="module">${this.msg.module}</TableHead>
            <TableHead key="action">${this.msg.action}</TableHead>
            <TableHead key="availability">${this.msg.availability}</TableHead>
            <TableHead key="reason">${this.msg.reason}</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            ${verdicts.map(verdict => html`<TableRow key=${verdict.tool}>
              <TableCell>${verdict.tool}</TableCell>
              <TableCell>${verdict.moduleName} · ${verdict.subjectName}</TableCell>
              <TableCell>${verdict.actionName}</TableCell>
              <TableCell><span class=${verdict.canUse ? 'font-semibold text-[var(--status-success-text,currentColor)]' : 'font-semibold text-[var(--status-error-text,currentColor)]'}>${this.msg[verdict.canUse ? 'usable' : 'blocked']}</span></TableCell>
              <TableCell>${verdict.reasonText ?? this.msg[REASON_KEY[verdict.reason]]}</TableCell>
            </TableRow>`)}
          </TableBody>
          <Loading>${this.msg.opening}</Loading>
          <Empty>${this.pageStatus === 'empty' ? this.msg.noToolsMessage : ''}</Empty>
        </groupviewtable--ml-responsive-table>

        ${this.pageStatus === 'empty' ? html`
          <groupnotifyuser--ml-contextual-feedback .type=${'info'} .visible=${true} .dismissible=${false}>
            <Title>${this.msg.noToolsTitle}</Title><Message>${this.msg.noToolsMessage}</Message>
          </groupnotifyuser--ml-contextual-feedback>` : ''}
        <groupnotifyuser--ml-contextual-feedback .type=${'info'} .visible=${true} .dismissible=${false}>
          <Title>${this.msg.simulationNoteTitle}</Title><Message>${this.msg.simulationNote}</Message>
        </groupnotifyuser--ml-contextual-feedback>
        <div class="grid grid-cols-1 gap-3">
          <grouptriggeraction--ml-button-standard data-variant="secondary" size="md" data-class="w-full" @action=${() => this.openToolCatalog()}><Label>${this.msg.openCatalog}</Label></grouptriggeraction--ml-button-standard>
          <grouptriggeraction--ml-button-standard data-variant="primary" size="lg" data-class="w-full" @action=${() => this.setScenario('understanding')}><Label>${this.msg.continueToSentence}</Label></grouptriggeraction--ml-button-standard>
        </div>
      </section>`;
  }

  private renderUnderstandingScene() {
    const draft = this.simulateWhatItUnderstandsDraft;
    const loading = this.simulateWhatItUnderstandsStatus === 'loading';
    const error = errorText(this.simulateWhatItUnderstandsError, this.msg.sentenceRequired, this.msg);
    const result = this.whatItUnderstands;
    const understanding = result?.understanding;
    return html`
      <section data-organism-id="whatItUnderstands" class="space-y-5">
        <div class="rounded-2xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-4 space-y-4">
          <groupentertext--ml-multiline-text .value=${draft.sentence ?? ''} name="sentence" .rows=${4} .required=${true} .loading=${loading} .error=${error} .placeholder=${this.msg.sentencePlaceholder}
            @input=${(e: CustomEvent<{ value: string }>) => this.setSimulateWhatItUnderstandsDraft({ sentence: e.detail.value || null })}>
            <Label>${this.msg.sentenceLabel}</Label><Helper>${this.msg.sentenceHelp}</Helper>
          </groupentertext--ml-multiline-text>
          <grouptriggeraction--ml-button-standard data-variant="primary" size="lg" data-class="w-full" .loading=${loading} @action=${() => this.simulateWhatItUnderstands()}><Label>${this.msg.testSentence}</Label></grouptriggeraction--ml-button-standard>
        </div>
        <groupnotifyuser--ml-contextual-feedback .type=${'error'} .visible=${Boolean(error)} .dismissible=${false}><Title>${this.msg.understandingErrorTitle}</Title><Message>${error}</Message></groupnotifyuser--ml-contextual-feedback>
        ${loading ? html`<div class="flex justify-center py-8"><groupshowprogress--ml-indeterminate-spinner size="md" .label=${this.msg.readingSentence}></groupshowprogress--ml-indeterminate-spinner></div>` : ''}
        ${understanding ? html`
          <groupnotifyuser--ml-contextual-feedback .type=${understanding.asksForAction ? 'success' : 'info'} .visible=${true} .dismissible=${false}>
            <Title>${understanding.asksForAction ? this.msg.actionRequestedTitle : this.msg.noActionTitle}</Title>
            <Message>${understanding.asksForAction ? this.msg.actionRequestedMessage : this.msg.noActionMessage}</Message>
          </groupnotifyuser--ml-contextual-feedback>
          ${understanding.moduleName || understanding.subjectName ? html`
            <groupviewhierarchy--ml-hierarchy-tree .multiple=${true} .expandAll=${true}>
              <Label>${this.msg.pathTitle}</Label>
              ${understanding.moduleName ? html`<Node expanded>${understanding.moduleName}${understanding.subjectName ? html`<Node>${understanding.subjectName}</Node>` : ''}</Node>` : html`<Node>${understanding.subjectName ?? ''}</Node>`}
            </groupviewhierarchy--ml-hierarchy-tree>` : ''}
          <groupviewdata--ml-vertical-record-list .loading=${false} .hoverable=${false}>
            <Columns><Column field="tool" header=${this.msg.actionTool}></Column><Column field="action" header=${this.msg.actionName}></Column></Columns>
            <Rows>${understanding.actions.map(action => html`<Row><Cell>${action.tool}</Cell><Cell>${action.actionName}</Cell></Row>`)}</Rows>
            <Empty>${this.msg.noActions}</Empty>
          </groupviewdata--ml-vertical-record-list>
          ${understanding.explanation ? html`<div class="rounded-2xl border border-[var(--border-subtle,currentColor)] bg-[var(--surface-alt-bg,transparent)] p-4"><h2 class="font-semibold text-[var(--text-strong,currentColor)]">${this.msg.explanationTitle}</h2><p class="mt-2 text-sm text-[var(--text-default,currentColor)]">${understanding.explanation}</p></div>` : ''}
        ` : ''}
      </section>`;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const openingError = errorText(this.getSimulationPageError, this.msg.preconditionError, this.msg);
    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] px-4 py-5 text-[var(--text-default,currentColor)]">
        <div class="mx-auto max-w-lg space-y-5">
          <header><h1 class="text-2xl font-semibold text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1></header>
          <groupnotifyuser--ml-contextual-feedback .type=${'error'} .visible=${Boolean(openingError)} .dismissible=${false}>
            <Title>${this.msg.agentMissingTitle}</Title><Message>${openingError}</Message>
            <Action><button type="button" class="min-h-11 font-semibold text-[var(--link-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.getSimulationPage()}>${this.msg.reload}</button></Action>
          </groupnotifyuser--ml-contextual-feedback>
          <molecules--ml-scenary-102020 mode="scenary" .value=${this.scenary || 'capabilities'} .backLabel=${this.msg.capabilitiesTitle}
            @change=${(e: CustomEvent<{ value: string }>) => { if (e.target === e.currentTarget) this.setScenario(e.detail.value); }}>
            <Scene value="capabilities" .title=${this.msg.capabilitiesTitle}>${this.renderCapabilityScene()}</Scene>
            <Scene value="understanding" .title=${this.msg.understandingTitle} nav="back" backTo="capabilities">${this.renderUnderstandingScene()}</Scene>
          </molecules--ml-scenary-102020>
        </div>
      </main>`;
  }
}
