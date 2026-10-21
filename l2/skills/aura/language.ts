/// <mls fileReference="_102020_/l2/skills/aura/language.ts" enhancement="_blank"/>

export const skill = `

The collab codes i18n block lives in the PAGE files (and in the organisms of a split page), never in the
shared any more. Its format is:

\`\`\`typescript

/// **collab_i18n_start**

const pageMessage_pt = {
    'column.project.name.label': 'Nome',
    'column.project.address.label': 'Endereço',
};
type PageMessageType = typeof pageMessage_pt;
const pageMessage_en: PageMessageType = {
    'column.project.name.label': 'Name',
    'column.project.address.label': 'Address',
};
const pageMessages: { [key: string]: PageMessageType } = { 'pt': pageMessage_pt, 'en': pageMessage_en };

/// **collab_i18n_end**

\`\`\`

In a split page organism the names are \`o<n>Message_<locale>\` and the type is \`O<n>Msg\` — use EXACTLY
the names already in the block you receive.

Mandatory rules when returning the block:

1. The WHOLE block, markers \`collab_i18n_start\`/\`collab_i18n_end\` included, goes as TEXT in the \`i18n\`
   field of the JSON answer — never as bare TypeScript, never inside \`\`\`. The example above shows only the
   content of that text.
2. Keep EVERY const name you received, with the SAME type annotation
   (\`const pageMessage_pt: PageMessageType = {\`). That annotation is what turns a forgotten translation into a
   compile error; a block that loses it is rejected and the translation is discarded.
3. Translate only the VALUES. Do not add, remove or rename any key: every locale has exactly the same keys.
4. The first const is the module's default language — do not translate it.
5. If a const carries the comment \`// collab_untranslated\`, its text is still in the default language: that
   is exactly the one you must translate. Do not repeat the comment in the returned block.
6. Keep the keys in single quotes, as they came.
7. Every \`const\` and every \`type\` appears exactly ONCE. The \`type PageMessageType = typeof …\` line stays
   where it was: never drop it and never repeat it after the new locale. Add the new locale only as a new
   const and in the final map (\`pageMessages\`).

`
