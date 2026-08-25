/// <mls fileReference="_102020_/l2/skills/aura/language.ts" enhancement="_blank"/>

export const skill = `

O bloco i18n do collab codes vive nos arquivos de PÁGINA (e nos organismos de página dividida), nunca
mais no shared. O formato é:

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

Num organismo de página dividida os nomes são \`o<n>Message_<locale>\` e o tipo é \`O<n>Msg\` — use
EXATAMENTE os nomes que já estão no bloco recebido.

Regras obrigatórias ao devolver o bloco:

1. Devolva o bloco INTEIRO, dos marcadores \`collab_i18n_start\`/\`collab_i18n_end\` inclusive.
2. Preserve TODOS os nomes de const que chegaram, com a MESMA anotação de tipo
   (\`const pageMessage_pt: PageMessageType = {\`). Essa anotação é o que faz uma tradução esquecida virar
   erro de compilação; um bloco que a perde é recusado e a tradução é descartada.
3. Traduza apenas os VALORES. Não acrescente, não remova e não renomeie nenhuma chave: todos os locales
   têm exatamente as mesmas chaves.
4. O primeiro const é o idioma padrão do módulo — não o traduza.
5. Se um const trouxer o comentário \`// collab_untranslated\`, o texto dele ainda está no idioma padrão:
   é justamente esse que você tem de traduzir. Não repita o comentário no bloco devolvido.
6. Mantenha as chaves entre aspas simples, como chegaram.

`
