/// <mls fileReference="_102047_/l2/agents/web/mobile/page11/person_restrictions.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html, type TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsPerson_restrictionsShared } from '/_102047_/l2/agents/web/shared/person_restrictions.js';
import type { ChecklistTool, ErrorState, PersonOption } from '/_102047_/l2/agents/web/shared/person_restrictions.js';
import '/_102040_/l2/molecules/groupselectone/ml-combobox.js';
import '/_102040_/l2/molecules/groupselectmany/ml-multi-checkbox-list.js';
import '/_102020_/l2/molecules/ml-scenary.js';
/// **collab_i18n_start**
const pageMessage_en = {
directoryTitle: 'Tool restrictions',
backToPeople: 'People',
choosePerson: 'Choose a person',
choosePersonHelper: 'Search by name, then choose the person whose agent tools you need to manage.',
personSearchPlaceholder: 'Search people by name',
loginEmail: 'Login email',
active: 'Active',
inactive: 'Inactive',
merged: 'Merged',
blocked: 'Blocked',
noPeople: 'No active people are available for tool restrictions.',
loadingPeople: 'Loading people…',
loadingRestrictions: 'Loading this person’s tools…',
peopleLoadError: 'People could not be loaded.',
restrictionsLoadError: 'This person’s tool restrictions could not be loaded.',
saveError: 'Tool restrictions could not be saved.',
preconditionMissing: 'This page needs a person selected from the organization.',
retry: 'Try again',
restrictions: 'Restrictions',
restrictionIntro: 'Tick every tool this person may not use through any agent.',
blockedTools: 'Blocked tools',
blockedToolsHelper: 'A checked tool is unavailable to this person through every agent.',
noTools: 'No tools are available for this person.',
markedOn: 'Marked on',
toolRemovedFromRelease: 'Tool removed from release',
available: 'Available',
removed: 'Removed',
saveRestrictions: 'Save restrictions',
savingRestrictions: 'Saving restrictions…',
restrictionsSaved: 'Restrictions saved.',
noPersonSelected: 'Choose a person to review their tool restrictions.'
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = {
'en': pageMessage_en
};
/// **collab_i18n_end**
const PERSON_STATUS_KEY: Record<PersonOption['details']['identification']['status'], keyof PageMessageType> = {
Active: 'active',
Inactive: 'inactive',
Merged: 'merged',
Blocked: 'blocked'
};
const TOOL_STATUS_KEY: Record<ChecklistTool['status'], keyof PageMessageType> = {
available: 'available',
removed: 'removed'
};
function messageForError(error: ErrorState, fallback: keyof PageMessageType, msg: PageMessageType) {
if (error?.message) return error.message;
if (error?.code === 'client.preconditionMissing') return msg['preconditionMissing'];
return msg[fallback];
}
function formatDate(value: string) {
return new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
dateStyle: 'medium',
timeStyle: 'short'
}).format(new Date(value));
}
function groupedTools(tools: ChecklistTool[]) {
const groups: { label: string; tools: ChecklistTool[] }[] = [];
tools.forEach((tool) => {
const label = `${tool.details.moduleTitle} · ${tool.details.subjectTitle}`;
const group = groups.find((item) => item.label === label);
if (group) {
group.tools.push(tool);
} else {
groups.push({ label, tools: [tool] });
}
});
return groups;
}
@customElement('agents--web--mobile--page11--person_restrictions-102047')
export class AgentsMobilePage11Person_restrictionsPage extends AgentsPerson_restrictionsShared {
private msg: PageMessageType = pageMessage_en;
private renderPersonPicker() {
const loadError = this.listPeopleStatus === 'error'
? messageForError(this.listPeopleError, 'peopleLoadError', this.msg)
: '';
return html`
<section data-organism-id="personPicker" class="px-4 pt-5">
<groupselectone--ml-combobox
class="block w-full"
.value=${this.selectedOrganizationUser}
.name=${'person'}
.placeholder=${this.msg['personSearchPlaceholder']}
.freeText=${false}
.clearable=${true}
.isEditing=${true}
.loading=${this.listPeopleStatus === 'loading'}
.error=${loadError}
@input=${(e: CustomEvent<{ value: string }>) => this.listPeople(e.detail.value)}
@change=${(e: CustomEvent<{ value: string | null }>) => {
this.selectOrganizationUser(e.detail.value);
if (e.detail.value !== null) this.setScenario('restrictions');
if (e.detail.value === null) this.setScenario('directory');
}}>
<Label>${this.msg['choosePerson']}</Label>
${this.people.items.map((person: PersonOption) => html`
<Item value=${person.id}>
<span class="flex min-w-0 flex-col gap-0.5 py-1">
<span class="truncate font-medium text-[var(--text-strong,currentColor)]">${person.details.identification.name}</span>
${person.details.agents.loginEmail ? html`
<span class="truncate text-sm text-[var(--text-muted,currentColor)]">${person.details.agents.loginEmail}</span>
` : ''}
<span class="w-fit rounded-full bg-[var(--status-neutral-bg,transparent)] px-2 py-0.5 text-xs font-medium text-[var(--status-neutral-text,currentColor)]">
${this.msg[PERSON_STATUS_KEY[person.details.identification.status]]}
</span>
</span>
</Item>
`)}
<Empty>${this.listPeopleStatus === 'loading' ? this.msg['loadingPeople'] : this.msg['noPeople']}</Empty>
<Helper>${this.msg['choosePersonHelper']}</Helper>
</groupselectone--ml-combobox>
${this.listPeopleStatus === 'error' ? html`
<button
type="button"
class="mt-3 min-h-11 rounded-lg border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
@click=${() => this.listPeople(undefined)}>
${this.msg['retry']}
</button>
` : ''}
</section>
`;
}
private renderRestrictions() {
const person = this.person;
const loadingRestrictions = this.getPersonRestrictionsStatus === 'loading';
const requestError = this.getPersonRestrictionsStatus === 'error'
? messageForError(this.getPersonRestrictionsError, 'restrictionsLoadError', this.msg)
: '';
const saveError = this.saveRestrictionsStatus === 'error'
? messageForError(this.saveRestrictionsError, 'saveError', this.msg)
: '';
const selectedTools = this.saveRestrictionsDraft.toolId.join(',');
const busy = loadingRestrictions || this.saveRestrictionsStatus === 'loading';
return html`
<section data-organism-id="blockedToolsChecklist" class="px-4 pb-8 pt-5">
${person ? html`
<div class="mb-5 rounded-xl border border-[var(--border-subtle,currentColor)] bg-[var(--surface-alt-bg,transparent)] p-4">
<p class="truncate text-lg font-semibold text-[var(--text-strong,currentColor)]">${person.details.identification.name}</p>
${person.details.agents.loginEmail ? html`
<p class="mt-1 truncate text-sm text-[var(--text-muted,currentColor)]">${person.details.agents.loginEmail}</p>
` : ''}
<span class="mt-3 inline-flex rounded-full bg-[var(--status-neutral-bg,transparent)] px-2.5 py-1 text-xs font-semibold text-[var(--status-neutral-text,currentColor)]">
${this.msg[PERSON_STATUS_KEY[person.details.identification.status]]}
</span>
</div>
` : ''}
${loadingRestrictions ? html`
<p class="py-8 text-sm text-[var(--text-muted,currentColor)]" aria-live="polite">${this.msg['loadingRestrictions']}</p>
` : requestError ? html`
<div class="rounded-xl border border-[var(--status-error-text,currentColor)] bg-[var(--surface-bg,transparent)] p-4" aria-live="polite">
<p class="text-sm text-[var(--text-default,currentColor)]">${requestError}</p>
<button
type="button"
class="mt-3 min-h-11 rounded-lg border border-[var(--button-secondary-border,currentColor)] bg-[var(--button-secondary-bg,transparent)] px-4 text-sm font-semibold text-[var(--button-secondary-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
@click=${() => this.getPersonRestrictions()}>
${this.msg['retry']}
</button>
</div>
` : !person ? html`
<p class="py-8 text-sm text-[var(--text-muted,currentColor)]">${this.msg['noPersonSelected']}</p>
` : html`
<div class="mb-4">
<h2 class="text-base font-semibold text-[var(--text-strong,currentColor)]">${this.msg['restrictions']}</h2>
<p class="mt-1 text-sm leading-5 text-[var(--text-muted,currentColor)]">${this.msg['restrictionIntro']}</p>
</div>
<groupselectmany--ml-multi-checkbox-list
class="block w-full"
.value=${selectedTools}
.name=${'blocked-tools'}
.placeholder=${this.msg['noTools']}
.searchable=${true}
.isEditing=${true}
.disabled=${busy}
.loading=${loadingRestrictions}
.error=${saveError}
@change=${(e: CustomEvent<{ value: string }>) => this.setSaveRestrictionsDraft({
...this.saveRestrictionsDraft,
toolId: e.detail.value ? e.detail.value.split(',') : []
})}>
<Label>${this.msg['blockedTools']}</Label>
${groupedTools(this.tools).map((group) => html`
<Group label=${group.label}>
${group.tools.map((tool) => html`
<Item value=${tool.id}>
<span class="flex min-w-0 flex-col gap-1 py-1">
<span class="text-sm font-medium text-[var(--text-strong,currentColor)]">${tool.name}</span>
<span class="text-xs text-[var(--text-muted,currentColor)]">${this.msg[TOOL_STATUS_KEY[tool.status]]}</span>
${tool.personToolRestriction ? html`
<span class="text-xs text-[var(--text-muted,currentColor)]">
${this.msg['markedOn']}: ${formatDate(tool.personToolRestriction.details.markedAt)}
</span>
${tool.personToolRestriction.details.toolRemoved ? html`
<span class="w-fit rounded-full bg-[var(--status-warning-bg,transparent)] px-2 py-0.5 text-xs font-medium text-[var(--status-warning-text,currentColor)]">${this.msg['toolRemovedFromRelease']}</span>
` : ''}
` : ''}
</span>
</Item>
`)}
</Group>
`)}
<Empty>${this.msg['noTools']}</Empty>
<Helper>${this.msg['blockedToolsHelper']}</Helper>
</groupselectmany--ml-multi-checkbox-list>
${this.saveRestrictionsStatus === 'success' ? html`
<p class="mt-4 rounded-lg bg-[var(--status-success-bg,transparent)] px-3 py-3 text-sm font-medium text-[var(--status-success-text,currentColor)]" aria-live="polite">${this.msg['restrictionsSaved']}</p>
` : ''}
<button
type="button"
class="mt-5 min-h-11 w-full rounded-lg bg-[var(--button-primary-bg,transparent)] px-4 text-sm font-semibold text-[var(--button-primary-text,currentColor)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)] disabled:cursor-not-allowed disabled:opacity-50"
?disabled=${busy}
aria-busy=${this.saveRestrictionsStatus === 'loading'}
@click=${() => this.saveRestrictions()}>
${this.saveRestrictionsStatus === 'loading' ? this.msg['savingRestrictions'] : this.msg['saveRestrictions']}
</button>
`}
</section>
`;
}
render() {
this.msg = pageMessages[this.getMessageKey(pageMessages)];
const restrictionsTitle = this.person?.details.identification.name ?? this.msg['restrictions'];
return html`
<main class="min-h-full bg-[var(--page-bg,transparent)] text-[var(--text-default,currentColor)]">
<molecules--ml-scenary-102020
mode="scenary"
.value=${this.scenary || (this.selectedOrganizationUser !== null ? 'restrictions' : 'directory')}
.backLabel=${this.msg['backToPeople']}
@change=${(e: CustomEvent<{ value: string }>) => {
if (e.target === e.currentTarget) {
this.setScenario(e.detail.value);
if (e.detail.value === 'directory') this.selectOrganizationUser(null);
}
}}>
<Scene value="directory" title=${this.msg['directoryTitle']}>
${this.renderPersonPicker()}
</Scene>
<Scene value="restrictions" title=${restrictionsTitle} nav="back" backTo="directory">
${this.renderRestrictions()}
</Scene>
</molecules--ml-scenary-102020>
</main>
`;
}
}
