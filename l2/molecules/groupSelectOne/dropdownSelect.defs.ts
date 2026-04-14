/// <mls fileReference="_102020_/l2/molecules/groupSelectOne/dropdownSelect.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code. 

export const group = 'groupSelectOne';
export const skill = `# Objective
Permitir que o usuário selecione uma única opção em um dropdown, com suporte completo a interação por mouse e teclado, fechamento ao clicar fora e feedback visual claro para estados de hover, item ativo e item selecionado.

# Responsibilities
- Exibir um gatilho (trigger) que mostra o valor selecionado ou um placeholder quando não há seleção.
- Abrir e fechar o painel de opções ao interagir com o trigger.
- Permitir seleção única de uma opção e refletir a seleção na propriedade \`value\` (string | null).
- Receber a lista de opções e a estrutura do conteúdo por meio de Slot Tags (Trigger, Value/placeholder, Content, Group/label opcional, Item, Empty).
- Ao abrir o dropdown, definir um “item ativo” inicial:
  - O item atualmente selecionado, quando existir e não estiver desabilitado; caso contrário,
  - O primeiro item não desabilitado disponível.
- Navegar entre opções via teclado quando o dropdown estiver aberto:
  - ArrowDown e ArrowUp movem o item ativo entre itens não desabilitados.
- Selecionar via teclado:
  - Enter seleciona o item ativo (se não desabilitado) e fecha o dropdown.
  - Escape fecha o dropdown sem alterar o valor atual.
- Selecionar via mouse:
  - Clique em um item seleciona (se não desabilitado) e fecha o dropdown.
- Fechar o dropdown ao detectar clique fora do componente.
- Tratar itens desabilitados:
  - Não podem ser selecionados por clique.
  - Não podem se tornar item ativo.
  - Devem ser ignorados durante a navegação por teclado.
- Emitir eventos:
  - Emitir evento \`change\` ao selecionar um item, com \`detail: { value }\`.
  - Emitir evento \`blur\` quando o trigger perder foco (ou quando o fechamento implicar perda de foco, conforme o contrato do grupo).
- Expor comportamento de acessibilidade com semântica de dropdown/listbox:
  - Trigger sinaliza que controla uma lista e reflete o estado aberto/fechado.
  - Lista se comporta como listbox.
  - Itens se comportam como options e refletem seleção.
- Aplicar feedback visual observável:
  - Hover para itens interativos.
  - Destaque persistente para item selecionado.
  - Destaque visível para item ativo (navegação por teclado), distinto do selecionado.
  - Aparência diferenciada para itens desabilitados.
  - Apresentação de estados de erro e loading.

# Constraints
- O componente deve manter apenas seleção única; não deve permitir múltiplas seleções.
- O valor selecionado deve ser sempre \`string\` (quando selecionado) ou \`null\` (quando não houver seleção).
- Seleção não deve ocorrer quando:
  - O item estiver desabilitado.
  - O componente estiver em estado \`disabled\`.
  - O componente estiver em estado \`readonly\`.
  - O componente estiver em estado \`loading\`.
- Quando \`readonly\` estiver ativo, o componente não deve permitir alterar \`value\` por qualquer interação do usuário, mas pode apresentar o valor.
- Quando \`disabled\` estiver ativo, o componente não deve responder a interações do usuário (abrir, navegar, selecionar).
- Quando \`loading\` estiver ativo, o componente deve bloquear interações e exibir indicação textual/visual de carregamento.
- Fechamento via Escape não deve alterar \`value\`.
- Clique fora deve fechar apenas quando o dropdown estiver aberto.
- Itens desabilitados devem ser sempre pulados na navegação por teclado; não podem se tornar item ativo.
- O evento \`change\` deve ocorrer somente quando a seleção efetivamente for realizada por ação do usuário (não ao abrir/fechar sem seleção).
- O componente não deve implementar validação de negócio; \`required\`, \`name\` e \`error\` devem afetar apenas apresentação/atributos e bloqueios de interação conforme contrato do grupo.
- O estado de erro (\`error\`) deve refletir visualmente no trigger e, quando aplicável, permitir exibição de mensagem auxiliar sem impor regras de validação.

# Notes
- O slot \`Empty\` deve ser apresentado quando não houver itens disponíveis para seleção.
- O slot \`Group\` pode ser usado para exibir um rótulo/agrupamento, sem alterar a lógica de seleção.
- A distinção visual entre “item selecionado” e “item ativo” deve ser clara para suportar navegação por teclado.`;

