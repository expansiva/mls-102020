# CHANGELOG — i4-inherit

## 2026-08-06 — first version

- **Built with a tool call first, and that was wrong.** A tool result is not a
  `{ type: 'clarification', json }` envelope, so the payload would never have rendered a checkpoint
  and the widget would never have mounted — the step would have "worked" and silently skipped the
  human. Switched to `nmClarificationPromptReady`, the mechanism n2-plan already uses. The
  `schemas/i4-inherit.schema.json` written for the tool call was deleted rather than left behind:
  the envelope shape lives in the prompt, and an unused schema in `schemas/` reads as the contract.
- **`parent` is offered prominently and is not executable.** Both halves are deliberate. Hiding it
  would push users into an override that is only the reachable answer, and patching shared
  behaviour into one shell leaves every other shell broken while hiding the defect.
- **The member map is only enforced when it is populated.** Across an unreadable project
  `imInherit` returns an empty list; refusing every name there would leave the user unable to
  answer a question they were still asked. The widget switches to a free-text field in that case.
- `applyInheritWhere` clears the member when the choice moves away from `override`. Without it,
  override → `render` → less submits `{ where: 'less', member: 'render' }`, the gate passes it, and
  `inherit.json` records a member nobody chose.
- Members the shell already overrides are **marked, not hidden**: seeing `portalWidgetName` already
  overridden is what tells the user the shell has a local answer to a related question.
- The widget is this step's own, not `shared/`: only this step mounts it. If a second agent ever
  asks the same question, it moves — same rule that moved `imSurface` and `slotIsExercised`.
- `render()` is flagged in three places (cost 100 in `imInherit`, a dashed warning border, an
  explicit sentence). 0 of the 84 real shells override it; the widget should not make it look like
  a normal option.
