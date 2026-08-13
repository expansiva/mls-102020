# CHANGELOG — i4-inherit

## 2026-08-13 — the suggestion was picking an incapable member

Measured in the Studio on `mls-102055/.../ml-copy-button-glass`. Asked to make the copy confirmation
last 3 seconds, the suggestion came back `override disconnectedCallback` — a teardown hook that cannot
change a duration held in `const COPY_CONFIRM_MS = 2000`, a module constant. The reason field read
plausibly ("sobrescrever o método estreito que controla esse ciclo") over a wrong member.

**The cause was a silent filter.** `overridableMembersOf` drops private members — correctly, they do
not compile as overrides — but it dropped them *without telling anyone*. Every method of the
confirmation cycle in that parent is private, so the model was handed a two-item list (`render`,
`disconnectedCallback`), told to pick the cheapest that solves the problem, and had no way to learn
that the members which DO implement the behaviour exist and are out of reach. It picked the cheapest of
what was left. `render` at cost 100 was correctly rejected as expensive; `disconnectedCallback` at
cost 20 *led* the list.

Three changes, and the split between them is the point — what code can decide, code decides:

- **`unreachableMembersOf` (new, in `imInherit`)** — private members and module-scope constants of the
  parent, each with the reason, carried on `ImInheritance.unreachableMembers` and rendered into the
  prompt as its own section. This is the evidence that makes `parent` derivable instead of a
  guess: "the duration is a module constant" is a fact, and what follows from it is not a judgement
  call;
- **lifecycle hooks cost 90** — just under `render`. They stay overridable, because a shell may
  legitimately intercept one, but they can no longer *head* a list ordered cheapest-first. A narrow
  method still beats them;
- **`member_unreachable` (new gate code)** — naming a private member or a module constant fails with
  the reason and with the conclusion spelled out. Before, it fell through to `member_unknown` ("is not
  a member of the parent class"), which is **false** — the member exists — and sent the retry hunting
  for a typo. It binds the human's confirmation too: a private override does not compile for anyone.

**Deliberately NOT done: forcing `parent` in code when no narrow member exists.** Whether a member can
carry a given change is semantic, and a gate that decided it would forbid the legitimate
override-`render` case (a markup variation on a shell). Code supplies the facts and the ordering; the
choice stays with the model and the human.

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

## 2026-08-10 — 'parent' pendurava o run, e Confirmar não fazia nada

Primeiro run real da rota C. O widget montou, as três opções apareceram, e escolher **"a correção é
do componente base"** + Confirmar **não fazia nada**.

**A causa:** a versão anterior tinha o comentário *"No i4-done anchor is emitted, so i3-edit never
starts"* — e isso estava certo sobre o i3 e errado sobre o run. Os passos i3/i5/i6/i7 **já haviam
sido plantados pelo roteador**, esperando uma âncora que nunca chegaria. Somado ao `resume: false`,
o pooling não continuava. O passo ficava verde e a tarefa ficava presa para sempre.

Eu tratei "não executável" como "não emitir âncora". São coisas diferentes: **'parent' é um desfecho
legítimo — muitas vezes o certo — e um desfecho legítimo não pode parecer falha.**

**Conserto:** a âncora É emitida, carregando `where: 'parent'`. O `i3-edit` lê e completa como no-op
declarado, sem chamar modelo; i5 e i6 fazem no-op na sequência; o i7 fecha com a instrução de qual
arquivo abrir no projeto da base **e com o relatório de coerência**. Nada é escrito em arquivo
nenhum, e o run **termina**.

Descartada a alternativa de marcar o passo como `failed` com a instrução: seria uma linha, e
ensinaria o usuário que a resposta mais correta da rota C é um erro vermelho.
