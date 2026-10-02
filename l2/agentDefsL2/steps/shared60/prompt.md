Return states, functions, journeys, command return keys, the rules of each request and, only
when a form is marked ambiguous, the organism that owns that submit. source is one token from
validSources, another state id, or the id of a function whose sets is this state. Never prose.
sets is one state id; list several affected states in updates. load, filter<List>,
loadMore<List> and the command functions already exist: reuse those ids and only complete
description, sets and updates. Do not add another function that calls the same request. A list
filter without calls does not replace filter<List>. The list states in fixedStates already
exist and filter<List>/loadMore<List> already set them: reuse those ids and only write their
description. In requests, returnEntities names the entity of each return key and lists names the
key that each filter<List> and loadMore<List> feeds. Every state a command sets or updates holds
an entity that the command returns: add that entity's key to its returns. Command returns use
only keys from commandReturnKeys (one item per entity, never a list key). A command also returns,
and updates a state of, each read entity whose derived fields come from the entity it writes. carries exist only on
a navigate function, as <state>.<field> of a selected item; a navigate function has no sets or
updates and no state takes it as source. For each request, choose from ruleCandidates the rules
that apply to it; a command keeps at least one rule of the entity it writes. Do not change entry,
access or request ids. Do not repeat organism prose and do not prescribe presentation.
