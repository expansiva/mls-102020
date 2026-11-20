/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/agents.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsAgentsShared } from '/_102047_/l2/agents/web/shared/agents.js';
import type { AgentsCollectionEntry, DraftInboxItem, ErrorState, RequestEvent } from '/_102047_/l2/agents/web/shared/agents.js';
import '/_102020_/l2/molecules/ml-scenary.js';
import '/_102040_/l2/molecules/groupviewdata/ml-vertical-record-list.js';
import '/_102040_/l2/molecules/groupviewdata/ml-timeline-view.js';
import '/_102040_/l2/molecules/groupviewtable/ml-advanced-data-table.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
import '/_102040_/l2/molecules/groupentertext/ml-multiline-text.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-contextual-feedback.js';
import '/_102040_/l2/molecules/groupexpandcontent/ml-readmore-expand.js';

/// **collab_i18n_start**
const pageMessage_en = {
  pageTitle: 'Virtual employees',
  workspaceTitle: 'Review and manage',
  newRequestTitle: 'Request a virtual employee',
  historyTitle: 'Request history',
  backToWorkspace: 'Back to virtual employees',
  reviewQueue: 'Ready for your review',
  reviewQueueHint: 'Drafts prepared by the cm and requests still being prepared.',
  agentsCollection: 'Company agents and drafts',
  agentsCollectionHint: 'Open an agent to work with it, or review a draft once it is ready.',
  requestAgent: 'Request a virtual employee',
  viewRequestHistory: 'View request history',
  reload: 'Reload',
  loading: 'Loading virtual employees…',
  loadingRequests: 'Loading request history…',
  noInbox: 'There are no drafts waiting for review.',
  noAgents: 'There are no agents or drafts yet.',
  noRequests: 'There are no requests yet.',
  name: 'Name',
  situation: 'Situation',
  whatAgentIs: 'What the agent is',
  description: 'Description of the new agent',
  descriptionHint: 'Describe what this virtual employee does and who it should help.',
  descriptionPlaceholder: 'For example: an agent that helps the sales team prepare follow-ups and answers questions about active opportunities.',
  sendRequest: 'Send request to the cm',
  sendingRequest: 'Sending request…',
  requestSentTitle: 'Request sent',
  requestSentMessage: 'The cm is preparing the virtual employee draft. You can follow its situation in the workspace or request history.',
  requestedOn: 'Requested on',
  requestedBy: 'Requested by',
  whoItTalksTo: 'Who it talks to',
  responsiblePerson: 'Responsible person',
  on: 'On',
  off: 'Off',
  overview: 'Overview',
  activity: 'Activity',
  simulation: 'Simulation',
  behavior: 'Behavior',
  tools: 'Tools',
  configuration: 'Configuration',
  myConduct: 'My conduct',
  reviewDraft: 'Review draft',
  suggestedTools: 'Suggested tools',
  reasonForRefusal: 'Reason for refusal',
  preparing: 'Preparing',
  ready: 'Ready for review',
  refused: 'Refused',
  activated: 'Activated',
  discarded: 'Discarded',
  notAvailable: 'Not available',
  loadErrorFallback: 'Virtual employees could not be loaded.',
  agentsErrorFallback: 'The agent collection could not be loaded.',
  requestsErrorFallback: 'Request history could not be loaded.',
  requestErrorFallback: 'The request could not be sent.',
  descriptionRequired: 'Description of the new agent is required.',
  tryAgain: 'Try again',
  loadMore: 'Load more',
  actions: 'Actions'
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = { en: pageMessage_en };
/// **collab_i18n_end**

type Situation = DraftInboxItem['situation'];
const SITUATION_KEY: Record<Situation, keyof PageMessageType> = {
  preparing: 'preparing',
  ready: 'ready',
  refused: 'refused',
  activated: 'activated',
  discarded: 'discarded'
};

function formatDate(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat(document.documentElement.lang || undefined, { dateStyle: 'medium', timeStyle: value.includes('T') ? 'short' : undefined }).format(date);
}

function errorMessage(error: ErrorState, fallback: string, required: string) {
  if (!error) return '';
  if (error.message) return error.message;
  return error.code === 'client.requiredMissing' ? required : fallback;
}

function agentName(entry: AgentsCollectionEntry) {
  return entry.agent?.name ?? entry.draft?.name ?? '';
}

@customElement('agents--web--desktop--page11--agents-102047')
export class AgentsDesktopPage11AgentsPage extends AgentsAgentsShared {
  private msg: PageMessageType = pageMessage_en;

  private renderInboxRow(item: DraftInboxItem) {
    return html`
      <Row>
        <Cell>
          <div class="font-semibold text-[var(--text-strong,currentColor)]">@${item.name}</div>
          <div class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${item.summary ?? item.prompt}</div>
        </Cell>
        <Cell>
          <span class="rounded-full bg-[var(--status-info-bg,transparent)] px-2 py-1 text-xs font-medium text-[var(--status-info-text,currentColor)]">${this.msg[SITUATION_KEY[item.situation]]}</span>
        </Cell>
        <Cell>
          <div class="text-sm text-[var(--text-muted,currentColor)]">${formatDate(item.requestedAt, this.msg.notAvailable)}</div>
        </Cell>
        <Cell>
          ${item.situation === 'ready' ? html`
            <grouptriggeraction--ml-button-standard data-variant="primary" size="sm" @action=${() => this.openDraftReview(item.name)}>
              <Label>${this.msg.reviewDraft}</Label>
            </grouptriggeraction--ml-button-standard>
          ` : ''}
        </Cell>
      </Row>`;
  }

  private renderAgentRow(entry: AgentsCollectionEntry) {
    const agent = entry.agent;
    const draft = entry.draft;
    const name = agentName(entry);
    return html`
      <TableRow key=${name}>
        <TableCell><span class="font-semibold text-[var(--text-strong,currentColor)]">@${name}</span></TableCell>
        <TableCell>${agent ? agent.talksTo ?? this.msg.notAvailable : this.msg.notAvailable}</TableCell>
        <TableCell>
          ${agent ? html`<span class="rounded-full px-2 py-1 text-xs font-medium ${agent.isOn ? 'bg-[var(--status-success-bg,transparent)] text-[var(--status-success-text,currentColor)]' : 'bg-[var(--status-neutral-bg,transparent)] text-[var(--status-neutral-text,currentColor)]'}">${agent.isOn ? this.msg.on : this.msg.off}</span>` : html`<span class="rounded-full bg-[var(--status-info-bg,transparent)] px-2 py-1 text-xs font-medium text-[var(--status-info-text,currentColor)]">${this.msg[SITUATION_KEY[draft!.situation]]}</span>`}
        </TableCell>
        <TableCell>${agent?.responsibleName ?? (draft?.refusalReason ?? this.msg.notAvailable)}</TableCell>
        <TableCell>
          <div class="flex flex-wrap gap-2">
            ${agent ? html`
              <grouptriggeraction--ml-button-standard data-variant="secondary" size="xs" @action=${() => this.openAgentOverview(agent.name)}><Label>${this.msg.overview}</Label></grouptriggeraction--ml-button-standard>
              <grouptriggeraction--ml-button-standard data-variant="ghost" size="xs" @action=${() => this.openAgentActivity(agent.name)}><Label>${this.msg.activity}</Label></grouptriggeraction--ml-button-standard>
              <grouptriggeraction--ml-button-standard data-variant="ghost" size="xs" @action=${() => this.openAgentSimulation(agent.name)}><Label>${this.msg.simulation}</Label></grouptriggeraction--ml-button-standard>
              <grouptriggeraction--ml-button-standard data-variant="ghost" size="xs" @action=${() => this.openAgentBehavior(agent.name)}><Label>${this.msg.behavior}</Label></grouptriggeraction--ml-button-standard>
              <grouptriggeraction--ml-button-standard data-variant="ghost" size="xs" @action=${() => this.openAgentTools(agent.name)}><Label>${this.msg.tools}</Label></grouptriggeraction--ml-button-standard>
              <grouptriggeraction--ml-button-standard data-variant="ghost" size="xs" @action=${() => this.openAgentConfiguration(agent.name)}><Label>${this.msg.configuration}</Label></grouptriggeraction--ml-button-standard>
              <grouptriggeraction--ml-button-standard data-variant="ghost" size="xs" @action=${() => this.openMyConduct(agent.name)}><Label>${this.msg.myConduct}</Label></grouptriggeraction--ml-button-standard>
            ` : draft?.situation === 'ready' ? html`
              <grouptriggeraction--ml-button-standard data-variant="primary" size="xs" @action=${() => this.openReadyDraft(draft.name)}><Label>${this.msg.reviewDraft}</Label></grouptriggeraction--ml-button-standard>
            ` : ''}
          </div>
        </TableCell>
      </TableRow>`;
  }

  private renderRequestRow(request: RequestEvent) {
    return html`
      <Row>
        <Cell>
          <div class="font-semibold text-[var(--text-strong,currentColor)]">@${request.name}</div>
          <div class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${formatDate(request.requestedAt, this.msg.notAvailable)}</div>
        </Cell>
        <Cell><span class="rounded-full bg-[var(--status-info-bg,transparent)] px-2 py-1 text-xs font-medium text-[var(--status-info-text,currentColor)]">${this.msg[SITUATION_KEY[request.situation]]}</span></Cell>
        <Cell>
          ${request.suggestedTools?.length ? html`<div class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.suggestedTools}: ${request.suggestedTools.join(', ')}</div>` : ''}
          ${request.refusalReason ? html`
            <groupexpandcontent--ml-readmore-expand .multiple=${true}>
              <Section title=${this.msg.reasonForRefusal}>${request.refusalReason}</Section>
            </groupexpandcontent--ml-readmore-expand>
          ` : ''}
        </Cell>
        <Cell>
          ${request.situation === 'ready' ? html`<grouptriggeraction--ml-button-standard data-variant="secondary" size="sm" @action=${() => this.openDraftFromHistory(request.name)}><Label>${this.msg.reviewDraft}</Label></grouptriggeraction--ml-button-standard>` : ''}
        </Cell>
      </Row>`;
  }

  private renderWorkspace() {
    const loading = this.loadAgentsPageStatus === 'loading' || this.pageStatus === 'loading';
    const pageError = errorMessage(this.loadAgentsPageError, this.msg.loadErrorFallback, this.msg.loadErrorFallback);
    const agentsError = errorMessage(this.listAgentsCollectionError, this.msg.agentsErrorFallback, this.msg.agentsErrorFallback);
    return html`
      <div class="space-y-8">
        ${pageError ? html`<div class="flex items-center justify-between gap-4 rounded-lg border border-[var(--status-error-text,currentColor)] bg-[var(--status-error-bg,transparent)] p-4 text-[var(--status-error-text,currentColor)]" role="alert"><span>${pageError}</span><grouptriggeraction--ml-button-standard data-variant="secondary" size="sm" @action=${() => this.loadAgentsPage()}><Label>${this.msg.tryAgain}</Label></grouptriggeraction--ml-button-standard></div>` : ''}
        <section data-organism-id="draftsInbox" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-6">
          <div class="mb-4"><h2 class="text-lg font-semibold text-[var(--text-strong,currentColor)]">${this.msg.reviewQueue}</h2><p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${this.msg.reviewQueueHint}</p></div>
          <groupviewdata--ml-vertical-record-list .loading=${loading} .hoverable=${true}>
            <Columns><Column field="name" header=${this.msg.name}></Column><Column field="situation" header=${this.msg.situation}></Column><Column field="requestedOn" header=${this.msg.requestedOn}></Column><Column field="actions" header=${this.msg.actions}></Column></Columns>
            <Rows>${this.inbox.map((item) => this.renderInboxRow(item))}</Rows>
            <Loading><div class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loading}</div></Loading>
            <Empty><div class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.noInbox}</div></Empty>
          </groupviewdata--ml-vertical-record-list>
        </section>
        <section data-organism-id="agentsList" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-6">
          <div class="mb-4 flex items-start justify-between gap-4"><div><h2 class="text-lg font-semibold text-[var(--text-strong,currentColor)]">${this.msg.agentsCollection}</h2><p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${this.msg.agentsCollectionHint}</p></div><grouptriggeraction--ml-button-standard data-variant="primary" size="sm" @action=${() => this.setScenario('new-request')}><Label>${this.msg.requestAgent}</Label></grouptriggeraction--ml-button-standard></div>
          ${agentsError ? html`<div class="mb-4 text-sm text-[var(--status-error-text,currentColor)]" role="alert">${agentsError}</div>` : ''}
          <groupviewtable--ml-advanced-data-table .page=${this.agents?.page ?? 1} .pageSize=${this.agents?.pageSize ?? 0} .totalItems=${0} .value=${''} .loading=${loading || this.listAgentsCollectionStatus === 'loading'}>
            <TableHeader><TableRow><TableHead key="name">${this.msg.name}</TableHead><TableHead key="talksTo">${this.msg.whoItTalksTo}</TableHead><TableHead key="situation">${this.msg.situation}</TableHead><TableHead key="responsible">${this.msg.responsiblePerson}</TableHead><TableHead key="actions">${this.msg.actions}</TableHead></TableRow></TableHeader>
            <TableBody>${(this.agents?.items ?? []).map((entry) => this.renderAgentRow(entry))}</TableBody>
            <Loading><div class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loading}</div></Loading>
            <Empty><div class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.noAgents}</div></Empty>
          </groupviewtable--ml-advanced-data-table>
          ${this.agents?.hasMore ? html`<div class="mt-4"><grouptriggeraction--ml-button-standard data-variant="secondary" size="sm" .loading=${this.listAgentsCollectionStatus === 'loading'} @action=${() => this.listAgentsCollection((this.agents?.page ?? 0) + 1, true)}><Label>${this.msg.loadMore}</Label></grouptriggeraction--ml-button-standard></div>` : ''}
        </section>
        <div class="flex justify-end"><grouptriggeraction--ml-button-standard data-variant="ghost" size="sm" @action=${() => this.setScenario('request-history')}><Label>${this.msg.viewRequestHistory}</Label></grouptriggeraction--ml-button-standard></div>
      </div>`;
  }

  private renderNewRequest() {
    const sending = this.sendNewAgentRequestStatus === 'loading';
    const error = errorMessage(this.sendNewAgentRequestError, this.msg.requestErrorFallback, this.msg.descriptionRequired);
    return html`<section data-organism-id="newAgentForm" class="mx-auto max-w-3xl rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-8">
      <p class="mb-6 text-sm text-[var(--text-muted,currentColor)]">${this.msg.descriptionHint}</p>
      <groupentertext--ml-multiline-text .value=${this.sendNewAgentRequestDraft.prompt ?? ''} .error=${error} name="prompt" placeholder=${this.msg.descriptionPlaceholder} .rows=${7} .required=${true} .disabled=${sending} @input=${(e: CustomEvent<{ value: string }>) => this.setSendNewAgentRequestDraft({ prompt: e.detail.value || null })}>
        <Label>${this.msg.description}</Label>
      </groupentertext--ml-multiline-text>
      <div class="mt-6 flex items-center justify-between gap-4">
        <grouptriggeraction--ml-button-standard data-variant="secondary" size="md" @action=${() => this.setScenario('workspace')}><Label>${this.msg.backToWorkspace}</Label></grouptriggeraction--ml-button-standard>
        <grouptriggeraction--ml-button-standard data-variant="primary" size="md" .disabled=${!this.sendNewAgentRequestDraft.prompt || sending} .loading=${sending} @action=${() => this.sendNewAgentRequest()}><Label>${sending ? this.msg.sendingRequest : this.msg.sendRequest}</Label></grouptriggeraction--ml-button-standard>
      </div>
      <groupnotifyuser--ml-contextual-feedback type="success" .visible=${this.sendNewAgentRequestStatus === 'success'} .dismissible=${false}>
        <Title>${this.msg.requestSentTitle}</Title><Message>${this.msg.requestSentMessage}</Message>
      </groupnotifyuser--ml-contextual-feedback>
    </section>`;
  }

  private renderHistory() {
    const error = errorMessage(this.listRequestHistoryError, this.msg.requestsErrorFallback, this.msg.requestsErrorFallback);
    return html`<section data-organism-id="requestTimeline" class="rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-6">
      ${error ? html`<div class="mb-4 text-sm text-[var(--status-error-text,currentColor)]" role="alert">${error}</div>` : ''}
      <groupviewdata--ml-timeline-view .loading=${this.listRequestHistoryStatus === 'loading'} .hoverable=${true}>
        <Columns><Column field="request" header=${this.msg.name}></Column><Column field="situation" header=${this.msg.situation}></Column><Column field="details" header=${this.msg.suggestedTools}></Column><Column field="actions" header=${this.msg.actions}></Column></Columns>
        <Rows>${(this.requests?.items ?? []).map((request) => this.renderRequestRow(request))}</Rows>
        <Loading><div class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingRequests}</div></Loading>
        <Empty><div class="py-8 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.noRequests}</div></Empty>
      </groupviewdata--ml-timeline-view>
      ${this.requests?.hasMore ? html`<div class="mt-5"><grouptriggeraction--ml-button-standard data-variant="secondary" size="sm" .loading=${this.listRequestHistoryStatus === 'loading'} @action=${() => this.listRequestHistory((this.requests?.page ?? 0) + 1, true)}><Label>${this.msg.loadMore}</Label></grouptriggeraction--ml-button-standard></div>` : ''}
    </section>`;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] p-8 text-[var(--text-default,currentColor)]">
        <div class="mx-auto max-w-7xl"><header class="mb-8"><h1 class="text-2xl font-semibold text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1></header>
          <molecules--ml-scenary-102020 mode="scenary" .value=${this.scenary || 'workspace'} backLabel=${this.msg.backToWorkspace} @change=${(e: CustomEvent<{ value: string }>) => { if (e.target === e.currentTarget) this.setScenario(e.detail.value); }}>
            <Scene value="workspace" title=${this.msg.workspaceTitle}>${this.renderWorkspace()}</Scene>
            <Scene value="new-request" title=${this.msg.newRequestTitle} nav="back" backTo="workspace">${this.renderNewRequest()}</Scene>
            <Scene value="request-history" title=${this.msg.historyTitle} nav="back" backTo="workspace">${this.renderHistory()}</Scene>
          </molecules--ml-scenary-102020>
        </div>
      </main>`;
  }
}
