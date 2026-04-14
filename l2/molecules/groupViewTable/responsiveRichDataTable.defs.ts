/// <mls fileReference="_102020_/l2/molecules/groupViewTable/responsiveRichDataTable.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code. 

export const group = 'groupViewTable';
export const skill = `# Objective
Exibir uma tabela de dados responsiva em formato tradicional, permitindo que o sistema apresente registros com colunas configuráveis e células com conteúdo rico, com suporte a seleção de linhas e emissão de eventos de interação.

# Responsibilities
- Renderizar os dados em um layout de tabela tradicional, com cabeçalho e corpo, adaptando-se a telas pequenas com rolagem horizontal quando necessário.
- Aceitar a definição de colunas por meio de Slot Tags, permitindo configurar rótulo, alinhamento e largura por coluna.
- Aceitar a definição de linhas por meio de Slot Tags, garantindo associação estável entre linha (id) e suas células (key).
- Exibir conteúdo rico dentro das células conforme fornecido pelo desenvolvedor, preservando a estrutura e a semântica do conteúdo apresentado.
- Oferecer seleção de linhas conforme modo configurado: nenhuma, seleção única ou seleção múltipla.
- Exibir, quando configurado, uma coluna dedicada de seleção (checkbox ou radio) alinhada ao modo de seleção.
- Refletir visualmente os estados de interação: hover de linha, linha selecionada e foco de teclado.
- Permitir interação por teclado para seleção de linha (Enter/Espaço) quando a linha estiver focada e a seleção estiver habilitada.
- Emitir eventos de interação:
  - Ao selecionar ou desselecionar linhas.
  - Ao clicar em uma linha (quando habilitado).
  - Ao acionar um elemento marcado como ação dentro de uma célula.
  - Opcionalmente, ao interagir com o cabeçalho quando necessário para delegar comportamentos a camadas superiores.
- Exibir um estado vazio quando não houver linhas, usando conteúdo fornecido via Slot Tag específica.

# Constraints
- Não deve implementar paginação, ordenação ou filtragem; quando aplicável, deve apenas sinalizar interações por eventos para que camadas superiores decidam o comportamento.
- Quando em estado disabled ou readonly:
  - Não deve permitir alterações de seleção.
  - Deve impedir affordances de interação relacionadas à seleção.
  - Deve manter a capacidade de visualização e rolagem do conteúdo.
- A seleção deve respeitar o modo configurado:
  - Em modo "none", nenhuma ação deve alterar seleção.
  - Em modo "single", no máximo uma linha pode ficar selecionada.
  - Em modo "multiple", múltiplas linhas podem ficar selecionadas.
- Quando uma seleção controlada for fornecida externamente:
  - A tabela deve refletir o estado informado.
  - Interações do usuário devem apenas emitir eventos solicitando mudança, sem assumir que a seleção foi efetivada.
- Deve garantir acessibilidade:
  - Linhas selecionadas devem expor estado selecionado por atributos apropriados.
  - Controles de seleção devem ter rótulos acessíveis.
  - A navegação por teclado deve ser possível, com indicadores de foco visíveis.

# Notes
- O conteúdo de células é considerado fornecido pelo desenvolvedor; a tabela apenas apresenta o conteúdo e reporta interações.
- Uma legenda (caption) pode ser exibida quando fornecida, melhorando a compreensão e acessibilidade do conjunto de dados.`;

