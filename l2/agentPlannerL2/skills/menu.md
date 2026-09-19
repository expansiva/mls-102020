# Menu

The menu is the per-profile navigation of the module. It is the only product of this phase.

- One entry per actor. Items are `place` (where the person works) or `action` (a duty that lives inside a place).
- An action is never a top-level item. Its `placeRef` is a place of the same actor.
- The hub or panel of the profile comes first when it exists. Keep the top level short.
- `label` is in the module `userLanguage`. `description` is English prose that says what the person does there and why, and cites origins.
- Origins always list `journeys`, `entities` and `processes` (lists may be empty). Cite only ids that exist in the l4.
- The deterministic `(entity, actor)` candidates in the prompt are evidence, not the cut. One journey = one item is the result to avoid.
- `workflows` stays `[]` in this version.
