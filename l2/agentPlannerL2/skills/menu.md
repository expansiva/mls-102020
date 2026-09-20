# Menu

The menu is one tree for the module. Actors are a filter, not a second tree.

- Nodes are `hub` (pick a record of `context`, then act), `page` (a screen of organisms) or `group` (a folder, rare).
- A page has `organisms[]` (`list`, `detail`, `form`, `summary`, `highlights`, `timeline`, `actions`, `inbox`, `alerts`). Actions are never nodes.
- `authorities` lists, in order, the node ids each actor sees. Granting a hub grants its children. The first id is that actor's entry.
- `label`, `text` and `organisms[].text` use `userLanguage`. Ids are snake_case.
- `meta.journeys` maps every l4 journey to the pages where it happens; an empty list is a visible hole. `meta.processes` maps every l4 process the same way. `meta.entities` maps every record an actor maintains (`writer: crud` in their grant) the same way.
- The actor's home is `summary`/`highlights` + `alerts` + `inbox`. What the system does on its own, the person must see it happened (`timeline` on the entity page).
- The deterministic hub/page candidates and "what this actor must see, beyond journeys" in the prompt are evidence, not the cut. One journey = one page is the result to avoid.
