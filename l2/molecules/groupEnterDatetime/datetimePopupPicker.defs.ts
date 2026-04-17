/// <mls fileReference="_102020_/l2/molecules/groupEnterDatetime/datetimePopupPicker.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code. 

export const group = 'groupEnterDatetime';
export const skill = `# Metadata
- TagName: molecules--group-enter-datetime--datetime-popup-picker-102020

# Objective
Permitir que o usuário visualize, selecione e confirme um valor único de data e hora (datetime) por meio de um campo de entrada que abre um popup com calendário e seletor de hora, respeitando regras de passo de minutos, estados do componente e regras de fechamento.

# Responsibilities
- Exibir um campo de entrada que represente um valor de data+hora (datetime) em um único controle.
- Abrir um popup de seleção ao clicar no campo ou ao receber foco por teclado (quando permitido).
- Apresentar no popup duas áreas funcionais: um seletor de data (calendário) e um seletor de hora (horas e minutos).
- Permitir selecionar uma data no calendário e refletir essa escolha como valor pendente no popup.
- Permitir selecionar hora e minutos e refletir essa escolha como valor pendente no popup.
- Manter a seleção de hora/minutos ao alterar apenas a data, e manter a data ao alterar apenas a hora/minutos.
- Disponibilizar uma ação de “Confirmar” no popup para aplicar o valor pendente como valor final do componente.
- Fechar o popup automaticamente após a confirmação.
- Fechar o popup automaticamente ao detectar clique fora do componente/popup.
- Ao fechar por clique externo, descartar alterações pendentes e manter o último valor confirmado.
- Disponibilizar uma ação de “Cancelar” opcional (quando habilitada/configurada) que fecha o popup sem confirmar alterações pendentes.
- Permitir limpar o valor (quando habilitado), definindo o componente como vazio/nulo e refletindo isso no campo.
- Exibir e manter sincronizados: (a) o valor no campo e (b) a seleção inicial do popup ao abrir.
- Atualizar o valor exibido e a referência usada pelo popup quando o valor for alterado externamente.
- Emitir evento de mudança ao confirmar um novo valor.
- Emitir evento de blur quando o campo perder foco.

# Constraints
- minuteStep deve controlar o incremento permitido/mostrado para minutos.
- Minutos devem ser selecionáveis apenas quando forem múltiplos de minuteStep; valores fora do passo não podem ser selecionados.
- Enquanto o popup estiver aberto, mudanças de data/hora devem afetar somente o valor pendente; o valor final só pode mudar mediante confirmação explícita.
- A mesma instância não pode manter mais de um popup aberto simultaneamente.
- Regras de teclado:
  - Esc deve fechar o popup sem confirmar alterações pendentes.
  - Enter no contexto do popup deve confirmar quando houver um valor pendente confirmável.
- Estados do componente:
  - disabled deve impedir foco, abertura do popup e qualquer interação.
  - readonly deve impedir alteração do valor; a possibilidade de abrir apenas para visualização deve seguir o contrato do grupo.
  - required deve ser respeitado para integração com validação/formulários.
  - error deve ser refletido como estado de erro do componente (sem alterar regras de confirmação/fechamento).
- Valor e formato:
  - value deve ser aceito como valor inicial/controlado e refletido no campo e no popup.
  - O valor deve ser representado como string datetime em formato consistente (por exemplo, ISO 8601) ou null quando vazio, conforme contrato do grupo.
- Limites (quando suportados pelo contrato do grupo):
  - min e max devem restringir a seleção, impedindo escolhas fora do intervalo.
  - Opções indisponíveis por min/max devem permanecer não selecionáveis.
- Abertura do popup:
  - Ao abrir, a seleção inicial deve refletir o value atual.
  - Se o value estiver vazio, o popup deve iniciar com uma data/hora padrão sem confirmar automaticamente.
- Atualização dinâmica de minuteStep:
  - Se minuteStep mudar enquanto o popup estiver aberto, as opções/seleção de minutos devem se ajustar.
  - O valor pendente só pode ser mantido se continuar válido; caso contrário, deve ser ajustado para um múltiplo válido de acordo com uma regra determinística definida pelo contrato do grupo.

# Notes
- O popup deve ser ancorado ao campo de entrada e sobrepor o conteúdo adjacente quando aberto.
- Itens/valores indisponíveis (por disabled, min/max ou regra de passo) devem ser não interativos e visualmente distinguíveis.
- O fechamento do popup não deve depender de animações para cumprir as regras funcionais.`;

