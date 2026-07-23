# v5-demo

LLM demo page (.html) — the molecule's sibling html IS the demo.

Input: context.json + origin .ts + group usage skill + themeInfo.background. Output: l2/molecules/<group>/<shortName>.html + v5-done anchor (ALWAYS emitted — ok:false on persistent failure so v6-summary still runs).
Gate: raw html, no <script>, variant tag >= 3 uses, page container carries themeInfo.background.css EXACTLY. Retry <= 1.
Post-processing: playgroundDinamicState placeholder substituted deterministically (helpers/vTemplates.substituteDemoState, port of agentNewMoleculePlayground).
