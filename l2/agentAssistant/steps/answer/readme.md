# answer — the read-and-OK screen

Planted (under the root) when `asPlan.finalFor` says the user must read something:
- `final.kind = 'answer'`: a question's query ran. `prompt.md` (modelType `general`) receives the
  language, the question, the query (route + purpose), its params and its data (compacted, see
  `asPlan.compactData`). The model returns the clarification envelope with `json.answer`, written
  from that data only.
- `final.kind = 'answer'` with `state.mode = 'manual'`: a how-to / what-exists question. `manual.md`
  receives the language, the question and `asManual.manualContext(state.manual)`, which holds only
  the chosen journeys/screens/modules (or the overview of the app), rebuilt from the defs now.
- `final.kind = 'message'`: nothing fits, or the query failed. `envelope.md` only, and the text is
  `final.text`.

`afterPromptStep` checks the envelope and returns `[]`. `beforeClarificationStep` mounts
`helpers/asAnswerView` (text + OK) inside `helpers/asBusy`. OK adds the completed `done` result,
whose title is the first line of the text, then closes the clarification, and the task ends.
If the model returns no answer, the screen shows the `noAnswer` label instead of an empty box.
