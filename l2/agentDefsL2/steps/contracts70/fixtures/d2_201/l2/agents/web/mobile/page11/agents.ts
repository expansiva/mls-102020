/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/agents.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsAgentsShared } from '/_102047_/l2/agents/web/shared/agents.js';
import type { AgentsCollectionEntry, DraftInboxItem, RequestEvent } from '/_102047_/l2/agents/web/shared/agents.js';
import '/_102040_/l2/molecules/groupentertext/ml-multiline-text.js';
import '/_102040_/l2/molecules/groupexpandcontent/ml-readmore-expand.js';
import '/_102040_/l2/molecules/groupnotifyuser/ml-toast-notification.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
import '/_102040_/l2/molecules/groupviewdata/ml-timeline-view.js';
import '/_102040_/l2/molecules/groupviewdata/ml-vertical-record-list.js';
import '/_102040_/l2/molecules/groupviewtable/ml-responsive-table.js';

function formatDate(value: string | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusKey(situation: DraftInboxItem['situation']): keyof PageMessageType {
  const keys: Record<DraftInboxItem['situation'], keyof PageMessageType> = {
    preparing: 'statusPreparing',
    ready: 'statusReady',
    refused: 'statusRefused',
    activated: 'statusActivated',
    discarded: 'statusDiscarded',
  };
  return keys[situation];
}

function errorText(error: { message: string } | null, fallback: string): string {
  return error?.message || (error ? fallback : '');
}

/// **collab_i18n_start**
const pageMessage_en = {
  pageTitle: 'Agents',
  reviewQueueTitle: 'Ready for your review',
  reviewQueueDescription: 'Drafts prepared by the cm appear here first.',
  agentCollectionTitle: 'Agents and drafts',
  agentCollectionDescription: 'Open an agent workspace or review a ready draft.',
  name: 'Name',
  whoItTalksTo: 'Who it talks to',
  availability: 'Availability',
  responsiblePerson: 'Responsible person',
  situation: 'Situation',
  requestedOn: 'Requested on',
  statusPreparing: 'Preparing',
  statusReady: 'Ready for review',
  statusRefused: 'Refused',
  statusActivated: 'Activated',
  statusDiscarded: 'Discarded',
  on: 'On',
  off: 'Off',
  openReview: 'Review draft',
  openOverview: 'Overview',
  openActivity: 'Activity',
  openSimulation: 'Simulate',
  openBehavior: 'Behavior',
  openTools: 'Tools',
  openConfiguration: 'Configuration',
  openMyConduct: 'My conduct',
  agentsEmpty: 'No agents or drafts yet.',
  agentsLoading: 'Loading agents and drafts…',
  loadMoreAgents: 'Load more agents',
  newEmployeeTitle: 'Describe a new virtual employee',
  descriptionOfNewAgent: 'Description of the new agent',
  descriptionHelper: 'Describe what the agent should do and who it should help.',
  descriptionPlaceholder: 'For example, an agent that helps the support team prepare replies and routes follow-ups.',
  descriptionRequired: 'Enter a description of the new agent.',
  sendRequest: 'Send request to the cm',
  sendingRequest: 'Sending request…',
  requestSentTitle: 'Request sent',
  requestSentMessage: 'The cm is preparing the draft. You can follow its situation below.',
  requestHistoryTitle: 'Request history',
  requestHistoryDescription: 'Requests stay here as they are prepared, ready, or refused.',
  suggestedTools: 'Suggested tools',
  refusalReason: 'Reason for refusal',
  historyEmpty: 'No requests yet.',
  historyLoading: 'Loading request history…',
  loadMoreHistory: 'Load more history',
  pageLoading: 'Loading agents…',
  pageError: 'We could not load agents. Try again.',
  retry: 'Try again',
  agentsError: 'We could not load more agents.',
  historyError: 'We could not load more request history.',
  sendError: 'We could not send the request. Review the description and try again.',
  actions: 'Actions',
  draft: 'Draft',
  agent: 'Agent',
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = { 'en': pageMessage_en };
/// **collab_i18n_end**

@customElement('agents--web--mobile--page11--agents-102047')
export class AgentsMobilePage11AgentsPage extends AgentsAgentsShared {
  private msg: PageMessageType = pageMessage_en;

  private renderInboxRow(item: DraftInboxItem) {
    return html`
      <Row ?disabled=${item.situation !== 'ready'}>
        <Cell>
          <div class="font-semibold text-[var(--text-strong,currentColor)]">@${item.name}</div>
          ${item.summary ? html`<div class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${item.summary}</div>` : ''}
        </Cell>
        <Cell>
          <span class="text-sm font-medium text-[var(--status-info-text,currentColor)]">${this.msg[statusKey(item.situation)]}</span>
        </Cell>
        <Cell>
          ${item.requestedAt ? html`<div class="text-xs text-[var(--text-muted,currentColor)]">${formatDate(item.requestedAt)}</div>` : ''}
        </Cell>
      </Row>`;
  }

  private renderCollectionRow(entry: AgentsCollectionEntry) {
    if (entry.agent) {
      const agent = entry.agent;
      return html`
        <TableRow key=${agent.name}>
          <TableCell><div class="font-semibold text-[var(--text-strong,currentColor)]">@${agent.name}</div></TableCell>
          <TableCell>${agent.talksTo || '—'}</TableCell>
          <TableCell>${agent.isOn ? this.msg.on : this.msg.off}</TableCell>
          <TableCell>${agent.responsibleName || '—'}</TableCell>
          <TableCell>
            <div class="flex flex-wrap gap-2">
              <grouptriggeraction--ml-button-standard data-variant="secondary" size="sm" @action=${() => this.openAgentOverview(agent.name)}><Label>${this.msg.openOverview}</Label></grouptriggeraction--ml-button-standard>
              <grouptriggeraction--ml-button-standard data-variant="ghost" size="sm" @action=${() => this.openAgentActivity(agent.name)}><Label>${this.msg.openActivity}</Label></grouptriggeraction--ml-button-standard>
              <grouptriggeraction--ml-button-standard data-variant="ghost" size="sm" @action=${() => this.openAgentSimulation(agent.name)}><Label>${this.msg.openSimulation}</Label></grouptriggeraction--ml-button-standard>
              <grouptriggeraction--ml-button-standard data-variant="ghost" size="sm" @action=${() => this.openAgentBehavior(agent.name)}><Label>${this.msg.openBehavior}</Label></grouptriggeraction--ml-button-standard>
              <grouptriggeraction--ml-button-standard data-variant="ghost" size="sm" @action=${() => this.openAgentTools(agent.name)}><Label>${this.msg.openTools}</Label></grouptriggeraction--ml-button-standard>
              <grouptriggeraction--ml-button-standard data-variant="ghost" size="sm" @action=${() => this.openAgentConfiguration(agent.name)}><Label>${this.msg.openConfiguration}</Label></grouptriggeraction--ml-button-standard>
              <grouptriggeraction--ml-button-standard data-variant="ghost" size="sm" @action=${() => this.openMyConduct(agent.name)}><Label>${this.msg.openMyConduct}</Label></grouptriggeraction--ml-button-standard>
            </div>
          </TableCell>
        </TableRow>`;
    }
    const draft = entry.draft;
    if (!draft) return '';
    return html`
      <TableRow key=${draft.name}>
        <TableCell><div class="font-semibold text-[var(--text-strong,currentColor)]">@${draft.name}</div></TableCell>
        <TableCell>—</TableCell><TableCell>—</TableCell><TableCell>—</TableCell>
        <TableCell>
          <div class="space-y-2"><span class="text-sm font-medium text-[var(--status-info-text,currentColor)]">${this.msg[statusKey(draft.situation)]}</span>
          ${draft.situation === 'ready' ? html`<grouptriggeraction--ml-button-standard data-variant="secondary" size="sm" @action=${() => this.openReadyDraft(draft.name)}><Label>${this.msg.openReview}</Label></grouptriggeraction--ml-button-standard>` : ''}
          ${draft.situation === 'refused' && draft.refusalReason ? html`<div class="text-sm text-[var(--status-error-text,currentColor)]">${draft.refusalReason}</div>` : ''}</div>
        </TableCell>
      </TableRow>`;
  }

  private renderHistoryRow(event: RequestEvent) {
    return html`
      <Row>
        <Cell><div class="font-semibold text-[var(--text-strong,currentColor)]">@${event.name}</div></Cell>
        <Cell><span class="text-sm font-medium text-[var(--status-info-text,currentColor)]">${this.msg[statusKey(event.situation)]}</span></Cell>
        <Cell><div class="text-xs text-[var(--text-muted,currentColor)]">${formatDate(event.requestedAt)}</div></Cell>
        <Cell>${event.suggestedTools?.join(', ') || ''}</Cell>
      </Row>`;
  }

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const pageError = errorText(this.loadAgentsPageError, this.msg.pageError);
    const prompt = this.sendNewAgentRequestDraft.prompt || '';
    const promptError = this.sendNewAgentRequestError?.code === 'client.requiredMissing' ? this.msg.descriptionRequired : errorText(this.sendNewAgentRequestError, this.msg.sendError);
    const agents = this.agents;
    const requests = this.requests;
    return html`
      <main class="min-h-full bg-[var(--page-bg,transparent)] px-4 py-5 text-[var(--text-default,currentColor)]">
        <header class="mb-6"><h1 class="text-2xl font-bold tracking-tight text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1></header>
        ${this.pageStatus === 'loading' || this.loadAgentsPageStatus === 'loading' ? html`<p class="py-10 text-center text-sm text-[var(--text-muted,currentColor)]" aria-live="polite">${this.msg.pageLoading}</p>` : ''}
        ${pageError ? html`<section class="rounded-xl border border-[var(--status-error-text,currentColor)] bg-[var(--surface-bg,transparent)] p-4" aria-live="polite"><p>${pageError}</p><grouptriggeraction--ml-button-standard class="mt-3" data-variant="secondary" @action=${() => this.loadAgentsPage()}><Label>${this.msg.retry}</Label></grouptriggeraction--ml-button-standard></section>` : ''}
        ${!pageError && this.pageStatus !== 'loading' ? html`
          <section data-organism-id="draftsInbox" class="mb-7">
            <h2 class="text-lg font-bold text-[var(--text-strong,currentColor)]">${this.msg.reviewQueueTitle}</h2><p class="mt-1 mb-3 text-sm text-[var(--text-muted,currentColor)]">${this.msg.reviewQueueDescription}</p>
            <groupviewdata--ml-vertical-record-list .loading=${this.loadAgentsPageStatus === 'loading'} .hoverable=${true} @row-click=${(e: CustomEvent<{ index: number }>) => { const item = this.inbox[e.detail.index]; if (item?.situation === 'ready') this.openDraftReview(item.name); }}>
              <Columns><Column field="name" header="${this.msg.name}"></Column><Column field="situation" header="${this.msg.situation}"></Column><Column field="requested" header="${this.msg.requestedOn}"></Column></Columns>
              <Rows>${this.inbox.map((item) => this.renderInboxRow(item))}</Rows>
              <Empty><p class="py-6 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.historyEmpty}</p></Empty>
            </groupviewdata--ml-vertical-record-list>
          </section>
          <section data-organism-id="agentsList" class="mb-7">
            <h2 class="text-lg font-bold text-[var(--text-strong,currentColor)]">${this.msg.agentCollectionTitle}</h2><p class="mt-1 mb-3 text-sm text-[var(--text-muted,currentColor)]">${this.msg.agentCollectionDescription}</p>
            <groupviewtable--ml-responsive-table .page=${agents?.page || 1} .pageSize=${agents?.pageSize || 0} .totalItems=${agents?.items.length || 0} .loading=${this.listAgentsCollectionStatus === 'loading'} .error=${errorText(this.listAgentsCollectionError, this.msg.agentsError)} @rowClick=${(e: CustomEvent<{ index: number }>) => { const entry = agents?.items[e.detail.index]; if (entry?.agent) this.openAgentOverview(entry.agent.name); if (entry?.draft?.situation === 'ready') this.openReadyDraft(entry.draft.name); }}>
              <TableCaption>${this.msg.agentCollectionTitle}</TableCaption><TableHeader><TableRow><TableHead key="name">${this.msg.name}</TableHead><TableHead key="talksTo">${this.msg.whoItTalksTo}</TableHead><TableHead key="on">${this.msg.availability}</TableHead><TableHead key="responsible">${this.msg.responsiblePerson}</TableHead><TableHead key="actions">${this.msg.actions}</TableHead></TableRow></TableHeader>
              <TableBody>${agents?.items.map((entry) => this.renderCollectionRow(entry)) || ''}</TableBody><Empty>${this.msg.agentsEmpty}</Empty><Loading>${this.msg.agentsLoading}</Loading>
            </groupviewtable--ml-responsive-table>
            ${agents?.hasMore ? html`<grouptriggeraction--ml-button-standard class="mt-3" data-variant="secondary" ?loading=${this.listAgentsCollectionStatus === 'loading'} @action=${() => this.listAgentsCollection(agents.page + 1, true)}><Label>${this.msg.loadMoreAgents}</Label></grouptriggeraction--ml-button-standard>` : ''}
          </section>
          <section data-organism-id="newAgentForm" class="mb-7 rounded-xl border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-4">
            <h2 class="text-lg font-bold text-[var(--text-strong,currentColor)]">${this.msg.newEmployeeTitle}</h2>
            <groupentertext--ml-multiline-text class="mt-4" .value=${prompt} .error=${promptError} name="prompt" .rows=${5} .required=${true} .disabled=${this.sendNewAgentRequestStatus === 'loading'} placeholder=${this.msg.descriptionPlaceholder} @input=${(e: CustomEvent<{ value: string }>) => this.setSendNewAgentRequestDraft({ prompt: e.detail.value || null })}><Label>${this.msg.descriptionOfNewAgent}</Label><Helper>${this.msg.descriptionHelper}</Helper></groupentertext--ml-multiline-text>
            <grouptriggeraction--ml-button-standard class="mt-4" data-variant="primary" ?disabled=${!prompt.trim()} ?loading=${this.sendNewAgentRequestStatus === 'loading'} @action=${() => this.sendNewAgentRequest()}><Label>${this.sendNewAgentRequestStatus === 'loading' ? this.msg.sendingRequest : this.msg.sendRequest}</Label></grouptriggeraction--ml-button-standard>
            <groupnotifyuser--ml-toast-notification type="success" .visible=${this.sendNewAgentRequestStatus === 'success'} .dismissible=${false}><Title>${this.msg.requestSentTitle}</Title><Message>${this.msg.requestSentMessage}</Message></groupnotifyuser--ml-toast-notification>
          </section>
          <section data-organism-id="requestTimeline">
            <h2 class="text-lg font-bold text-[var(--text-strong,currentColor)]">${this.msg.requestHistoryTitle}</h2><p class="mt-1 mb-3 text-sm text-[var(--text-muted,currentColor)]">${this.msg.requestHistoryDescription}</p>
            <groupviewdata--ml-timeline-view .loading=${this.listRequestHistoryStatus === 'loading'} .hoverable=${true} @row-click=${(e: CustomEvent<{ index: number }>) => { const event = requests?.items[e.detail.index]; if (event?.situation === 'ready') this.openDraftFromHistory(event.name); }}><Columns><Column field="name" header="${this.msg.name}"></Column><Column field="situation" header="${this.msg.situation}"></Column><Column field="requested" header="${this.msg.requestedOn}"></Column><Column field="tools" header="${this.msg.suggestedTools}"></Column></Columns><Rows>${requests?.items.map((event) => this.renderHistoryRow(event)) || ''}</Rows><Empty>${this.msg.historyEmpty}</Empty><Loading>${this.msg.historyLoading}</Loading></groupviewdata--ml-timeline-view>
            ${requests?.items.filter((event) => event.situation === 'refused' && event.refusalReason).map((event) => html`<groupexpandcontent--ml-readmore-expand class="mt-3"><Section title="${this.msg.refusalReason}: @${event.name}">${event.refusalReason}</Section></groupexpandcontent--ml-readmore-expand>`)}
            ${requests?.hasMore ? html`<grouptriggeraction--ml-button-standard class="mt-3" data-variant="secondary" ?loading=${this.listRequestHistoryStatus === 'loading'} @action=${() => this.listRequestHistory(requests.page + 1, true)}><Label>${this.msg.loadMoreHistory}</Label></grouptriggeraction--ml-button-standard>` : ''}
          </section>
        ` : ''}
      </main>`;
  }
}
