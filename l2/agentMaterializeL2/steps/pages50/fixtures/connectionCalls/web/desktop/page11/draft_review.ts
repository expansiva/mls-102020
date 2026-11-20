/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/draft_review.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsDraft_reviewShared } from '/_102047_/l2/agents/web/shared/draft_review.js';
import type { DraftReview, DraftToolLine, ToolVerdict } from '/_102047_/l2/agents/web/shared/draft_review.js';
import '/_102020_/l2/molecules/ml-scenary.js';
import '/_102040_/l2/molecules/groupviewcard/ml-profile-card.js';
import '/_102040_/l2/molecules/groupexpandcontent/ml-collapsible-panel.js';
import '/_102040_/l2/molecules/groupselectmany/ml-multi-checkbox-list.js';
import '/_102040_/l2/molecules/groupselectone/ml-segmented-control.js';
import '/_102040_/l2/molecules/groupselectone/ml-combobox.js';
import '/_102040_/l2/molecules/groupentertext/ml-enter-text.js';
import '/_102040_/l2/molecules/groupentertext/ml-multiline-text.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
import '/_102040_/l2/molecules/groupviewdata/ml-vertical-record-list.js';
/// **collab_i18n_start**
const pageMessage_en = {
pageTitle: 'Agent drafts',
reviewTitle: 'Review proposal',
toolsTitle: 'Adjust tools',
simulateTitle: 'Try the draft',
backToReview: 'Back to review',
loadingDraft: 'Loading the draft…',
missingDraft: 'A draft reference is needed to open this review.',
returnToAgents: 'Return to agents',
reload: 'Try again',
nameLabel: 'Name',
whatItIs: 'What the agent is',
talksTo: 'Who it talks to',
onBehalfOf: 'On whose behalf it acts',
proposedBehavior: 'Proposed behavior',
originalDescription: 'Description of the new agent',
requestedBy: 'Requested by',
requestedOn: 'Requested on',
situation: 'Situation',
statusPreparing: 'Preparing',
statusReady: 'Ready for review',
statusRefused: 'Refused',
statusActivated: 'Activated',
statusDiscarded: 'Discarded',
noDetails: 'No details provided',
toolsIntro: 'Review each suggested action. Your choices will not be changed automatically.',
toolsLoading: 'Loading tools…',
noTools: 'There are no tool choices for this draft.',
removed: 'Removed from this release',
chosenByAdmin: 'Chosen by admin',
chosenAutomatically: 'Chosen automatically',
chosenOn: 'Chosen on',
saveToolChoices: 'Save tool choices',
savingToolChoices: 'Saving tool choices…',
toolChoicesSaved: 'Tool choices saved.',
noUnsavedChanges: 'No unsaved tool changes.',
simulateIntro: 'Test the draft safely before deciding. A simulation does not save anything.',
simulationLevel: 'What to try',
whatItCan: 'What it can do',
whatItUnderstands: 'What it understands',
simulateFor: 'Simulate for',
person: 'Person',
role: 'Role',
choosePerson: 'Choose an active person',
roleName: 'Role',
rolePlaceholder: 'Enter a role name',
sampleSentence: 'Sample request',
sentencePlaceholder: 'Type a request the agent might receive',
runSimulation: 'Run simulation',
runningSimulation: 'Running simulation…',
simulationRequired: 'Choose what to try and complete the required details.',
peopleLoading: 'Finding people…',
noPeople: 'No active people found.',
results: 'Simulation results',
noResults: 'Run a simulation to see its result here.',
module: 'Module',
subject: 'Subject',
action: 'Action',
canBeUsed: 'Can be used',
why: 'Why',
yes: 'Yes',
no: 'No',
allowed: 'Allowed',
restrictedForPerson: 'Restricted for this person',
notPermittedForRole: 'Not permitted for this role',
removedFromRelease: 'Removed from this release',
asksForAction: 'Asks for an action',
actions: 'Actions',
explanation: 'Explanation',
noActions: 'No actions identified.',
activateAgent: 'Activate agent',
activatingAgent: 'Activating agent…',
discardDraft: 'Discard draft',
discardingDraft: 'Discarding draft…',
activatedSuccess: 'The agent is active and ready to work.',
discardedSuccess: 'The draft has been discarded.',
readyOnly: 'This draft can be activated or discarded when it is ready.',
requiredFields: 'Complete the required fields.',
commandFailed: 'We could not complete that action. Try again.',
searchFailed: 'We could not find people. Try again.',
simulationFailed: 'We could not run the simulation. Try again.',
loadFailed: 'We could not load this draft. Try again.'
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = { 'en': pageMessage_en };
/// **collab_i18n_end**
const SITUATION_KEY: Record<DraftReview['situation'], keyof PageMessageType> = {
preparing: 'statusPreparing',
ready: 'statusReady',
refused: 'statusRefused',
activated: 'statusActivated',
discarded: 'statusDiscarded'
};
const VERDICT_KEY: Record<ToolVerdict['reason'], keyof PageMessageType> = {
allowed: 'allowed',
restrictedForPerson: 'restrictedForPerson',
notPermittedForRole: 'notPermittedForRole',
removedFromRelease: 'removedFromRelease'
};
function errorText(error: { message: string } | null, fallback: string) {
return error?.message || fallback;
}
function formatDate(value: string) {
return new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
dateStyle: 'medium',
timeStyle: 'short'
}).format(new Date(value));
}
function moduleGroups(tools: DraftToolLine[]) {
return tools.reduce((groups: { title: string; rows: DraftToolLine[] }[], tool) => {
const title = tool.tool.details.moduleTitle;
const group = groups.find((item) => item.title === title);
if (group) group.rows.push(tool);
else groups.push({ title, rows: [tool] });
return groups;
}, []);
}
@customElement('agents--web--desktop--page11--draft_review-102047')
export class AgentsDesktopPage11Draft_reviewPage extends AgentsDraft_reviewShared {
private msg: PageMessageType = pageMessage_en;
renderSummary() {
const draft = this.draft;
if (!draft) return html``;
return html`
<section data-organism-id="draftSummary">
<groupviewcard--ml-profile-card data-class="block w-full" ?loading=${this.getDraftReviewStatus === 'loading'}>
<CardHeader>
<CardTitle data-class="text-[var(--text-strong,currentColor)]">@${draft.name}</CardTitle>
<CardDescription data-class="text-[var(--text-muted,currentColor)]">${this.msg[SITUATION_KEY[draft.situation]]}</CardDescription>
</CardHeader>
<CardContent>
<dl class="grid grid-cols-2 gap-x-8 gap-y-5 py-2">
<div><dt class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted,currentColor)]">${this.msg.whatItIs}</dt><dd class="mt-1 text-[var(--text-default,currentColor)]">${draft.summary || this.msg.noDetails}</dd></div>
<div><dt class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted,currentColor)]">${this.msg.talksTo}</dt><dd class="mt-1 text-[var(--text-default,currentColor)]">${draft.audience || this.msg.noDetails}</dd></div>
<div><dt class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted,currentColor)]">${this.msg.onBehalfOf}</dt><dd class="mt-1 text-[var(--text-default,currentColor)]">${draft.onBehalfOf || this.msg.noDetails}</dd></div>
<div><dt class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted,currentColor)]">${this.msg.proposedBehavior}</dt><dd class="mt-1 text-[var(--text-default,currentColor)]">${draft.proposedBehavior || this.msg.noDetails}</dd></div>
<div class="col-span-2 border-t border-[var(--border-subtle,currentColor)] pt-5"><dt class="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted,currentColor)]">${this.msg.originalDescription}</dt><dd class="mt-1 whitespace-pre-wrap text-[var(--text-default,currentColor)]">${draft.prompt}</dd></div>
</dl>
</CardContent>
<CardFooter>
<div class="flex gap-6 text-sm text-[var(--text-muted,currentColor)]">
${draft.requestedBy ? html`<span>${this.msg.requestedBy}: ${draft.requestedBy}</span>` : html``}
${draft.requestedAt ? html`<span>${this.msg.requestedOn}: ${formatDate(draft.requestedAt)}</span>` : html``}
</div>
</CardFooter>
</groupviewcard--ml-profile-card>
</section>`;
}
renderTools() {
const selected = this.tools.filter((tool) => tool.enabled).map((tool) => tool.id).join(',');
const saving = this.saveDraftToolsStatus === 'loading';
return html`
<section data-organism-id="draftTools" class="space-y-5">
<p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.toolsIntro}</p>
${this.saveDraftToolsStatus === 'error' ? html`<p aria-live="polite" class="rounded-md bg-[var(--status-error-bg,transparent)] px-4 py-3 text-sm text-[var(--status-error-text,currentColor)]">${errorText(this.saveDraftToolsError, this.msg.commandFailed)}</p>` : html``}
${this.saveDraftToolsStatus === 'success' ? html`<p aria-live="polite" class="rounded-md bg-[var(--status-success-bg,transparent)] px-4 py-3 text-sm text-[var(--status-success-text,currentColor)]">${this.msg.toolChoicesSaved}</p>` : html``}
<groupexpandcontent--ml-collapsible-panel .multiple=${true} ?loading=${this.getDraftReviewStatus === 'loading'}>
${moduleGroups(this.tools).map((group, groupIndex) => html`
<Section title=${group.title} ?expanded=${groupIndex === 0}>
<groupselectmany--ml-multi-checkbox-list
data-class="w-full py-3"
.value=${selected}
.name=${'tools'}
.searchable=${true}
?disabled=${saving}
@change=${(e: CustomEvent<{ value: string }>) => {
const next = e.detail.value.split(',').filter(Boolean);
this.tools.forEach((tool) => this.setDraftToolEnabled(tool.id, next.includes(tool.id)));
}}>
${group.rows.reduce((subjects: { title: string; rows: DraftToolLine[] }[], tool) => {
const found = subjects.find((subject) => subject.title === tool.tool.details.subjectTitle);
if (found) found.rows.push(tool);
else subjects.push({ title: tool.tool.details.subjectTitle, rows: [tool] });
return subjects;
}, []).map((subject) => html`
<Group label=${subject.title}>
${subject.rows.map((tool) => html`
<Item value=${tool.id} ?disabled=${tool.details.toolRemoved || tool.tool.status === 'removed'}>
<span class="font-medium">${tool.details.toolName || tool.tool.name}</span>
<span class="block text-sm text-[var(--text-muted,currentColor)]">${tool.tool.details.description}</span>
<span class="mt-1 block text-xs text-[var(--text-muted,currentColor)]">
${tool.details.toolRemoved || tool.tool.status === 'removed' ? this.msg.removed : tool.choiceSource === 'admin' ? this.msg.chosenByAdmin : this.msg.chosenAutomatically}
· ${this.msg.chosenOn} ${formatDate(tool.details.decidedAt)}
</span>
</Item>`)}
</Group>`)}
</groupselectmany--ml-multi-checkbox-list>
</Section>`)}
</groupexpandcontent--ml-collapsible-panel>
${this.pageStatus === 'empty' ? html`<p class="rounded-md border border-[var(--border-subtle,currentColor)] px-4 py-6 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.noTools}</p>` : html``}
<div class="flex items-center gap-4 border-t border-[var(--border-subtle,currentColor)] pt-5">
<grouptriggeraction--ml-button-standard data-variant="primary" ?disabled=${this.saveDraftToolsDraft.changes.length === 0} ?loading=${saving} @action=${() => this.saveDraftTools()}><Label>${this.msg.saveToolChoices}</Label></grouptriggeraction--ml-button-standard>
${this.saveDraftToolsDraft.changes.length === 0 ? html`<span class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.noUnsavedChanges}</span>` : html``}
</div>
</section>`;
}
renderSimulation() {
const draft = this.simulateDraftDraft;
const canRun = draft.level === 'whatItUnderstands' ? !!draft.sentence : !!draft.level && !!draft.subjectKind && (draft.subjectKind === 'person' ? !!draft.person : !!draft.roleName);
const simulation = this.simulation;
return html`
<section data-organism-id="draftSimulation" class="grid grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)] gap-8">
<div class="rounded-lg border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-6">
<p class="mb-6 text-sm text-[var(--text-muted,currentColor)]">${this.msg.simulateIntro}</p>
<div class="space-y-5">
<groupselectone--ml-segmented-control .value=${draft.level} .name=${'level'} @change=${(e: CustomEvent<{ value: string | null }>) => this.setSimulateDraftDraft({ ...draft, level: e.detail.value as 'whatItCan' | 'whatItUnderstands' | null })}>
<Label>${this.msg.simulationLevel}</Label><Item value="whatItCan">${this.msg.whatItCan}</Item><Item value="whatItUnderstands">${this.msg.whatItUnderstands}</Item>
</groupselectone--ml-segmented-control>
${draft.level === 'whatItCan' ? html`
<groupselectone--ml-segmented-control .value=${draft.subjectKind} .name=${'subjectKind'} @change=${(e: CustomEvent<{ value: string | null }>) => this.setSimulateDraftDraft({ ...draft, subjectKind: e.detail.value as 'person' | 'role' | null })}>
<Label>${this.msg.simulateFor}</Label><Item value="person">${this.msg.person}</Item><Item value="role">${this.msg.role}</Item>
</groupselectone--ml-segmented-control>
${draft.subjectKind === 'person' ? html`
<groupselectone--ml-combobox .value=${draft.person} .name=${'person'} .placeholder=${this.msg.choosePerson} ?loading=${this.searchSimulationPeopleStatus === 'loading'} ?clearable=${true} @input=${(e: CustomEvent<{ value: string }>) => this.searchSimulationPeople(e.detail.value || null)} @change=${(e: CustomEvent<{ value: string | null }>) => this.setSimulateDraftDraft({ ...draft, person: e.detail.value })}>
<Label>${this.msg.person}</Label>
${(this.people?.items || []).map((person) => html`<Item value=${person.personRef}>${person.details.identification.name}</Item>`)}
<Empty>${this.searchSimulationPeopleStatus === 'loading' ? this.msg.peopleLoading : this.msg.noPeople}</Empty>
</groupselectone--ml-combobox>` : html``}
${draft.subjectKind === 'role' ? html`<groupentertext--ml-enter-text .value=${draft.roleName || ''} .name=${'roleName'} .placeholder=${this.msg.rolePlaceholder} @input=${(e: CustomEvent<{ value: string }>) => this.setSimulateDraftDraft({ ...draft, roleName: e.detail.value || null })}><Label>${this.msg.roleName}</Label></groupentertext--ml-enter-text>` : html``}` : html``}
${draft.level === 'whatItUnderstands' ? html`<groupentertext--ml-multiline-text .value=${draft.sentence || ''} .name=${'sentence'} .rows=${4} .placeholder=${this.msg.sentencePlaceholder} @input=${(e: CustomEvent<{ value: string }>) => this.setSimulateDraftDraft({ ...draft, sentence: e.detail.value || null })}><Label>${this.msg.sampleSentence}</Label></groupentertext--ml-multiline-text>` : html``}
${this.simulateDraftStatus === 'error' ? html`<p aria-live="polite" class="text-sm text-[var(--status-error-text,currentColor)]">${errorText(this.simulateDraftError, this.msg.simulationFailed)}</p>` : html``}
<grouptriggeraction--ml-button-standard data-variant="secondary" ?disabled=${!canRun} ?loading=${this.simulateDraftStatus === 'loading'} @action=${() => this.simulateDraft()}><Label>${this.msg.runSimulation}</Label></grouptriggeraction--ml-button-standard>
</div>
</div>
<div class="rounded-lg border border-[var(--border-default,currentColor)] bg-[var(--surface-alt-bg,transparent)] p-6">
<h2 class="text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.results}</h2>
${simulation?.level === 'whatItCan' ? html`<groupviewdata--ml-vertical-record-list data-class="mt-4" .hoverable=${false}><Columns><Column field="action" header=${this.msg.action}></Column><Column field="available" header=${this.msg.canBeUsed}></Column><Column field="why" header=${this.msg.why}></Column></Columns><Rows>${(simulation.toolVerdicts || []).map((verdict) => html`<Row><Cell><strong>${verdict.actionName}</strong><span class="block text-xs text-[var(--text-muted,currentColor)]">${verdict.moduleName} · ${verdict.subjectName}</span></Cell><Cell>${verdict.canUse ? this.msg.yes : this.msg.no}</Cell><Cell>${verdict.reasonText || this.msg[VERDICT_KEY[verdict.reason]]}</Cell></Row>`)}</Rows><Empty>${this.msg.noResults}</Empty></groupviewdata--ml-vertical-record-list>` : html``}
${simulation?.level === 'whatItUnderstands' && simulation.understanding ? html`<dl class="mt-5 space-y-4 text-sm"><div><dt class="font-medium text-[var(--text-strong,currentColor)]">${this.msg.asksForAction}</dt><dd class="mt-1 text-[var(--text-default,currentColor)]">${simulation.understanding.asksForAction ? this.msg.yes : this.msg.no}</dd></div>${simulation.understanding.moduleName ? html`<div><dt class="font-medium text-[var(--text-strong,currentColor)]">${this.msg.module}</dt><dd class="mt-1">${simulation.understanding.moduleName}</dd></div>` : html``}${simulation.understanding.subjectName ? html`<div><dt class="font-medium text-[var(--text-strong,currentColor)]">${this.msg.subject}</dt><dd class="mt-1">${simulation.understanding.subjectName}</dd></div>` : html``}<div><dt class="font-medium text-[var(--text-strong,currentColor)]">${this.msg.actions}</dt><dd class="mt-1">${simulation.understanding.actions.length ? simulation.understanding.actions.map((action) => action.actionName).join(', ') : this.msg.noActions}</dd></div>${simulation.understanding.explanation ? html`<div><dt class="font-medium text-[var(--text-strong,currentColor)]">${this.msg.explanation}</dt><dd class="mt-1">${simulation.understanding.explanation}</dd></div>` : html``}</dl>` : html``}
${!simulation ? html`<p class="mt-4 text-sm text-[var(--text-muted,currentColor)]">${this.msg.noResults}</p>` : html``}
</div>
</section>`;
}
renderDecision() {
const ready = this.draft?.situation === 'ready';
return html`<section data-organism-id="draftDecision" class="mt-8 flex items-center justify-between border-t border-[var(--border-default,currentColor)] pt-6"><div>${!ready ? html`<p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.readyOnly}</p>` : html``}${this.activateDraftStatus === 'success' ? html`<p aria-live="polite" class="text-sm text-[var(--status-success-text,currentColor)]">${this.msg.activatedSuccess}</p>` : html``}${this.discardDraftStatus === 'success' ? html`<p aria-live="polite" class="text-sm text-[var(--status-success-text,currentColor)]">${this.msg.discardedSuccess}</p>` : html``}${this.activateDraftStatus === 'error' ? html`<p aria-live="polite" class="text-sm text-[var(--status-error-text,currentColor)]">${errorText(this.activateDraftError, this.msg.commandFailed)}</p>` : html``}${this.discardDraftStatus === 'error' ? html`<p aria-live="polite" class="text-sm text-[var(--status-error-text,currentColor)]">${errorText(this.discardDraftError, this.msg.commandFailed)}</p>` : html``}</div><div class="flex gap-3"><grouptriggeraction--ml-button-standard data-variant="danger" ?disabled=${!ready} ?loading=${this.discardDraftStatus === 'loading'} @action=${() => this.discardDraft()}><Label>${this.msg.discardDraft}</Label></grouptriggeraction--ml-button-standard><grouptriggeraction--ml-button-standard data-variant="primary" ?disabled=${!ready} ?loading=${this.activateDraftStatus === 'loading'} @action=${() => this.activateDraft()}><Label>${this.msg.activateAgent}</Label></grouptriggeraction--ml-button-standard></div></section>`;
}
render() {
this.msg = pageMessages[this.getMessageKey(pageMessages)];
const missing = !this.draftId && !this.agentDraftId;
return html`
<main class="min-h-full bg-[var(--page-bg,transparent)] px-10 py-8 text-[var(--text-default,currentColor)]">
<div class="mx-auto max-w-6xl"><header class="mb-7 flex items-center justify-between"><h1 class="text-2xl font-semibold text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1><grouptriggeraction--ml-button-standard data-variant="ghost" @action=${() => this.backToAgents()}><Label>${this.msg.returnToAgents}</Label></grouptriggeraction--ml-button-standard></header>
${missing ? html`<section class="rounded-lg border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-8"><p class="text-[var(--text-default,currentColor)]">${this.msg.missingDraft}</p><grouptriggeraction--ml-button-standard data-class="mt-5" data-variant="secondary" @action=${() => this.backToAgents()}><Label>${this.msg.returnToAgents}</Label></grouptriggeraction--ml-button-standard></section>` : html`
${this.getDraftReviewStatus === 'error' ? html`<section class="rounded-lg border border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] p-8"><p aria-live="polite">${errorText(this.getDraftReviewError, this.msg.loadFailed)}</p><grouptriggeraction--ml-button-standard data-class="mt-5" data-variant="secondary" @action=${() => this.getDraftReview()}><Label>${this.msg.reload}</Label></grouptriggeraction--ml-button-standard></section>` : html`
<molecules--ml-scenary-102020 mode="scenary" .value=${this.scenary || 'review'} .backLabel=${this.msg.backToReview} @change=${(e: CustomEvent<{ value: string }>) => { if (e.target === e.currentTarget) this.setScenario(e.detail.value); }}>
<Scene value="review" title=${this.msg.reviewTitle}>
${this.getDraftReviewStatus === 'loading' ? html`<p class="py-12 text-center text-sm text-[var(--text-muted,currentColor)]">${this.msg.loadingDraft}</p>` : html`<div class="space-y-6">${this.renderSummary()}<div class="flex gap-3"><grouptriggeraction--ml-button-standard data-variant="secondary" @action=${() => this.setScenario('tools')}><Label>${this.msg.toolsTitle}</Label></grouptriggeraction--ml-button-standard><grouptriggeraction--ml-button-standard data-variant="secondary" @action=${() => this.setScenario('simulate')}><Label>${this.msg.simulateTitle}</Label></grouptriggeraction--ml-button-standard></div>${this.renderDecision()}</div>`}
</Scene>
<Scene value="tools" title=${this.msg.toolsTitle} nav="back" backTo="review">${this.renderTools()}</Scene>
<Scene value="simulate" title=${this.msg.simulateTitle} nav="back" backTo="review">${this.renderSimulation()}</Scene>
</molecules--ml-scenary-102020>`}
`}
</div>
</main>`;
}
}
