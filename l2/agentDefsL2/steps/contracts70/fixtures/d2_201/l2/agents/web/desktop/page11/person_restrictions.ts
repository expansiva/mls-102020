/// <mls fileReference="_102047_/l2/agents/web/desktop/page11/person_restrictions.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { AgentsPerson_restrictionsShared } from '/_102047_/l2/agents/web/shared/person_restrictions.js';
import type { ChecklistTool, ErrorState, PersonOption } from '/_102047_/l2/agents/web/shared/person_restrictions.js';
import '/_102040_/l2/molecules/groupselectone/ml-select-one-autocomplete.js';
import '/_102040_/l2/molecules/groupselectmany/ml-table-multi-select.js';
/// **collab_i18n_start**
const pageMessage_en = {
pageTitle: 'Tool restrictions',
pageIntro: 'Choose a person and manage the tools they may not use through any agent.',
peopleHeading: 'People',
peopleIntro: 'Find an active organization user by name.',
searchLabel: 'Search people',
searchPlaceholder: 'Type a name to search',
personLabel: 'Person',
personPlaceholder: 'Choose a person',
noPeople: 'No people are available for tool restrictions.',
noMatchingPeople: 'No people match this search.',
emailLabel: 'Login email',
statusActive: 'Active',
statusInactive: 'Inactive',
statusMerged: 'Merged',
statusBlocked: 'Blocked',
listLoading: 'Loading people…',
listError: 'People could not be loaded.',
retryPeople: 'Try loading people again',
choosePersonHeading: 'Choose a person',
choosePersonBody: 'Their current tool restrictions will appear here.',
restrictionsFor: 'Restrictions for',
restrictionsIntro: 'Checked tools cannot be used by this person through any agent.',
toolsLabel: 'Blocked tools',
toolsPlaceholder: 'Select tools to block',
columnModule: 'Module',
columnSubject: 'Subject',
columnTool: 'Tool',
columnMarkedOn: 'Marked on',
columnRelease: 'Release status',
notMarked: 'Not marked',
available: 'Available',
removed: 'Removed from release',
noTools: 'No tools are available for this person.',
toolHelper: 'Check a tool to prevent access through every agent.',
checklistLoading: 'Loading tool restrictions…',
checklistError: 'Tool restrictions could not be loaded.',
retryChecklist: 'Try loading restrictions again',
saveRestrictions: 'Save restrictions',
savingRestrictions: 'Saving restrictions…',
saveSuccess: 'Restrictions saved.',
saveError: 'Restrictions could not be saved.',
retrySave: 'Try saving again',
requiredFields: 'Complete the required fields before saving.',
requiredPerson: 'Person',
requiredTools: 'Blocked tools',
requiredKnownRestrictions: 'Current restrictions',
personStatus: 'Status',
panelLoading: 'Loading',
};
type PageMessageType = typeof pageMessage_en;
const pageMessages: Record<string, PageMessageType> = { 'en': pageMessage_en };
/// **collab_i18n_end**
const STATUS_KEY: Record<PersonOption['details']['identification']['status'], keyof PageMessageType> = {
Active: 'statusActive',
Inactive: 'statusInactive',
Merged: 'statusMerged',
Blocked: 'statusBlocked',
};
function formatDate(value: string): string {
return new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
dateStyle: 'medium',
timeStyle: 'short',
}).format(new Date(value));
}
function errorMessage(error: ErrorState, msg: PageMessageType, fallback: keyof PageMessageType): string {
if (error === null) return '';
if (error.message) return error.message;
if (error.code !== 'client.requiredMissing') return msg[fallback];
if (typeof error.details !== 'object' || error.details === null || !('stateKeys' in error.details)) {
return msg.requiredFields;
}
const stateKeys = (error.details as { stateKeys?: unknown }).stateKeys;
if (!Array.isArray(stateKeys)) return msg.requiredFields;
const labels: Record<string, keyof PageMessageType> = {
personId: 'requiredPerson',
toolId: 'requiredTools',
knownRestrictions: 'requiredKnownRestrictions',
};
const names = stateKeys
.filter((key): key is string => typeof key === 'string' && key in labels)
.map((key) => msg[labels[key]]);
return names.length > 0 ? `${msg.requiredFields} ${names.join(', ')}.` : msg.requiredFields;
}
@customElement('agents--web--desktop--page11--person_restrictions-102047')
export class AgentsDesktopPage11Person_restrictionsPage extends AgentsPerson_restrictionsShared {
private msg: PageMessageType = pageMessage_en;
renderDirectory() {
const listError = errorMessage(this.listPeopleError, this.msg, 'listError');
return html`
<aside class="flex min-h-[680px] flex-col border-r border-[var(--border-subtle,currentColor)] bg-[var(--surface-bg,transparent)]" aria-label=${this.msg.peopleHeading}>
<div class="border-b border-[var(--border-subtle,currentColor)] px-6 py-6">
<h2 class="text-lg font-semibold text-[var(--text-strong,currentColor)]">${this.msg.peopleHeading}</h2>
<p class="mt-1 text-sm leading-5 text-[var(--text-muted,currentColor)]">${this.msg.peopleIntro}</p>
<label class="mt-5 block text-sm font-medium text-[var(--text-default,currentColor)]" for="person-search">${this.msg.searchLabel}</label>
<input
id="person-search"
class="mt-2 h-11 w-full rounded-md border border-[var(--border-default,currentColor)] bg-[var(--input-bg,transparent)] px-3 text-sm text-[var(--text-default,currentColor)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]"
.value=${this.search ?? ''}
placeholder=${this.msg.searchPlaceholder}
?disabled=${this.listPeopleStatus === 'loading'}
@input=${(e: Event) => this.listPeople((e.target as HTMLInputElement).value)}
/>
</div>
<div data-organism-id="personPicker" class="flex-1 px-4 py-5" aria-busy=${this.listPeopleStatus === 'loading' ? 'true' : 'false'}>
${this.listPeopleStatus === 'loading' ? html`<p class="mb-3 text-sm text-[var(--text-muted,currentColor)]">${this.msg.listLoading}</p>` : ''}
${listError ? html`
<div class="mb-4 rounded-md border border-[var(--status-error-bg,currentColor)] bg-[var(--surface-alt-bg,transparent)] p-3" role="alert">
<p class="text-sm text-[var(--text-default,currentColor)]">${listError}</p>
<button type="button" class="mt-2 text-sm font-medium text-[var(--link-text,currentColor)] underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.listPeople()}>${this.msg.retryPeople}</button>
</div>
` : ''}
<groupselectone--ml-select-one-autocomplete
data-class="w-full"
name="person"
.value=${this.selectedOrganizationUser}
placeholder=${this.msg.personPlaceholder}
?searchable=${true}
?clearable=${true}
?loading=${this.listPeopleStatus === 'loading'}
?disabled=${this.listPeopleStatus === 'error'}
@change=${(e: CustomEvent<{ value: string | null }>) => this.selectOrganizationUser(e.detail.value)}>
<Label>${this.msg.personLabel}</Label>
${this.people.items.map((person: PersonOption) => html`
<Item value=${person.id} data-class="py-2">
<span class="block font-medium">${person.details.identification.name}</span>
${person.details.agents.loginEmail ? html`<span class="block text-sm text-[var(--text-muted,currentColor)]">${person.details.agents.loginEmail}</span>` : ''}
<span class="mt-1 inline-block rounded-full bg-[var(--status-neutral-bg,transparent)] px-2 py-0.5 text-xs text-[var(--status-neutral-text,currentColor)]">${this.msg[STATUS_KEY[person.details.identification.status]]}</span>
</Item>
`)}
<Empty>${this.search ? this.msg.noMatchingPeople : this.msg.noPeople}</Empty>
</groupselectone--ml-select-one-autocomplete>
</div>
</aside>
`;
}
renderPanel() {
const checklistError = errorMessage(this.getPersonRestrictionsError, this.msg, 'checklistError');
const saveError = errorMessage(this.saveRestrictionsError, this.msg, 'saveError');
const selectedTools = this.saveRestrictionsDraft.toolId.join(',');
const checklistIsLoading = this.getPersonRestrictionsStatus === 'loading';
return html`
<section class="min-w-0 bg-[var(--page-bg,transparent)] px-8 py-7" aria-live="polite">
${this.selectedOrganizationUser === null ? html`
<div class="flex h-full min-h-[500px] items-center justify-center">
<div class="max-w-sm text-center">
<h2 class="text-xl font-semibold text-[var(--text-strong,currentColor)]">${this.msg.choosePersonHeading}</h2>
<p class="mt-2 text-sm leading-6 text-[var(--text-muted,currentColor)]">${this.msg.choosePersonBody}</p>
</div>
</div>
` : checklistIsLoading || this.person === null ? html`
<div class="flex min-h-[500px] items-center justify-center" aria-busy="true">
<p class="text-sm text-[var(--text-muted,currentColor)]">${this.msg.checklistLoading}</p>
</div>
` : html`
<div data-organism-id="blockedToolsChecklist" class="mx-auto max-w-6xl">
<header class="border-b border-[var(--border-subtle,currentColor)] pb-5">
<p class="text-sm font-medium text-[var(--text-muted,currentColor)]">${this.msg.restrictionsFor}</p>
<h2 class="mt-1 text-2xl font-semibold text-[var(--text-strong,currentColor)]">${this.person.details.identification.name}</h2>
<div class="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--text-muted,currentColor)]">
${this.person.details.agents.loginEmail ? html`<span>${this.msg.emailLabel}: ${this.person.details.agents.loginEmail}</span>` : ''}
<span>${this.msg.personStatus}: ${this.msg[STATUS_KEY[this.person.details.identification.status]]}</span>
</div>
<p class="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-default,currentColor)]">${this.msg.restrictionsIntro}</p>
</header>
${checklistError ? html`
<div class="mt-5 rounded-md border border-[var(--status-error-bg,currentColor)] bg-[var(--surface-alt-bg,transparent)] p-4" role="alert">
<p class="text-sm text-[var(--text-default,currentColor)]">${checklistError}</p>
<button type="button" class="mt-2 text-sm font-medium text-[var(--link-text,currentColor)] underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" @click=${() => this.getPersonRestrictions()}>${this.msg.retryChecklist}</button>
</div>
` : ''}
${saveError ? html`
<div class="mt-5 rounded-md border border-[var(--status-error-bg,currentColor)] bg-[var(--surface-alt-bg,transparent)] p-4" role="alert">
<p class="text-sm text-[var(--text-default,currentColor)]">${saveError}</p>
<button type="button" class="mt-2 text-sm font-medium text-[var(--link-text,currentColor)] underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)]" ?disabled=${this.saveRestrictionsStatus === 'loading'} @click=${() => this.saveRestrictions()}>${this.msg.retrySave}</button>
</div>
` : ''}
${this.saveRestrictionsStatus === 'success' ? html`<p class="mt-5 rounded-md bg-[var(--status-success-bg,transparent)] px-4 py-3 text-sm text-[var(--status-success-text,currentColor)]" role="status">${this.msg.saveSuccess}</p>` : ''}
<div class="mt-6" aria-busy=${this.saveRestrictionsStatus === 'loading' ? 'true' : 'false'}>
<groupselectmany--ml-table-multi-select
data-class="w-full"
name="blocked-tools"
.value=${selectedTools}
placeholder=${this.msg.toolsPlaceholder}
?searchable=${true}
?loading=${checklistIsLoading}
?disabled=${this.saveRestrictionsStatus === 'loading'}
@change=${(e: CustomEvent<{ value: string }>) => this.setSaveRestrictionsDraft({ ...this.saveRestrictionsDraft, toolId: e.detail.value ? e.detail.value.split(',') : [] })}>
<Label>${this.msg.toolsLabel}</Label>
<Column>${this.msg.columnModule}</Column>
<Column>${this.msg.columnSubject}</Column>
<Column>${this.msg.columnTool}</Column>
<Column>${this.msg.columnMarkedOn}</Column>
<Column>${this.msg.columnRelease}</Column>
${this.tools.map((tool: ChecklistTool) => html`
<Item value=${tool.id}>
<Cell>${tool.details.moduleTitle}</Cell>
<Cell>${tool.details.subjectTitle}</Cell>
<Cell><span class="font-medium">${tool.name}</span><span class="block text-xs text-[var(--text-muted,currentColor)]">${tool.details.description}</span></Cell>
<Cell>${tool.personToolRestriction ? formatDate(tool.personToolRestriction.details.markedAt) : this.msg.notMarked}</Cell>
<Cell>${tool.status === 'removed' ? this.msg.removed : this.msg.available}</Cell>
</Item>
`)}
<Empty>${this.msg.noTools}</Empty>
<Helper>${this.msg.toolHelper}</Helper>
</groupselectmany--ml-table-multi-select>
</div>
<div class="mt-6 flex items-center justify-end border-t border-[var(--border-subtle,currentColor)] pt-5">
<button type="button" class="h-11 rounded-md bg-[var(--button-primary-bg,transparent)] px-5 text-sm font-semibold text-[var(--button-primary-text,currentColor)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,currentColor)] disabled:cursor-not-allowed disabled:opacity-50" ?disabled=${this.saveRestrictionsStatus === 'loading'} @click=${() => this.saveRestrictions()}>
${this.saveRestrictionsStatus === 'loading' ? this.msg.savingRestrictions : this.msg.saveRestrictions}
</button>
</div>
</div>
`}
</section>
`;
}
render() {
this.msg = pageMessages[this.getMessageKey(pageMessages)];
return html`
<main class="min-h-full bg-[var(--page-bg,transparent)] text-[var(--text-default,currentColor)]">
<header class="border-b border-[var(--border-default,currentColor)] bg-[var(--surface-bg,transparent)] px-8 py-6">
<h1 class="text-2xl font-semibold text-[var(--text-strong,currentColor)]">${this.msg.pageTitle}</h1>
<p class="mt-1 text-sm text-[var(--text-muted,currentColor)]">${this.msg.pageIntro}</p>
</header>
<div class="grid min-h-[680px] grid-cols-[360px_minmax(0,1fr)]">
${this.renderDirectory()}
${this.renderPanel()}
</div>
</main>
`;
}
}
