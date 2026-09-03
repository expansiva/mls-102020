/// <mls fileReference="_102020_/l2/agentChangeFrontend/skills/uxGuidance.ts" enhancement="_blank"/>

export const skill = `
# agentChangeFrontend UX Guidance Skill

Behavioral guidance for composing useful pages after a UX template has been selected
from _102020_/l2/agentChangeFrontend/uxTemplates.
Templates define structure (what goes where, deterministic). This skill defines behavior
(how to fill the template slots so the page is useful, fast and honest).

## How to use with templates

1. Deterministic matching selects up to 3 candidate templates (registry selectionPolicy).
2. The LLM picks the final template and composes the UX plan from userJourney and llmGuidance.
3. Apply this guidance while filling the template slots.
4. This skill never overrides appliesWhen, rejectsWhen or validationChecks of a template.
   When guidance and template conflict, the template wins.

## Field triage (always do this first)

Classify every candidate field before placing it in a form:

- context-derived (tableId, shiftId, selected entity, current workspace):
  hidden or read-only. Never typed manually.
- system-owned (status, createdAt, closedAt, cancelledAt, technical ids):
  outputs of rules, never manual input. Show as read-only status when useful.
- computed (totalAmount, totalPrice, counters): display only; the backend computes.
- true user decisions: the only fields that remain as inputs.

A CRUD-shaped form that exposes system-owned fields is a defect, not a starting point.
The form should contain only the decisions the actor actually makes at that moment.

## Principle: smart defaults (decision fatigue)

- Every remaining input should try to carry a default: from flow context, from the
  contract's most common value, or from the previous entry in the same session.
- 70-90% of users never change a default; users read defaults as recommendations.
  Prefer the safest, most frequent value.
- Fewer visible options convert better than exhaustive options. Prefer showing the
  common choices and folding rare ones behind "more options".
- Keep required fields to the minimum the contract demands.

## Principle: goal gradient (progress never starts at zero)

- Applies to wizard_flow and other multi-step workflows.
- Count already-satisfied context (selected table, open shift, chosen customer) as
  completed steps, so the progress indicator starts above zero.
- Make the remaining distance visible and small: "1 step left" beats "step 3 of 4".
- Completion state must be explicit: a clear finished screen or summary, never a
  silent return to a list.

## Principle: anchoring and contrast

- The first number or option a user sees becomes the mental ruler for everything after.
- Order select options intentionally: recommended/frequent first, not alphabetical
  by accident.
- Show reference values next to inputs (current stock, last price, table's open total)
  so the user judges against a real anchor instead of a blank field.

## Recognition over recall

- Use selects, lookups and pickers instead of typed identifiers or memorized codes.
- Show enough context in each option (name + short detail) to decide without leaving
  the screen.

## Read before write

- Before asking for a state transition, show the current state (order status, table
  occupancy). The user confirms a change they can see, never edits status blindly.
- Transitions are presented as the allowed next actions (buttons per valid transition),
  not as a free select over all enum values.

## Error prevention over error messages

- Confirmation dialogs only for destructive or high-impact commands (cancel order,
  settle payment). Repeated fast input (POS line items) must stay inline and
  friction-free.
- Disable or hide actions that are invalid in the current state instead of letting
  them fail on submit.

## When NOT to apply persuasion

- Operational screens (attendant, kitchen, back-office) exist to make work fast.
  Never add urgency, countdowns, loss-aversion framing or guilt wording there.
- Loss aversion, reciprocity and endowment (IKEA effect) are product growth tactics
  for end-user funnels (onboarding, upgrade, pricing) and only when the solution's
  requirements explicitly ask for them.
- Never generate dark patterns: fake scarcity, hidden opt-outs, shaming dismiss
  buttons, pre-checked consents.

## Validation checklist

- No system-owned or context-derived field appears as manual input.
- Every select has a defined default when the flow provides one.
- Wizard progress reflects pre-satisfied context steps.
- State transitions render as explicit next actions, not free status edits.
- No persuasion mechanics on operational screens.
`;
