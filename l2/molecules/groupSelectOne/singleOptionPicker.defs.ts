/// <mls fileReference="_102020_/l2/molecules/groupSelectOne/singleOptionPicker.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code. 

export const group = 'groupSelectOne';
export const skill = `# Objective
Permitir que o usuário selecione exatamente 1 opção dentre várias opções apresentadas, exibindo claramente o estado selecionado e comunicando mudanças ao sistema, sem aplicar lógica de negócio.

# Responsibilities
- Exibir um conjunto de opções mutuamente exclusivas para escolha única.
- Permitir que o usuário selecione uma única opção e substituir a seleção anterior quando aplicável.
- Refletir visualmente a opção atualmente selecionada com base no valor recebido por propriedade.
- Emitir um evento padronizado de mudança quando o usuário alterar a seleção, incluindo o valor selecionado.
- Bloquear interação e indicar visualmente quando estiver em estado desabilitado.
- Exibir um estado de carregamento opcional e bloquear interação enquanto estiver ativo.
- Exibir um estado de validação/erro opcional (ex.: inválido + mensagem) apenas para apresentação.
- Renderizar as opções fornecidas como conteúdo declarativo (itens passados pelo consumidor) e apresentar seus rótulos.
- Permitir navegação por teclado: mover foco entre opções com setas, selecionar com Enter/Espaço e participar do fluxo de Tab.
- Fornecer marcação acessível: papel apropriado do grupo e itens, indicação de selecionado e de desabilitado para tecnologias assistivas.
- Exibir placeholder e/ou label configuráveis por propriedade para suportar textos e i18n.

# Constraints
- Deve permitir selecionar exatamente 1 opção por vez; não pode haver múltiplas seleções simultâneas.
- Quando desabilitado, não deve permitir mudança de seleção por mouse, toque ou teclado, e não deve emitir evento de mudança.
- Quando em carregamento, deve bloquear mudanças de seleção e não deve emitir evento de mudança.
- Não deve aplicar regras de negócio (ex.: validação de domínio, decisões condicionais de seleção); apenas exibir estados recebidos.
- Não deve realizar chamadas remotas ou depender de fonte de dados externa.
- Deve aceitar as opções exclusivamente como itens declarados pelo consumidor (sem impor origem de dados específica).
- Deve emitir evento de mudança com comportamento de propagação habilitado (bubbles) e atravessando fronteiras de composição (composed).
- Deve manter consistência de acessibilidade: o estado visual de selecionado/desabilitado deve corresponder aos atributos acessíveis.
- Não deve utilizar Shadow DOM.

# Notes
- O componente pode ser apresentado em diferentes estilos de layout (ex.: lista em coluna ou estilo segmentado) desde que mantenha o comportamento de escolha única.
- A apresentação de hover/focus, selecionado, desabilitado, carregamento e inválido deve ser claramente perceptível e consistente.`;


