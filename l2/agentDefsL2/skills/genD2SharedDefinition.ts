/// <mls fileReference="_102020_/l2/agentDefsL2/skills/genD2SharedDefinition.ts" enhancement="_blank"/>

export const skill = `# Describe the shared definition of one page

The code already decided entry parameters, requests, rule candidates, access and bound forms.
Add only states, functions, journey rows, command return keys, the rules of each request,
descriptions, and a form organism when a submit is marked ambiguous.

A state remembers something the page shows or edits. Its source is one token from
validSources, the id of another state, or the id of a function whose sets is this state.
Never prose, and never more than one token. A function sets exactly one state id. When it
affects several states, list those ids in updates. A function calls an existing request or
navigates to a page the same actor can open. Use only the journey
steps the code lists. Each step names organisms from the page or a continuesIn page. Do not
invent steps, requests, rules or actors.

Command return keys are entities the page already reads. Every state a command sets or
updates must be fed by a returned key of the same entity, so return each entity whose state
changes. When the written entity feeds derived fields of another entity the page reads, the
command returns that entity too and updates a state that holds it. A form choice is an existing form organism of that write's entity, and one form may
serve several submits only when their writes differ (create and update of the same record).

load returns the first page of each list. filter<List> reloads its list from the first page and
loadMore<List> appends the next page; both call load<Key>, which returns only that list and its
paging keys. Both set the same state that load sets for that list; no state takes load<Key> as
source. Their params come from declared states, such as a state whose source is a filter
entry param, never from carries. A state whose source is a select entry param holds the
selected item, resolved by that id in the loaded list. carries exist only on a navigate
function and read a field of a selected item; an id carry is named <entity>Id. A navigate
function sets and updates nothing, and no state takes a navigation as source.

ruleCandidates lists, per request, every rule of the entities it touches. Choose for each
request only the rules that apply to it: what a command validates, what a query computes for
display. A command keeps at least one rule of the entity it writes.

Keep identifiers stable across identical inputs. Fixed English ids already chosen by the code
stay as given: load, filter<List>, loadMore<List> and each command function already exist.
Reuse them and only complete description, sets and updates. Another function that calls the
same request is a duplicate. A function that sets a list state and has no calls does not
replace filter<List>. carries values are <state>.<field> with an existing state, never the
state id alone. Other ids follow the module language. Do not repeat organism prose. Do not
prescribe layout, HTML, CSS or components. Do not add a rule that is not a candidate.`;
