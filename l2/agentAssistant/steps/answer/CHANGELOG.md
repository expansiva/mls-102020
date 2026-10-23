# CHANGELOG — answer

- 2026-10-15: created. One call does both jobs (envelope + the answer written from the query's
  data) so a question costs interpret + answer and nothing more. Messages reuse the screen with the
  envelope-only prompt.
- 2026-10-22: manual answers. With state.mode 'manual', the context is asManual.manualContext of
  the selection (the overview when it is empty), rebuilt from the defs at answer time, and the
  prompt is manual.md (plain text, numbered steps, never invented screens/buttons/fields).
