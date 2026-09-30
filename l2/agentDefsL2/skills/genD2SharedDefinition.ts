/// <mls fileReference="_102020_/l2/agentDefsL2/skills/genD2SharedDefinition.ts" enhancement="_blank"/>

export const skill = `# Describe the shared definition of one page

The code already decided entry parameters, requests, rules, access and bound forms.
Add only states, functions, journey rows, command return keys, descriptions, and a form
organism when a submit is marked ambiguous.

A state remembers something the page shows or edits. Its source is one token from
validSources, the id of another state, or the id of a function whose sets is this state.
Never prose, and never more than one token. A function sets exactly one state id. When it
affects several states, list those ids in updates. A function calls an existing request or
navigates to a page the same actor can open. Use only the journey
steps the code lists. Each step names organisms from the page or a continuesIn page. Do not
invent steps, requests, rules or actors.

Command return keys are entities the page already reads. A form choice is an existing form
organism of that write's entity, and each form serves at most one submit.

Keep identifiers stable across identical inputs. Fixed English ids already chosen by the code
stay as given: load, filter<List>, loadMore<List> and each command function already exist.
Reuse them and only complete description, sets and updates. Another function that calls the
same request is a duplicate. A function that sets a list state and has no calls does not
replace filter<List>. carries values are <state>.<field> with an existing state, never the
state id alone. Other ids follow the module language. Do not repeat organism prose. Do not
prescribe layout, HTML, CSS or components. Do not add a rule that was not supplied.`;
