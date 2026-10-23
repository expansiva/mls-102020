# agentAssistant

Runs an action of a generated app from one sentence. It works out which command fits, finds the
records the user named, asks only for what is missing, confirms and calls the app's own
`/execBff`. It is generic: the catalog is read from the app's generated files. `flow.json` is the
spec.

## Run

In the messages panel of the app on the runtime VM (the agent needs `/execBff` on the same
origin and the logged user's session):

```
@@agentAssistant adicione uma salada na mesa 1
@@agentAssistant adicione uma salada
@@agentAssistant abrir comanda para a mesa 2 e lançar 1 bife
@@agentAssistant qual o valor total da comanda 4?
@@agentAssistant como faço para fechar uma comanda?
```

- First sentence: the open comanda of table 1 is found through the app's own list query. If the
  menu has more than one salad, you pick one. Then you confirm and the item is launched.
- Second sentence: you choose between adding the salad to a comanda and registering it in the
  menu. If you pick the menu, only the price is asked, then you confirm.
- Third sentence: one confirmation lists both actions in order ("Executar tudo"). The comanda is
  opened, then the steak is launched on that new comanda. A question appears only if something
  is ambiguous or missing, and continuing runs that action. The first failure stops the rest.
- Fourth sentence: a question. The query runs without a confirmation and a screen shows the
  answer, written from the data the app returned. OK closes the task. When nothing fits, or the
  query fails, the message is shown on the same screen.
- Fifth sentence: a manual question (how to use the app, which screen, which modules). Nothing
  runs. The answer is written from the app's defs (journeys, screens, rules, who does what) and
  shown with OK. "quais módulos existem?" lists every module, including the ones without a backend.
- In a record question, typing text in the notes field runs a new search, and the typed text wins
  over the pre-selected option.
- Cancel at any round ends the task. Nothing is sent before the confirmation round.

In the Studio there is no `/execBff`. The first lookup fails with `BFF_UNAVAILABLE` and the task
ends showing that message.

## Layout

```
agentAssistant.ts        root: parse the sentence, store it + the project in memory, plant 'interpret' (no model)
flow.json                spec
schemas/                 interpret.schema.json (tool output of the interpret call)
steps/interpret/         agentAsInterpret (the model call) + prompt.md + gate.ts + tool.ts
steps/ask/               agentAsAsk (one clarification round; executes on confirmation) + prompt.md
steps/answer/            agentAsAnswer (answer/message screen, OK closes) + prompt.md (answer) + envelope.md (message) + manual.md (manual)
helpers/
  asTypes                data model (catalog + conversation state)
  asSource               JSON object out of defs modules; TypeScript type parser for the l2 contracts
  asCatalog              catalog from l1 requests + l2 contracts + l4 ontology (pure)
  asStor                 reads those files from mls.stor (l5 project.json, controllers -> contractPath)
  asLookup               list queries through the BFF, rows, matching of the user's words
  asPlan                 the conversation as a pure state machine (planNext / applyAnswers / advance / buildWireInput)
  asBff                  same-origin POST /execBff
  asSteps / asIds        task intents, memory, round ids, clarification envelope check
  asLabels / asEntry     fixed UI text (pt/en), mention parsing
  asManual               the app's user manual from its defs (index for interpret, context for the answer)
  asDates                date/timestamp validation (ISO out, DD/MM/AAAA accepted), today for the model
  asBusy                 loading overlay around a round's widget while its answer runs
  asAnswerView           the read-and-OK screen of the answer step
```

Shared code used (not owned here): `l2/aura/molecules/shared/llmTool` (tool schema and
extraction), `widgetDecisionClarification` (the round widget) and `mentionEntry`.

## Test

```
node scripts/run-tests.mjs 102020 l2
```

The agent's own files are `helpers/*.test.ts` and `steps/*/agentAs*.test.ts`.
`helpers/asFixture.test.ts` is data only: a small app in the generators' exact shapes. The live
interpret test calls both strict-tool providers. It runs only with `AGENT_LIVE_TESTS=1` and
`COLLAB_LLM_*` set in `mls-base/.env`.
