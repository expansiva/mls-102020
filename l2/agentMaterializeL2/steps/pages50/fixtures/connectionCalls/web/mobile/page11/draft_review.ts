/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/draft_review.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsDraft_reviewShared } from '/_102047_/l2/agents/web/shared/draft_review.js';
import type { DraftToolLine, ErrorState, SimulateDraftDraft } from '/_102047_/l2/agents/web/shared/draft_review.js';
import '/_102040_/l2/molecules/groupviewcard/ml-vertical-card.js';
import '/_102040_/l2/molecules/groupexpandcontent/ml-accordion.js';
import '/_102040_/l2/molecules/groupselectmany/ml-multi-checkbox-list.js';
import '/_102040_/l2/molecules/groupselectone/ml-segmented-control.js';
import '/_102040_/l2/molecules/groupselectone/ml-radio-group.js';
import '/_102040_/l2/molecules/groupselectone/ml-select-one-autocomplete.js';
import '/_102040_/l2/molecules/groupentertext/ml-multiline-text.js';
import '/_102040_/l2/molecules/groupentertext/ml-enter-text.js';
import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
import '/_102040_/l2/molecules/groupviewdata/ml-vertical-record-list.js';
import '/_102020_/l2/molecules/ml-scenary.js';
/// **collab_i18n_start**
const pageMessage_en = {
reviewDraft: 'Review draft',
tryDraft: 'Try the draft',
backToReview: 'Back to review',
agentName: 'Name (@name)',
whatAgentIs: 'What the agent is',
talksTo: 'Who it talks to',
onBehalfOf: 'On whose behalf it acts',
proposedBehavior: 'Proposed behavior',
originalDescription: 'Description of the new agent',
requestedBy: 'Requested by',
requestedOn: 'Requested on',
situation: 'Situation',
preparing: 'Preparing',
ready: 'Ready for review',
refused: 'Refused',
activated: 'Activated',
discarded: 'Discarded',
suggestedTools: 'Suggested tools',
toolDescription: 'Description',
chosenBy: 'Chosen by',
chosenOn: 'Chosen on',
admin: 'Company admin',
automatic: 'Automatic choice',
removed: 'Removed from this release',
noTools: 'There are no suggested tools for this draft.',
saveToolChoices: 'Save tool choices',
savingToolChoices: 'Saving tool choices',
toolChoicesSaved: 'Tool choices saved.',
changeToolChoices: 'Changes are ready to save.',
tryBeforeActivate: 'Try the draft before activating',
simulationLevel: 'Simulation level',
whatItCan: 'What it can do',
whatItUnderstands: 'What it understands',
simulateFor: 'Simulate for',
person: 'Person',
role: 'Role',
choosePerson: 'Choose a person',
noPeople: 'No active people are available.',
loadPeople: 'Load people',
loadingPeople: 'Loading people',
roleName: 'Role',
rolePlaceholder: 'Enter a role name',
sampleSentence: 'Sample sentence',
sentencePlaceholder: 'Write a sample request for this agent',
runSimulation: 'Run simulation',
runningSimulation: 'Running simulation',
simulationDoesNotSave: 'This check is not saved.',
simulationResult: 'Simulation result',
agent: 'Agent',
tool: 'Tool',
canBeUsed: 'Can be used',
why: 'Why',
yes: 'Yes',
no: 'No',
action: 'Action',
asksForAction: 'Asks for an action',
module: 'Module',
subject: 'Subject',
actions: 'Actions',
explanation: 'Explanation',
noActions: 'No actions were identified.',
activateAgent: 'Activate agent',
activatingAgent: 'Activating agent',
agentActivated: 'The agent is activated.',
discardDraft: 'Discard draft',
discardingDraft: 'Discarding draft',
draftDiscarded: 'The draft is discarded.',
backToAgents: 'Back to Agents',
confirmDiscard: 'Discard this draft? It will no longer be ready for activation.',
requiredFields: 'Complete the required fields.',
missingDraft: 'This review needs a draft reference. Return to Agents and open the ready draft again.',
loadFailed: 'The draft could not be loaded.',
saveFailed: 'Tool choices could not be saved.',
simulationFailed: 'The simulation could not be run.',
activationFailed: 'The agent could not be activated.',
discardFailed: 'The draft could not be discarded.',
loadingDraft: 'Loading draft…',
noResult: 'Run a simulation to see its result.'
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = { 'en': pageMessage_en };
/// **collab_i18n_end**
type SituationValue = 'preparing' | 'ready' | 'refused' | 'activated' | 'discarded';
const situationKeys: Record<SituationValue, keyof PageMessageType> = {
preparing: 'preparing', ready: 'ready', refused: 'refused', activated: 'activated', discarded: 'discarded'
};
const situationKey = (value: SituationValue): keyof PageMessageType => situationKeys[value];
const formatDate = (value: string) => new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
dateStyle: 'medium', timeStyle: 'short'
}).format(new Date(value));
const errorText = (error: ErrorState, fallback: string, required: string) => {
if (!error) return '';
if (error.message) return error.message;
return error.code === 'client.requiredMissing' ? required : fallback;
};
const effectiveEnabled = (line: DraftToolLine, changes: { id: string | null; enabled: boolean | null }[]) => {
const pending = changes.find((change) => change.id === line.id);
return pending?.enabled ?? line.enabled;
};
const simulationReady = (draft: SimulateDraftDraft) => {
if (draft.level === 'whatItUnderstands') return Boolean(draft.sentence);
if (draft.level !== 'whatItCan' || !draft.subjectKind) return false;
return draft.subjectKind === 'person' ? Boolean(draft.person) : Boolean(draft.roleName);
};
@customElement('agents--web--mobile--page11--draft_review-102047')
export class AgentsMobilePage11Draft_reviewPage extends AgentsDraft_reviewShared {
private msg: PageMessageType = pageMessage_en;
renderError(error: ErrorState, fallback: string) {
const text = errorText(error, fallback, this.msg.requiredFields);
return text ? html`<p class="mt-3 text-sm text-[var(--status-error-text,currentColor)]" aria-live="polite">${text}</p>` : html``;
}
renderTool(line: DraftToolLine) {
const selected = effectiveEnabled(line, this.saveDraftToolsDraft.changes);
const title = `${line.tool.details.moduleTitle} · ${line.tool.details.subjectTitle}`;
return html`
<Section title=${title} ?disabled=${line.tool.status === 'removed' || line.details.toolRemoved}>
<div class="space-y-3 px-1 py-3">
<groupselectmany--ml-multi-checkbox-list
.value=${selected ? line.id : ''}
name="tool"
?disabled=${line.tool.status === 'removed' || line.details.toolRemoved || this.saveDraftToolsStatus === 'loading'}
@change=${(event: CustomEvent<{ value: string }>) => this.setDraftToolEnabled(line.id, event.detail.value === line.id)}>
<Label>${this.msg.tool}</Label>
<Item value=${line.id}>${line.details.toolName ?? line.tool.name}</Item>
</groupselectmany--ml-multi-checkbox-list>
<p class="text-sm text-[var(--text-muted,currentColor)]">${line.tool.details.description}</p>
${line.tool.status === 'removed' || line.details.toolRemoved ? html`<p class="text-sm font-medium text-[var(--status-warning-text,currentColor)]">${this.msg.removed}</p>` : html``}
<dl class="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-[var(--text-muted,currentColor)]">
<dt>${this.msg.chosenBy}</dt><dd class="text-right text-[var(--text-default,currentColor)]">${line.choiceSource === 'admin' ? this.msg.admin : this.msg.automatic}</dd>
<dt>${this.msg.chosenOn}</dt><dd class="text-right text-[var(--text-default,currentColor)]">${formatDate(line.details.decidedAt)}</dd>
</dl>
</div>
</Section>`;
}
renderReview() {
const draft = this.draft;
const isLoading = this.getDraftReviewStatus === 'loading' || this.pageStatus === 'loading';
const missingDraft = this.getDraftReviewError?.code === 'client.preconditionMissing';
if (missingDraft) return html`
<div class="px-4 py-8">
${this.renderError(this.getDraftReviewError, this.msg.missingDraft)}
<grouptriggeraction--ml-button-standard data-variant="secondary" size="lg" data-class="w-full mt-5" @action=${() => this.backToAgents()}><Label>${this.msg.backToAgents}</Label></grouptriggeraction--ml-button-standard>
</div>`;
return html`
<main class="min-h-full bg-[var(--page-bg,transparent)] px-4 py-4 pb-8">
${isLoading ? html`<p class="py-10 text-center text-sm text-[var(--text-muted,currentColor)]" aria-live="polite">${this.msg.loadingDraft}</p>` : html``}
${this.renderError(this.getDraftReviewError, this.msg.loadFailed)}
${draft ? html`
<section data-organism-id="draftSummary" class="space-y-4">
<groupviewcard--ml-vertical-card data-class="w-full">
<CardHeader>
<CardTitle>@${draft.name}</CardTitle>
<CardDescription>${draft.summary ?? ''}</CardDescription>
</CardHeader>
<CardContent>
<dl class="space-y-4 text-sm">
${draft.audience ? html`<div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.talksTo}</dt><dd class="mt-1 text-[var(--text-default,currentColor)]">${draft.audience}</dd></div>` : html``}
${draft.onBehalfOf ? html`<div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.onBehalfOf}</dt><dd class="mt-1 text-[var(--text-default,currentColor)]">${draft.onBehalfOf}</dd></div>` : html``}
${draft.proposedBehavior ? html`<div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.proposedBehavior}</dt><dd class="mt-1 whitespace-pre-wrap text-[var(--text-default,currentColor)]">${draft.proposedBehavior}</dd></div>` : html``}
<div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.originalDescription}</dt><dd class="mt-1 whitespace-pre-wrap text-[var(--text-default,currentColor)]">${draft.prompt}</dd></div>
</dl>
</CardContent>
<CardFooter>
<div class="space-y-1 text-xs text-[var(--text-muted,currentColor)]">
<p>${this.msg.situation}: ${this.msg[situationKey(draft.situation)]}</p>
${draft.requestedBy ? html`<p>${this.msg.requestedBy}: ${draft.requestedBy}</p>` : html``}
${draft.requestedAt ? html`<p>${this.msg.requestedOn}: ${formatDate(draft.requestedAt)}</p>` : html``}
</div>
</CardFooter>
</groupviewcard--ml-vertical-card>
</section>
<section data-organism-id="draftTools" class="mt-7 border-t border-[var(--border-subtle,currentColor)] pt-6">
<h2 class="text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.suggestedTools}</h2>
${this.tools.length ? html`
<groupexpandcontent--ml-accordion .multiple=${false} ?loading=${isLoading} data-class="mt-3 w-full">
${this.tools.map((line) => this.renderTool(line))}
</groupexpandcontent--ml-accordion>
${this.saveDraftToolsDraft.changes.length ? html`<p class="mt-3 text-sm text-[var(--status-info-text,currentColor)]" aria-live="polite">${this.msg.changeToolChoices}</p>` : html``}
${this.saveDraftToolsStatus === 'success' ? html`<p class="mt-3 text-sm text-[var(--status-success-text,currentColor)]" aria-live="polite">${this.msg.toolChoicesSaved}</p>` : html``}
${this.renderError(this.saveDraftToolsError, this.msg.saveFailed)}
<grouptriggeraction--ml-button-standard data-variant="secondary" size="lg" data-class="w-full mt-4" ?disabled=${this.saveDraftToolsDraft.changes.length === 0} ?loading=${this.saveDraftToolsStatus === 'loading'} @action=${() => this.saveDraftTools()}>
<Label>${this.saveDraftToolsStatus === 'loading' ? this.msg.savingToolChoices : this.msg.saveToolChoices}</Label>
</grouptriggeraction--ml-button-standard>` : html`<p class="mt-3 text-sm text-[var(--text-muted,currentColor)]">${this.msg.noTools}</p>`}
</section>
<section class="mt-7 border-t border-[var(--border-subtle,currentColor)] pt-6">
<h2 class="text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.tryBeforeActivate}</h2>
<p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${this.msg.simulationDoesNotSave}</p>
<grouptriggeraction--ml-button-standard data-variant="secondary" size="lg" data-class="w-full mt-4" @action=${() => this.setScenario('simulate')}><Label>${this.msg.tryDraft}</Label></grouptriggeraction--ml-button-standard>
</section>
<section data-organism-id="draftDecision" class="mt-7 border-t border-[var(--border-subtle,currentColor)] pt-6">
${this.activateDraftStatus === 'success' ? html`<p class="mb-3 text-sm text-[var(--status-success-text,currentColor)]" aria-live="polite">${this.msg.agentActivated}</p>` : html``}
${this.discardDraftStatus === 'success' ? html`<p class="mb-3 text-sm text-[var(--status-success-text,currentColor)]" aria-live="polite">${this.msg.draftDiscarded}</p>` : html``}
${this.renderError(this.activateDraftError, this.msg.activationFailed)}
${this.renderError(this.discardDraftError, this.msg.discardFailed)}
${draft.situation === 'ready' ? html`
<grouptriggeraction--ml-button-standard data-variant="primary" size="lg" data-class="w-full" ?loading=${this.activateDraftStatus === 'loading'} @action=${() => this.activateDraft()}><Label>${this.activateDraftStatus === 'loading' ? this.msg.activatingAgent : this.msg.activateAgent}</Label></grouptriggeraction--ml-button-standard>
<grouptriggeraction--ml-button-standard data-variant="danger" size="lg" data-class="w-full mt-3" ?loading=${this.discardDraftStatus === 'loading'} @action=${() => { if (window.confirm(this.msg.confirmDiscard)) this.discardDraft(); }}><Label>${this.discardDraftStatus === 'loading' ? this.msg.discardingDraft : this.msg.discardDraft}</Label></grouptriggeraction--ml-button-standard>` : html``}
<grouptriggeraction--ml-button-standard data-variant="ghost" size="lg" data-class="w-full mt-3" @action=${() => this.backToAgents()}><Label>${this.msg.backToAgents}</Label></grouptriggeraction--ml-button-standard>
</section>` : html``}
</main>`;
}
renderSimulation() {
const draft = this.simulateDraftDraft;
const result = this.simulation;
return html`
<main data-organism-id="draftSimulation" class="min-h-full bg-[var(--page-bg,transparent)] px-4 py-4 pb-8">
<p class="mb-5 text-sm text-[var(--text-muted,currentColor)]">${this.msg.simulationDoesNotSave}</p>
<div class="space-y-5">
<groupselectone--ml-segmented-control .value=${draft.level} name="level" required @change=${(event: CustomEvent<{ value: string | null }>) => this.setSimulateDraftDraft({ ...draft, level: event.detail.value === 'whatItCan' || event.detail.value === 'whatItUnderstands' ? event.detail.value : null })}>
<Label>${this.msg.simulationLevel}</Label><Item value="whatItCan">${this.msg.whatItCan}</Item><Item value="whatItUnderstands">${this.msg.whatItUnderstands}</Item>
</groupselectone--ml-segmented-control>
${draft.level === 'whatItCan' ? html`
<groupselectone--ml-radio-group .value=${draft.subjectKind} name="subjectKind" required @change=${(event: CustomEvent<{ value: string | null }>) => this.setSimulateDraftDraft({ ...draft, subjectKind: event.detail.value === 'person' || event.detail.value === 'role' ? event.detail.value : null })}>
<Label>${this.msg.simulateFor}</Label><Item value="person">${this.msg.person}</Item><Item value="role">${this.msg.role}</Item>
</groupselectone--ml-radio-group>
${draft.subjectKind === 'person' ? html`
<grouptriggeraction--ml-button-standard data-variant="secondary" size="md" data-class="w-full" ?loading=${this.searchSimulationPeopleStatus === 'loading'} @action=${() => this.searchSimulationPeople(null)}><Label>${this.searchSimulationPeopleStatus === 'loading' ? this.msg.loadingPeople : this.msg.loadPeople}</Label></grouptriggeraction--ml-button-standard>
<groupselectone--ml-select-one-autocomplete .value=${draft.person} name="person" placeholder=${this.msg.choosePerson} ?loading=${this.searchSimulationPeopleStatus === 'loading'} clearable @change=${(event: CustomEvent<{ value: string | null }>) => this.setSimulateDraftDraft({ ...draft, person: event.detail.value })}>
<Label>${this.msg.person}</Label>
${this.people?.items.map((person) => html`<Item value=${person.personRef}>${person.details.identification.name}</Item>`) ?? html``}
<Empty>${this.msg.noPeople}</Empty>
</groupselectone--ml-select-one-autocomplete>
${this.renderError(this.searchSimulationPeopleError, this.msg.noPeople)}` : html``}
${draft.subjectKind === 'role' ? html`<groupentertext--ml-enter-text .value=${draft.roleName ?? ''} name="roleName" placeholder=${this.msg.rolePlaceholder} required @input=${(event: CustomEvent<{ value: string }>) => this.setSimulateDraftDraft({ ...draft, roleName: event.detail.value || null })}><Label>${this.msg.roleName}</Label></groupentertext--ml-enter-text>` : html``}` : html``}
${draft.level === 'whatItUnderstands' ? html`<groupentertext--ml-multiline-text .value=${draft.sentence ?? ''} name="sentence" placeholder=${this.msg.sentencePlaceholder} .rows=${4} required @input=${(event: CustomEvent<{ value: string }>) => this.setSimulateDraftDraft({ ...draft, sentence: event.detail.value || null })}><Label>${this.msg.sampleSentence}</Label></groupentertext--ml-multiline-text>` : html``}
${this.renderError(this.simulateDraftError, this.msg.simulationFailed)}
<grouptriggeraction--ml-button-standard data-variant="primary" size="lg" data-class="w-full" ?disabled=${!simulationReady(draft)} ?loading=${this.simulateDraftStatus === 'loading'} @action=${() => this.simulateDraft()}><Label>${this.simulateDraftStatus === 'loading' ? this.msg.runningSimulation : this.msg.runSimulation}</Label></grouptriggeraction--ml-button-standard>
</div>
<section class="mt-7 border-t border-[var(--border-subtle,currentColor)] pt-6">
<h2 class="text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg.simulationResult}</h2>
${result?.toolVerdicts ? html`<groupviewdata--ml-vertical-record-list data-class="mt-3 w-full"><Columns><Column field="tool" header=${this.msg.tool}></Column><Column field="canUse" header=${this.msg.canBeUsed}></Column><Column field="why" header=${this.msg.why}></Column></Columns><Rows>${result.toolVerdicts.map((verdict) => html`<Row><Cell><div class="font-medium">${verdict.actionName}</div><div class="text-xs text-[var(--text-muted,currentColor)]">${verdict.moduleName} · ${verdict.subjectName}</div></Cell><Cell>${verdict.canUse ? this.msg.yes : this.msg.no}</Cell><Cell>${verdict.reasonText ?? ''}</Cell></Row>`)}</Rows></groupviewdata--ml-vertical-record-list>` : result?.understanding ? html`<dl class="mt-3 space-y-3 text-sm"><div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.asksForAction}</dt><dd>${result.understanding.asksForAction ? this.msg.yes : this.msg.no}</dd></div>${result.understanding.moduleName ? html`<div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.module}</dt><dd>${result.understanding.moduleName}</dd></div>` : html``}${result.understanding.subjectName ? html`<div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.subject}</dt><dd>${result.understanding.subjectName}</dd></div>` : html``}<div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.actions}</dt><dd>${result.understanding.actions.length ? result.understanding.actions.map((item) => html`<p>${item.actionName}</p>`) : this.msg.noActions}</dd></div>${result.understanding.explanation ? html`<div><dt class="text-[var(--text-muted,currentColor)]">${this.msg.explanation}</dt><dd>${result.understanding.explanation}</dd></div>` : html``}</dl>` : html`<p class="mt-3 text-sm text-[var(--text-muted,currentColor)]">${this.msg.noResult}</p>`}
</section>
</main>`;
}
render() {
this.msg = pageMessages[this.getMessageKey(pageMessages)];
return html`<molecules--ml-scenary-102020 mode="scenary" .value=${this.scenary || 'review'} backLabel=${this.msg.backToReview} @change=${(event: CustomEvent<{ value: string }>) => { if (event.target === event.currentTarget) this.setScenario(event.detail.value); }}><Scene value="review" title=${this.msg.reviewDraft}>${this.renderReview()}</Scene><Scene value="simulate" title=${this.msg.tryDraft} nav="back" backTo="review">${this.renderSimulation()}</Scene></molecules--ml-scenary-102020>`;
}
}
