/// <mls fileReference="_102020_/l2/molecules/groupEnterDatetime/datePicker.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code. 

export const group = 'groupEnterDateTime';
export const skill = `# Metadata
- TagName: molecules--group-enter-datetime--date-picker-102020

# Objective
Permitir que o usuário selecione uma única data por meio de um campo com calendário em dropdown, exibindo a data formatada conforme locale e emitindo/recebendo o valor como data civil em string ISO no formato exato YYYY-MM-DD.

# Responsibilities
- Permitir seleção de uma única data.
- Aceitar um valor inicial/externo e refletir visualmente a data selecionada.
- Manter e expor o valor como string ISO estrita no formato YYYY-MM-DD (sem horário e sem conversão por fuso).
- Exibir a data selecionada em formato legível conforme o locale configurado, sem alterar o formato do valor (ISO).
- Exibir placeholder quando não houver data selecionada.
- Abrir e fechar o calendário em dropdown a partir de interação do usuário.
- Fechar o dropdown ao clicar fora, sem alterar o valor.
- Permitir navegação no calendário entre meses e anos, atualizando a grade de dias conforme o mês/ano ativo.
- Permitir seleção de um dia no mês exibido; ao selecionar, atualizar o valor ISO e, por padrão, fechar o dropdown.
- Suportar configuração de data mínima (min) e máxima (max) em ISO YYYY-MM-DD.
- Indicar visualmente e bloquear interação com dias fora do intervalo min/max, sem gerar mudança de valor.
- Permitir limpar a seleção (valor vazio/nulo) quando o controle não for obrigatório; ao limpar, atualizar o valor exposto e sinalizar a mudança.
- Quando obrigatório, impedir limpeza que resulte em valor vazio e sinalizar estado inválido/erro.
- Suportar estados disabled e readonly:
  - disabled: impedir qualquer interação, incluindo abertura do dropdown.
  - readonly: impedir alteração do valor; o comportamento de permitir ou não visualizar o calendário deve ser explicitamente configurável.
- Suportar estado loading: enquanto ativo, bloquear interação e impedir seleção.
- Suportar propriedade name para integração com formulários quando aplicável no contexto.
- Reagir a mudanças dinâmicas de value, min, max e locale, atualizando imediatamente:
  - seleção exibida
  - disponibilidade (habilitado/desabilitado) dos dias
  - formatação apresentada
- Validar valor recebido externamente:
  - quando não estiver no formato YYYY-MM-DD e/ou estiver fora de min/max, expor estado de erro conforme regra definida.
  - o comportamento em caso de valor inválido deve ser determinístico e documentado.
- Definir e aplicar comportamento explícito quando value estiver fora de min/max:
  - ou manter selecionado e marcar como inválido
  - ou ajustar automaticamente para o limite aplicável
- Emitir eventos de integração:
  - change quando o valor mudar por ação do usuário (novo ISO YYYY-MM-DD ou vazio)
  - blur quando o controle perder foco
  - open/close opcionalmente quando o dropdown abrir/fechar
- Suportar navegação por teclado:
  - abrir/fechar via teclado
  - mover foco entre dias
  - confirmar seleção
  - respeitar min/max/disabled/readonly/loading

# Constraints
- O valor exposto deve sempre ser uma data civil ISO no formato exato YYYY-MM-DD, sem horário e sem fuso.
- Não deve haver conversão por timezone ao exibir, navegar ou selecionar datas; a data ISO deve corresponder ao mesmo dia civil.
- Datas fora de min/max não podem ser selecionadas e não podem disparar change.
- Quando disabled=true ou loading=true, nenhuma interação deve alterar valor, abrir dropdown ou mover seleção.
- Quando readonly=true, nenhuma interação deve alterar o valor; a permissão de abrir/visualizar o calendário deve seguir a configuração definida.
- Quando required=true, a seleção não pode resultar em valor vazio; tentativa de limpar deve manter o valor e sinalizar invalidez/erro.
- A exibição formatada conforme locale não pode modificar o valor armazenado/emitido.
- A validação de value inválido (formato incorreto e/ou fora de min/max) deve resultar em um estado consistente (erro e/ou normalização) conforme regra declarada.

# Notes
- Locale deve influenciar a formatação exibida e, quando aplicável, o primeiro dia da semana e nomes de meses/dias, sem alterar o valor ISO.
- O dropdown deve se comportar como sobreposição associada ao campo, mantendo-se utilizável (ex.: não ocultar o controle) dentro das limitações do espaço disponível.`;

