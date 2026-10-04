/// <mls fileReference="_102020_/l2/agentDefsL2/skills/genD2SharedDefinition.ts" enhancement="_blank"/>

export const skill = `# Write the shared definition of one page

The shared is the motor of the page: it links the page to its endpoints and turns what the endpoints return into
states the organisms show. The endpoints (bff) are approved: each has an id, kind, when, input, output keys with
their types, rules and a JSDoc with purpose, input, processing and output. Read the JSDoc to know what each endpoint
does for the page.

States. A state remembers something the page shows or edits. Feed each state from the endpoint output key that already
has the shape the organism needs: a record with its lines, an indicator already computed, a list already filtered.
Every field an organism reads must be held by some state whose source carries it. Do not borrow a state of another page
and do not keep a state that nothing fills. When a command returns the updated record, the state that shows it takes the
command output too (list it in updates of the function that calls the command).

Functions. A function calls one endpoint and sets or updates the states its output feeds, or navigates to a page the same
actor can open. Every submit intent has a function that calls its command; every navigation intent has a function.
A query with when interaction has the function that the organism triggers (search, select, filter, next page).
carries exist only on a navigate function, as <state>.<field> of a selected item.

Entry params. A value that comes from the URL or local storage (the selected record id, a filter that survives a
reload) is an entry param with its type, its sources, its effect (select:<organism>, filter:<organism> or
prefill:<organism>) and whether it persists. A state sourced from entry.params.<name> holds that value.

Forms. Every organism that edits fields is the form of the submit that sends them: forms list submit and organism.

Journeys. Use only the journey steps listed. Each step names the organisms that serve it and the functions it uses,
or the page it continues in.

Keep identifiers stable across identical inputs. Ids follow the module language. When approved is present, the page is
being redone: keep what still fits and change only what the inputs changed. When repair is present, fix exactly the
findings named in repair.diagnostic.`;
