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
- A leaf with a field origin is named with the field's key in the ontology (the last segment of its Entity.path) and
  keeps the field's type; two such leaves of one shape from different entities prefix the one outside the root entity
  with that entity's name, in lowerCamel (entity name first, then the field key with a capital).
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
  a derived field is computed, never stored or recorded by the endpoint;
- output: what comes back and why the page needs it.

bindings link the page to its endpoints; the shared and the contract are written from them by code:
- organisms: for every organism that reads, exactly one source, as <endpointId>.<output key>; the key carries what the
  organism shows.
- commands: for each command, the queries the page reloads after it. A command whose output already redraws a state does
  not reload it; list a query only for what the output does not bring back.
- selections: for every organism that selects, how the selected record is resolved: kind query with the endpoint that
  loads it by id, or kind list with the <endpointId>.<output key> that already holds it.
- journeys: for each journey step of the page (journeySteps), the organisms and the endpoints that serve it, or the page
  it continues in (menuPages).

When approved is present, the page is being redone: keep what still fits the inputs and change only what they changed.
When repair is present, fix exactly the findings named in repair.diagnostic and keep the rest.
