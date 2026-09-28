<!-- mls fileReference="_102020_/l2/agentMaterializeL2/steps/help/readme.md" enhancement="_blank" -->

# help

## Role

`agentCfeHelp` renders the CLI-style help for the root slash commands.

## Input

- Root command `/help`.

## Output

- A completed task step with the help text.

## Invariants

- Help is deterministic and must match the command parser in `agentMaterializeL2.ts`.
