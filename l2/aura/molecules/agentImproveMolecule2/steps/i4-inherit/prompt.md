<!-- modelType: reasoning -->

This molecule is a **shell**: it extends a molecule that lives in another project, and it exists to give that molecule a different appearance. The change that was asked for needs behaviour the shell does not implement itself.

You are **suggesting** where the fix should go. A human decides — your answer arrives pre-selected in front of them, with your reason next to it, and they can override it. That is why the reason matters as much as the choice.

## The three places, and what each costs

**`less` — the shell's own stylesheet.** Costs nothing and keeps the shell inheriting everything. If the request is visual at all — spacing, colour, size, weight, borders, a state's appearance — this is the answer, even when the parent also has an opinion about it.

**`override` — a local override in the shell.** In exchange the shell **stops inheriting that member**: a fix made in the base six months from now no longer reaches this molecule. So pick the smallest member that **can** solve the problem — a property before a narrow method, a narrow method before `render()`.

Smallest among the members that work, never smallest among what is left. A member that cannot carry the change is a **wrong** answer, not a cheap one: overriding a teardown hook does not change how long something lasts, and overriding markup does not change a value the parent computes.

Overriding `render()` gives up all of the parent's markup at once. Of the 84 shells in this library, **zero** do it. If your answer is `render`, be sure nothing narrower works, and say why in the reason.

**`parent` — the fix belongs to the base component.** This agent **never** edits the parent, so choosing this writes nothing and ends the run telling the user which file to open in the base project.

It is often the right answer, and you must not avoid it. A defect in the base is a defect in the base: patching it into one shell leaves every other shell broken, and hides it. Choose `parent` when the request is a **bug in shared behaviour** rather than a difference this shell wants.

## The rule that overrides all of the above

**You may never propose changing the parent's file.** `parent` is a recommendation to the human, not an action. Nothing you answer causes this agent to write outside the current project.

## The molecule

**Tag**: `{{tag}}` — a shell of `{{parentClassName}}` (`{{parentReference}}`)
**Has a `.less` of its own**: {{hasLess}}
**Members it already overrides**: {{ownMembers}}

### Members of the parent you could override, cheapest first

{{overridableMembers}}

### Members of the parent you CANNOT reach

{{unreachableMembers}}

This list is measured from the parent's source, not guessed. **If what has to change lives in one of these, no override in this shell can express it, and the answer is `parent`.** That is the common case when the list of overridable members above is short: the members that implement the behaviour are private, and the value being asked about is a module constant.

### Its public surface

{{surface}}

## The request

{{userPrompt}}

## What the triage concluded

{{triage}}

## Output

Return JSON only. Do not call tools. Do not explain. The exact payload:

```json
{
  "type": "clarification",
  "json": {
    "planId": "i4-inherit",
    "title": "<short title in {{userLanguage}}>",
    "where": "less | override | parent",
    "member": "<member of the parent to override, ONLY when where is 'override'; omit otherwise>",
    "reason": "<one or two sentences in {{userLanguage}}, the argument the human weighs>"
  }
}
```
