Design the BFF of one page: the endpoints the page calls, as functions of the page, never one per organism or one
per entity. Read the page intent, its sections, the organisms with their text and intents, what each organism reads,
edits, selects and submits (page11Needs), the writes the plan allows, the journeys of the page, the L4 entities it
touches (fields, derived fields, transitions with payload, relationships, capabilities), the rule texts and the grants
of the page actors.

Decide how many endpoints there are, the shape of each output, paging, filters and names. Weigh what is best for the
app: transfer and performance. Load what the page shows when it opens in one call, already in the shape the page uses:
a header with its lines, an indicator already computed, a list already filtered by the situation the intent names.
Fetch on demand what the person searches or selects. Page a list only when it can grow beyond what one screen needs.
A command returns what the page redraws after it (the updated record with its lines and totals), so the page needs no
second call. An indicator is computed in the endpoint: the output is the number, never a raw list for the page to sum.

Kinds and triggers:
- qry runs onLoad or on interaction; cmd runs on a submit intent and its when is that intent id.
- Every submit intent has exactly one cmd. Its writes is the write the page draft binds to that intent.
- A cmd input carries what its write asks for: the transition payload; on create, the fields the page edits for that
  entity and the required foreign key of the context; on update and transition, the id and the version.

Types and origins:
- types are named shapes reused by several endpoints, such as a record with its lines. A field is a leaf: string,
  number, boolean, a union of literals ('a' | 'b'), or the name of another type; add [] for a list. Nested shapes are
  always a named type.
- Every value leaf names its origin: field with the one Entity.path it carries; aggregate with every Entity.path the
  value is computed from; context for a value that comes from the URL or a selection and fills no stored field.
- A cmd input leaf that fills a stored field uses field with that field's Entity.path, never context.
- Every Entity.path an organism reads is the origin of some output leaf, or is inside an aggregate.
- A literal union uses only values of that L4 enum.
- Use only fields the page actors can see through their grants.

rules lists, for each endpoint, the rules whose text binds what this endpoint does: what a command must refuse or
record, what a query computes. Read the rule text, not the entity: a rule about cancelling does not apply to adding.

jsdoc is written for the person and the model that implement the endpoint, in userLanguage:
- purpose: what the function does for the page, not the organism text;
- input: the meaning of each input;
- processing: the filter, the composition, the computation and the rules it applies, by id and by what they demand;
- output: what comes back and why the page needs it.

When approved is present, the page is being redone: keep what still fits the inputs and change only what they changed.
When repair is present, fix exactly the findings named in repair.diagnostic and keep the rest.
