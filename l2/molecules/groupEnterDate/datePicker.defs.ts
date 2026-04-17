/// <mls fileReference="_102020_/l2/molecules/groupEnterDate/datePicker.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code. 

export const group = 'groupEnterDate';
export const skill = `# Metadata
- TagName: molecules--group-enter-date--date-picker-102020

# Objective
Permitir que usuários selecionem e informem uma data (somente data, sem horário) em formulários, por digitação ou por seleção em um calendário, com validação, estados de interação e emissão de eventos.

# Responsibilities
- Permitir definir, visualizar e atualizar um valor de data sem capturar ou exibir horário.
- Aceitar e expor o valor como string em formato consistente (por exemplo, YYYY-MM-DD) e manter consistência ao refletir mudanças externas e ao emitir eventos.
- Exibir um campo de entrada que permita digitação direta de data.
- Disponibilizar abertura e fechamento de um painel de calendário para seleção de um dia.
- Permitir seleção de um dia específico no calendário quando disponível.
- Destacar visualmente o dia selecionado e o dia atual quando o calendário estiver visível.
- Indicar e impedir interação com dias fora das restrições configuradas.
- Permitir configuração de data mínima e máxima e aplicar as restrições tanto na digitação quanto na seleção via calendário.
- Suportar estados: disabled, readonly, required e loading, alterando o comportamento de interação e a apresentação conforme o estado.
- Bloquear interação quando estiver disabled ou loading.
- Impedir alteração de valor quando estiver readonly.
- Permitir limpar o valor quando não for required e quando não estiver disabled nem readonly.
- Validar a entrada digitada quanto a formato e sinalizar erro quando inválida.
- Não substituir automaticamente o último valor válido por um valor inválido digitado.
- Validar e sinalizar erro para violações de required, min e max.
- Expor estado/mensagem de erro configuráveis e também apresentar erros gerados por validações internas.
- Fornecer placeholder quando não houver valor.
- Emitir evento de mudança quando a data for alterada com sucesso, contendo o novo valor e o valor anterior quando disponível.
- Emitir evento de blur quando o componente perder foco.
- Reagir a mudanças externas do valor (propriedade/atributo), atualizando a exibição e a seleção no calendário.
- Suportar interações por teclado no calendário aberto, incluindo navegação, confirmação e cancelamento, mantendo comportamento previsível de foco.
- Suportar interações por ponteiro para abrir/fechar o calendário e selecionar datas.
- Ao clicar fora com o calendário aberto, fechar o painel sem alterar o valor, a menos que a seleção já tenha sido confirmada.
- Permitir internacionalização básica de rótulos e mensagens exibidas (por exemplo, placeholder e mensagens de erro) conforme configuração/idioma do ambiente.
- Manter compatibilidade com formulários, expondo um nome identificador (quando aplicável) e um valor serializável para submissão equivalente a um campo de data.

# Constraints
- O componente deve tratar o valor exclusivamente como data; não deve coletar, armazenar, exibir ou emitir informações de horário.
- Em estado disabled:
  - Não deve aceitar foco para alteração, nem permitir abrir o calendário, nem permitir limpar ou modificar o valor.
- Em estado readonly:
  - Deve exibir o valor, mas não deve permitir mudanças por digitação, calendário ou limpeza.
- Em estado loading:
  - Deve bloquear qualquer interação que altere estado/valor e indicar indisponibilidade temporária.
- Quando required estiver ativo:
  - Não deve permitir que o valor seja deixado vazio sem sinalizar erro de obrigatoriedade.
- Se min e/ou max estiverem configurados:
  - Não deve permitir seleção de datas fora do intervalo.
  - Deve sinalizar erro quando um valor informado estiver fora do intervalo.
- Em caso de entrada com formato inválido:
  - Deve sinalizar erro.
  - Não deve substituir o último valor válido automaticamente.
- Ao fechar o calendário por perda de foco/clique fora:
  - Não deve alterar o valor caso não exista confirmação de alteração.
- O valor emitido em eventos e fornecido para submissão deve manter o formato consistente definido para o componente.

# Notes
- “Confirmação” de seleção deve ser interpretada como uma ação clara do usuário que finalize a escolha (por exemplo, selecionar um dia quando isso já for considerado confirmação, ou usar uma ação explícita de confirmar), mantendo consistência de comportamento.
- As mensagens internacionalizadas devem cobrir, no mínimo, placeholder e mensagens relacionadas a inválido e fora do intervalo.`;

