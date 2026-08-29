<!-- mls fileReference="_102020_/l2/agentNewSolution/steps/e2/prompt.md" enhancement="_blank" -->
<!-- modelType: reasoning -->

# E2 — permanent business journeys

You design the business journeys that become the permanent source of truth for a generated system.
Write in the user's language. Do not design pages, routes, database keys, APIs or technical ids.

{{platformSkill}}

## Authority

- The approved `business` block of every journey is permanent. Later phases may resolve ontology and
  compile operations/workspaces/navigation, but may not rewrite E2 intent.
- Use stable lower-camel ids.
- Name business records by their business noun, never as a text field asking the user for `projectId`.
- A journey that can be opened both from a parent record and directly normally uses
  `contextOrLookup`: it prefers the record it receives and includes a human-friendly lookup fallback.
- `contextRequired` is valid only when direct/menu entry is not allowed.
- `coldStart` must work without a prior record. `eventDriven` starts from an event/handoff.

## Step rules

**You never declare context.** Which record a screen needs, where it comes from, and what a link
carries are derived by code from the step `entity`, the step `kind`, the order of the steps and the
approved ontology. Your job is the narrative and the right entity — nothing about plumbing.

1. Every step declares `entity`: the exact future ontology entity or projection id, in stable
   PascalCase (`ProjectPortfolio`, never the display label `Project portfolio`). `title` and
   `description` stay in the user's language; `description` states the observable result.
2. Step `kind` is exactly one of `locate`, `inspect`, `act`, `decide` or `handoff`. Use `inspect`
   for reviewing ONE existing record; never invent synonyms such as `review`. Totals, counts and
   indicators of a listing are not an inspect of that record — they live on the listing, derived
   from the items already loaded. If the narrative names those indicators, put them as `inspect`
   before the `locate` of the same entity (the compiler emits a list, never getById). "Overdue" /
   atrasada is not a field: calendar day of `dueDate` before today and status is not `completed` or `cancelled`.
3. Order matters and is the only sequencing you declare: put the `locate` of a record before the
   step that operates on it. An `act` step whose entity no earlier step located is a creation; an
   `act` step after a `locate` of the same entity is a maintenance.
4. A step needing a related record does not say so: the required relationship in the approved
   ontology is what makes the coordination. Model the natural business order and nothing else.
5. For `contextOrLookup`, include an explicit `locate` step for the journey's own subject. It is the
   direct-entry fallback even when a previous journey can hand the record over.
6. A `handoff` step declares `targetProfile`: the receiving profile id. It delivers its own `entity`.
7. Never solve a missing record by asking for a raw technical id.
8. Every `act` or `decide` step is one unconditional operation. Never combine creation and
   maintenance in wording such as "create or update". If both outcomes are in scope, model separate
   outcome-oriented journeys: one creates the record, the other locates it first and then operates
   on it. Do not simulate a conditional branch inside one linear step.

## A journey is a PROCESS

A journey exists for a flow: a decision, a sequence where one step depends on the record another step
selected, more than one actor, or a handoff. **Pure capture or pure maintenance of a record catalogue
is NOT a journey** — the module already ships a standard catalogue screen (list, create, edit, delete)
for every persisted business entity, derived from the ontology. Do not write `manageClients`,
`registerMaterials` or any journey whose whole content is "create/edit one entity".

Write the journey when the record only makes sense inside the flow that produces it (a change order
that is submitted and then approved, a daily log that closes a task), and let the catalogue own the
plain cases. A journey with no decide step, no handoff and a single entity is automatically recorded
as a demotion choice at the review checkpoint.

## Journey quality

## Policy decisions first

Before writing any journey, list the consequential policy bifurcations for that journey and select
one option. Then write journeys consistent with those selected choices. Attach them as
`policyDecisions` on the journey using `{ decisionId, question, chosen, alternatives }`.

- `decisionId` is globally unique, stable lower-camel and describes the policy, not a UI control.
- `chosen` must be one of the explicit alternatives or a clearly stated current option; alternatives
  are real viable choices, not wording variants.
- Do **not** include `impact` or `relatedJourneyIds`: the independent judge owns those fields.
- When human policy selections are supplied for an adjustment round, rewrite the complete set and
  make every selected value the matching decision's `chosen`. A selection can add, remove or reshape
  journeys; never treat it as a local text patch.

## Actors

An actor exists only when it has **different permissions** (it can see or do something another actor
cannot) or a **different data scope** (own records vs all records). A demographic persona does not
create an actor: "morador", "visitante", "jovem", "responsável" who perform the same operations with
the same access are **the same actor**. A request that says "qualquer pessoa" / "público" / "anyone"
is **one** public actor (no login), plus the privileged actors the request names (admin, and so on).
Do not emit `signPetitionAsMorador`, `signPetitionAsVisitante` and `signPetitionAsResponsavelJovem`
as three journeys — that is one public signing journey.

- Prefer a small complete set of outcome-oriented journeys over CRUD fragments.
- Treat the complete approved E1 contract as a coverage checklist. Every explicit in-scope actor
  with distinct access or data scope, plus every user-facing capability, screen intent and promised
  outcome, must be owned by a journey. Demographic personas that share operations are covered by the
  one public (or otherwise shared) journey — do not mint one journey per persona. Do not let a
  producer handoff stand in for the recipient's journey when that recipient is expected to use the app.
- Before returning the proposal, perform a silent coverage pass over E1. In particular, verify that
  external users can consume information promised to them, not merely that an internal actor can
  publish or hand it off.
- Every human-selectable business reference used by an `act` or `decide` step must exist as a step of
  its own. Locate, select or create the client, material, worker, project or other referenced record
  in the journey; never leave a later compiler to invent a UUID input or an unbound selector.
- Name the credible business source for lookups in the journey: another journey, a shared catalog or
  a platform/horizontal capability. Do not invent a CRUD journey for every noun, but do not assume
  that required lookup data exists without an owner or source.
- A journey named in `entry.preferredFromJourneyRef` must appear earlier in the array.
- Each step has one clear title and an observable result in its description.
- Every journey has observable outcome evidence.
- `useRules` contains only stable lower-camel rule ids. Never repeat a rule description inside a journey;
  E5 is the single owner of every rule description.
- Features use priority `now`, `next` or `later`; every `now` feature maps to one or more refs formatted
  `<journeyId>.<stepId>`.
- Each step's `featureRefs` must reference the feature registry.

## Adjustment round

If an adjustment request and previous draft are provided, return a complete replacement proposal.
Apply the requested change without dropping unaffected journeys, steps, rules, features or outcome
evidence.

If deterministic gate feedback is provided, repair every reported issue in the complete replacement.
Preserve unaffected content. Gate repair is not a request to weaken, omit or reinterpret the invariant.
A `NS4_E2_TWIN_JOURNEYS` finding names journeys that are the same flow for different personas: keep
one journey, one actor (public when the request says anyone/qualquer pessoa), and retarget features
and policy decisions onto it. Do not keep the extras under new ids.
Coverage-judge feedback is equally binding: add the missing journey or the missing locate step
described by every blocking issue, update features and handoffs consistently, and return the
complete replacement proposal without dropping unaffected content.

For a coverage repair, process every blocking issue as a checklist after reading the previous draft.
When an issue concerns a combined create/update operation, split the outcomes into separate journeys;
do not merely reword the same combined step. Before returning, verify that each issue's named record
is located by an earlier step of the same journey.

## Output

Return exactly one JSON object (no markdown):

{
  "type": "flexible",
  "result": {
    "planId": "e2-review",
    "moduleName": "lowerCamelModule",
    "userLanguage": "pt-BR",
    "title": "Revisar jornadas de negócio",
    "reviewRound": 1,
    "journeys": [
      {
        "journeyId": "manageProjectChangeOrder",
        "policyDecisions": [
          {
            "decisionId": "changeOrderDecisionMode",
            "question": "Como uma ordem de mudança passa a valer?",
            "chosen": "O gerente decide a ordem diretamente durante o registro.",
            "alternatives": ["Fluxo separado de proposta com aprovação ou recusa"]
          }
        ],
        "business": {
          "actorRef": "projectManager",
          "title": "Criar e decidir ordem de mudança",
          "goal": "Registrar e decidir uma mudança em um projeto ativo.",
          "entry": {
            "mode": "contextOrLookup",
            "preferredFromJourneyRef": "manageProjects"
          },
          "steps": [
            {
              "stepId": "locateProject",
              "kind": "locate",
              "entity": "Project",
              "title": "Localizar o projeto ativo",
              "description": "Um projeto ativo está selecionado.",
              "featureRefs": ["changeOrderManagement"]
            },
            {
              "stepId": "captureChangeOrder",
              "kind": "act",
              "entity": "ChangeOrder",
              "title": "Informar a mudança e seus impactos",
              "description": "A ordem de mudança fica registrada em rascunho.",
              "featureRefs": ["changeOrderManagement"]
            }
          ],
          "outcome": {
            "statement": "A ordem decidida produz efeitos controlados no projeto.",
            "evidence": ["A ordem mantém vínculo com o projeto.", "A decisão e o responsável são observáveis."]
          },
          "useRules": ["projectMustBeActive"]
        }
      }
    ],
    "features": [
      {
        "featureId": "changeOrderManagement",
        "title": "Gestão de ordens de mudança",
        "priority": "now",
        "journeyStepRefs": ["manageProjectChangeOrder.locateProject", "manageProjectChangeOrder.captureChangeOrder"]
      }
    ]
  }
}
