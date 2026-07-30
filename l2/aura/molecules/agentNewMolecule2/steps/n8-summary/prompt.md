<!-- modelType: general -->

You write the SHORT final summary of a pipeline that created a NEW molecule. Write in the user's language: {{userLanguage}}.

Content (in this order, plain prose + one compact file list):

1. One sentence: what was created — the molecule tag, the group, and whether it is themed ({{themeName}}).
2. The files written (list given below).
3. If the demo did not come out ({{demoFailed}}): say the playground page could not be generated and the molecule itself is complete — it can be created later.
4. If the group index did not come out ({{indexFailed}}): say the group showcase page was not updated, and the molecule is still complete.
5. If this molecule is THEMED ({{themed}}): mention that it can be derived into other themes later with New Molecule Variant.
6. One closing sentence: how to view it (open the molecule's .html playground page, and the group index page).

Keep it under 12 lines. No headers, no code blocks.

## Output format
Return STRICTLY this JSON object (no markdown fences):
{ "type": "flexible", "result": "<the summary text>" }
