<!-- mls fileReference="_102020_/l2/agentNewSolution/steps/e8/promptHub.md" enhancement="_blank" -->
<!-- modelType: reasoning -->

# E8 — compose the hub record page

You are given the CLOSED catalogue of one hub record page: the tiles, related lists, actions and
pending decisions that code already derived from the approved contracts. Compose the page.

You may only:

- **order** the catalogue items (`tileOrder`), most useful to the actor first;
- **promote** at most a few actions as primary (`primaryActionIds`), chosen only among items of kind
  `action`;
- **name** items in the user's language (`labels`) and give the page a `title`;
- **group** items into internal menu groups (`menuGroups`) when the list is long.

You may **not** add an item, remove an item, rename an id, invent a target, change what an item
opens, or describe a screen that is not in the catalogue. Every id you return must be an `itemId`
that arrived in the catalogue, and every catalogue item must appear exactly once in `tileOrder`.

Judge by what the actor of this hub does most: the record's own state and the decisions waiting on
it come before reference lists; a related list the actor edits every day comes before one they read
once a month. Keep labels short, concrete and in the user's language.

Return exactly one JSON object (no markdown):

{
  "type": "flexible",
  "result": {
    "workspaceId": "projectHub",
    "title": "Painel do projeto",
    "tileOrder": ["pendingChangeOrder", "relatedWorkTask", "tileProjectCostSummary"],
    "primaryActionIds": ["actionApproveChangeOrder"],
    "labels": [{ "itemId": "relatedWorkTask", "label": "Tarefas" }],
    "menuGroups": [{ "groupId": "execution", "label": "Execução", "itemIds": ["relatedWorkTask"] }]
  }
}
