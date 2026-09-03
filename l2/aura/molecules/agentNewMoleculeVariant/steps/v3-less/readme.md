# v3-less

THE generation LLM call: the complete theme sheet.

Input: context.json + theme skill payload + origin .ts/.less + example .less (or cold-start instruction). Output: l2/molecules/<group>/<shortName>.less + v3-done anchor.
Gate: fences, brace balance, variant-tag scope, portal selector iff portal, ml-* subset of inventory, no Tailwind LAYOUT selectors, tokens defined, motion stance. Retry <= 1 with gate errors in context; 2nd failure = task fails readable.
Known LLM traps: inventing ml-* classes not in the inventory; forgetting the -webkit-backdrop-filter pair (glass); markdown fences around the sheet.
