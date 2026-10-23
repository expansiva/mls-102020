# CHANGELOG — agentAssistant

- 2026-10-14: created. The root uses skipRootLLM and plants `interpret`. `interpret` makes one
  model call and then resolves deterministically. `ask-<n>` handles one round each. The catalog is
  read from l5 + l1 controllers/requests + l2 contracts + l4 ontology, and the state lives in
  longMemory. First target: comandaRestaurante on mls-102047.
- 2026-10-15: sequences. "abrir comanda para a mesa 2 e lançar 1 bife" used to come back as two
  alternatives, and the user could pick only one. interpret now returns `mode` (`alternatives` |
  `sequence`). A sequence is confirmed once as a plan and then run in order by `asPlan.advance`,
  which resolves each action only after the previous one ran and stops at the first failure.
  The same command may repeat inside a sequence. The state schema moved to v2, so tasks started
  before this cannot be resumed.
- 2026-10-15: questions. "qual o valor total da comanda 4?" used to end the task without showing
  anything: only commands were in the catalog, so the gate dropped every candidate and the
  "nothing fits" text was only a result-step title. Read routes are now `catalog.queries`, and
  interpret has a `question` mode that picks one query, which runs without a confirmation. The
  new `answer` step writes the answer from the query's data and shows it with an OK button that
  closes the task. Messages that used to go unnoticed (nothing fits, a failed query) use the same
  screen. The state schema moved to v3.
- 2026-10-21: two fixes found while checking the new module `tarefas` (mls-102047).
  (1) Optional record inputs are resolved only when the user mentioned them. Before, every record
  input was resolved, so `cmdCriarTarefa` would ask "who is the creator" (`criadorId`, optional,
  and the server only accepts the session's person).
  (2) Dates: inputs and filters typed `date`/`timestamp` in the ontology are validated and sent as
  ISO (helpers/asDates); a typed `DD/MM/AAAA` is accepted, free text is not. interpret sends
  "## Today" (local date, weekday, time) so the model resolves "amanhã"/"sexta", and the prompt
  asks for `YYYY-MM-DD` / `YYYY-MM-DDTHH:mm`. The confirmation shows dates in the user's form.
- 2026-10-22: manual mode. Questions like "como fechar uma comanda?" or "quais módulos existem?"
  are answered from the app's defs only (helpers/asManual: l4 module/access/rules/journeys, the l4
  menu, l2 page defs, l1 controllers). interpret receives a short "## App map" and a `manual`
  selection in its tool output (schema v4). The answer step writes the manual with
  steps/answer/manual.md. Existing modes are unchanged; if the manual cannot be read, the mode is
  not offered. State schema v4.
