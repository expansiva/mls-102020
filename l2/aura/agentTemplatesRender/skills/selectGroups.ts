/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/skills/selectGroups.ts" enhancement="_blank"/>

// Skill for agentTplGroups (useMolecules): cascade steps 1-2 — from the template's workspaces to the
// list of UI elements (by INTENT) and the intent GROUPS of the molecule library that serve them.
// Adapted from mls-102049 mode8/selectMolecules (steps 1-2), moved from the page/uiSpec level to the
// TEMPLATE level: what is decided here is reused by every page that follows the template.

export const skill = `
# CollabUX · Choose the molecule intent GROUPS for a template

You are the FIRST half of a two-step cascade that fits the molecule library into a reusable UX template.
Here you only decide WHICH INTENT GROUPS the template needs — the next step picks the concrete molecule
inside each group. Never name a molecule/TagName here.

## You receive
- The template being written: its id, style model and the workspace EVIDENCE it must serve (L4 workspaces:
  title/purpose, queries, entities, commands, filters).
- The GROUP CATALOG: every intent group of the library with its description.

## Step 1 — list the UI elements the template needs
From the workspaces' shape, enumerate the CONCRETE controls/surfaces pages of this template will need.
Think in INTENT, never in appearance. Typical intents: pick 1 of N (closed set) · pick many · type text ·
type number/quantity · money · date/time/interval · boolean · trigger an action · search · navigate
tabs/sections · navigate steps (wizard) · show a metric/KPI · show a table · show a card · show a
hierarchy · show a chart · notify (toast/alert) · progress · attach a file · rate · locate a position.

Stay at the TEMPLATE level: describe the element by the ROLE it plays in the template's regions ("primary
action of the object header", "row grid of the list card", "status filter of the toolbar") — NOT by the
concrete field/BFF name of one project. If an element only exists in one workspace and is not part of the
template's shape, leave it out.

## Step 2 — map each element to a GROUP
For each element pick the group whose \`description\` best matches the INTENT of the data/action. Rules:
- One element → at most ONE group. If no group fits, set \`group: null\` (the render will hand-draw it
  with Tailwind + design-system tokens). "No group" is a legitimate, expected answer.
- A closed set of values is ALWAYS a selection group — never a free-text group.
- Prefer REUSE: the same intent appearing in several regions is the same group. Do not multiply groups.
- Do not pick a group "just in case": every group you return costs the next step a full library read.
- Only use group names that exist verbatim in the catalog.

## Output format (JSON only — no prose, no fences)
Return exactly:
{"type":"flexible","result":{
  "elements":[{"element":"<what it is>","region":"<template region>","intent":"<the intent>","group":"<groupName>"|null,"why":"<short>"}],
  "groups":["<groupName>",...]
}}
- \`elements\`: one entry per UI element, in the template's region order.
- \`groups\`: the deduplicated list of the non-null groups, nothing else.
`;
