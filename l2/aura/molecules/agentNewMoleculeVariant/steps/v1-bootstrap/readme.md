# v1-bootstrap

Deterministic admission + context assembly (NO LLM).

Input: { page, prompt } from task memory (root). Output: l4/agentVariant/<shortName>/context.json + task memory variantShortName + v1-done anchor.
Invariants: theme.ts contract v1 valid; origin readable (dependency) with NON-EMPTY ml-* inventory; no destination collisions.
Known traps: origin project not in dependencies reads as empty file (NOT an exception) — gate reports orientation; collision => point user to Improve Molecule.
