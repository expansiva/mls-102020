/// <mls fileReference="_102020_/l2/molecules/groupEnterNumber/quantitySelector.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code. 

export const group = 'groupEnterNumber';
export const skill = `# Metadata
- TagName: molecules--group-enter-number--quantity-selector-102020

# Objective
Permitir ao usuário selecionar e editar uma quantidade inteira de forma compacta (botões −/+ e campo numérico central), respeitando limites e regras de incremento, integrando-se a formulários e emitindo eventos de interação e mudança.

# Responsibilities
- Exibir um controle composto por: botão de decremento (−), campo numérico central e botão de incremento (+).
- Permitir alterar a quantidade inteira por:
  - Acionamento do botão de decremento.
  - Acionamento do botão de incremento.
  - Edição direta do valor no campo central.
- Aceitar configuração de limites e incremento: min, max e step.
- Aplicar step ao incrementar e decrementar, alterando o valor efetivo em ± step.
- Ao editar diretamente, normalizar a entrada para um inteiro válido e ajustar ao step quando step > 1.
- Garantir que o valor efetivo permaneça dentro de [min, max] quando esses limites forem fornecidos.
- Quando o valor estiver vazio/não definido e ocorrer incremento/decremento, definir um valor inicial coerente e então aplicar a operação.
- Expor o valor atual para integração com formulários quando um name for fornecido.
- Expor e sinalizar estado de erro por meio de error (boolean ou texto), incluindo apresentação de mensagem quando error for texto.
- Emitir evento "change" sempre que o valor efetivo mudar, incluindo o valor normalizado/limitado resultante.
- Emitir evento "blur" quando o controle (ou o campo central) perder foco.
- Controlar a disponibilidade dos botões de acordo com min/max e estados de bloqueio.
- Oferecer operação por teclado para incremento/decremento quando o foco estiver no campo central.

# Constraints
- step deve ser um inteiro positivo; configurações inválidas devem impedir comportamento de alteração até correção.
- O valor controlado deve ser sempre inteiro; entradas decimais devem ser normalizadas para inteiro antes de qualquer emissão de "change".
- Regra de ajuste ao step ao editar diretamente:
  - Se min estiver definido, o valor deve ser ajustado para um múltiplo de step relativo a min.
  - Se min não estiver definido, o valor deve ser ajustado para um múltiplo de step relativo a 0.
- Quando min e/ou max forem fornecidos, após qualquer normalização o valor deve ser limitado para não ultrapassar esses limites.
- Regras de botões com limites:
  - Se o valor efetivo estiver em min (ou abaixo após normalização/limitação), o botão de decremento deve ficar indisponível.
  - Se o valor efetivo estiver em max, o botão de incremento deve ficar indisponível.
- Estado disabled=true:
  - Deve desabilitar a interação de todos os controles e impedir alterações de valor.
- Estado loading=true:
  - Deve impedir interações e impedir alterações de valor enquanto ativo.
- Estado readonly=true:
  - Deve permitir foco e seleção do valor.
  - Deve impedir alterações por botões e por digitação.
- Estado required=true:
  - Após interação do usuário, não deve permitir estado final vazio.
  - Se o usuário apagar o conteúdo, ao confirmar/encerrar a edição o controle deve restaurar um valor válido (preferencialmente min; caso contrário 0).
- Configuração inconsistente min > max:
  - O controle deve entrar em estado de erro.
  - Deve impedir alterações de valor até que a configuração seja corrigida.
  - Deve manter o valor atual sem extrapolar limites quando aplicável.
- O controle não deve incorporar lógica de negócio (por exemplo, preço, estoque); deve apenas controlar e validar a quantidade numérica.
- Estados disabled/readonly/error devem ser anunciáveis e o controle deve ser operável por teclado.

# Notes
- Quando o valor estiver vazio/não definido e houver incremento/decremento, o valor inicial deve ser preferencialmente min (se definido) ou 0 (se min não definido), e então a operação (± step) deve ser aplicada.
- O estado de erro pode ser apenas indicativo (error=true) ou acompanhado de mensagem (error como texto).`;

