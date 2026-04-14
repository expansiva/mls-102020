/// <mls fileReference="_102020_/l2/molecules/groupEnterDatetime/inlineCalendar.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code. 

export const group = 'groupEnterDateTime';
export const skill = `# Metadata
- TagName: molecules--group-enter-datetime--inline-calendar-102020

# Objective
Fornecer um calendário mensal inline (sempre visível) para seleção de uma única data em páginas de agenda e dashboards, com navegação entre meses e suporte a marcações de datas especiais, respeitando regras de disponibilidade e acessibilidade.

# Responsibilities
- Exibir um calendário mensal inline, sempre visível, sem comportamento de abrir/fechar.
- Permitir ao usuário selecionar uma única data.
- Receber uma data selecionada como valor controlável externamente e refletir esse valor no calendário.
- Atualizar a seleção quando o usuário escolher uma data válida.
- Permitir navegação para mês anterior e próximo, mantendo o calendário inline.
- Determinar o mês/ano inicialmente visível a partir de uma configuração externa; se ausente, usar o mês da data selecionada; se não houver seleção, usar o mês corrente.
- Exibir dias do mês corrente em grade mensal e, quando configurado, incluir dias adjacentes (mês anterior/próximo) para completar a grade.
- Ao selecionar um dia adjacente exibido na grade, atualizar a seleção e mudar o mês visível para o mês correspondente ao dia escolhido.
- Receber uma lista de datas especiais e apresentar uma indicação para cada uma, com possibilidade de associar rótulo e/ou tipo.
- Diferenciar visualmente ao menos dois estados para datas especiais: informativa e bloqueada/indisponível.
- Impedir seleção de datas bloqueadas.
- Aplicar restrições de seleção por data mínima e máxima, tornando indisponíveis e não selecionáveis as datas fora do intervalo.
- Permitir configurar o primeiro dia da semana e refletir isso na ordem dos dias exibidos.
- Permitir configurar idioma/locale para nomes de meses e dias da semana.
- Emitir evento quando o usuário selecionar uma data válida, incluindo a data em formato ISO 8601 (YYYY-MM-DD).
- Emitir evento quando o mês visível mudar por ação do usuário, incluindo ano e mês em formato YYYY-MM.
- Emitir eventos de foco e perda de foco quando aplicável para integração com validação.
- Oferecer uma forma de o consumidor reagir à interação do usuário com uma data marcada (ex.: clique/ação), emitindo um evento específico com identificação da marcação.
- Suportar uso por teclado: mover foco entre dias, selecionar data via teclas de ação, e navegar entre meses por atalhos, com comportamento consistente.

# Constraints
- Não deve executar lógica de negócio: não deve buscar dados, nem gerar automaticamente marcações (ex.: feriados); deve apenas operar com os dados fornecidos.
- Datas bloqueadas não podem ser selecionadas, independentemente do meio de interação (mouse, toque, teclado).
- Datas fora de min/max devem aparecer como indisponíveis e não podem ser selecionadas.
- Em estado disabled, nenhuma interação do usuário deve alterar seleção ou mês visível, nem disparar eventos de seleção; o componente deve se comportar como não interativo.
- Em estado readonly, a seleção não pode ser alterada; a navegação de mês deve seguir a configuração do consumidor (permitida ou não). Se a navegação estiver permitida, deve emitir evento de mudança de mês.
- Em estado required, deve expor/permitir integração com validação de obrigatoriedade (seleção ausente deve ser tratável como inválida pelo consumidor).
- Em estado error, deve indicar estado inválido e permitir exibição de mensagem de erro quando fornecida.
- A navegação por teclado deve respeitar estados disabled e readonly, impedindo mudanças indevidas.
- A emissão de eventos deve ocorrer apenas por ações do usuário (não por simples renderização inicial), exceto quando foco/perda de foco se aplicarem.

# Notes
- Dias adjacentes exibidos na grade devem ser visualmente distintos dos dias do mês corrente.
- O dia selecionado deve ter destaque visual único.
- O dia atual (hoje) deve ter indicação visual diferenciada que não conflite com a seleção.
- O layout deve permanecer estável ao navegar entre meses, evitando variações perceptíveis de altura sempre que possível.`;

