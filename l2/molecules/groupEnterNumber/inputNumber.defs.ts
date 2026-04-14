/// <mls fileReference="_102020_/l2/molecules/groupEnterNumber/inputNumber.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code. 

export const group = 'groupEnterNumber';
export const skill = `# Metadata
- TagName: molecules--group-enter-number--input-number-102020

# Objective
Fornecer um campo padrão de entrada numérica para capturar valores quantitativos, permitindo edição pelo usuário, validação e normalização conforme limites (min/max), incremento (step) e precisão decimal, e emitindo eventos de foco e alteração conforme o contrato do grupo.

# Responsibilities
- Permitir que o usuário informe e edite um valor numérico.
- Aceitar configuração de: min, max, step e precisão decimal.
- Suportar estado “sem valor” (vazio) quando o campo não for obrigatório.
- Quando obrigatório, indicar invalidez se estiver vazio.
- Restringir o valor confirmado para permanecer dentro de min/max.
- Aplicar step ao valor confirmado quando step estiver definido, garantindo que o valor confirmado seja compatível com o step.
- Aplicar precisão decimal ao valor confirmado, garantindo que o valor confirmado respeite o número máximo de casas decimais configurado.
- Filtrar a digitação para impedir caracteres que não possam compor um número válido.
- Permitir estados intermediários de digitação que ainda não formam um número completo, sem interromper a edição, mas impedindo confirmação inválida.
- Oferecer interação de incremento e decremento do valor respeitando min/max/step/precisão.
- Suportar a propriedade name para identificação e integração com formulários, conforme contrato do grupo.
- Suportar indicação de erro via propriedade error, com estado inválido e, quando aplicável, mensagem associada.
- Emitir evento de change quando o valor efetivo mudar por ação do usuário, contendo o valor resultante após validação/normalização.
- Emitir evento de blur quando perder foco.
- Tornar estados disabled, readonly e invalid observáveis e anunciáveis para acessibilidade.

# Constraints
- O componente deve aceitar apenas entrada compatível com número; caracteres não numéricos devem ser bloqueados/ignorados durante a digitação.
- Deve haver uma definição consistente do separador decimal aceito (ex.: "." e/ou ",") e essa regra deve ser aplicada de forma uniforme.
- A permissão de números negativos deve ser consistente: deve seguir uma regra clara (por exemplo, condicionada a min ou a uma configuração explícita).
- O valor confirmado nunca pode permanecer fora de min/max; quando isso ocorrer, o componente deve aplicar sempre a mesma política (ajustar para o limite ou marcar erro).
- Quando step estiver definido, o valor confirmado deve sempre respeitar step; a regra de ajuste (arredondar para cima/baixo/mais próximo) deve ser única e previsível.
- Quando precisão decimal estiver definida, o valor confirmado não pode exceder o número de casas permitido; a regra de arredondamento/formatação deve ser consistente.
- Deve existir uma definição clara do que significa “confirmar valor” (por exemplo, ao sair do campo, ao submeter, ou ao acionar incremento/decremento) e essa definição deve ser aplicada uniformemente às regras de min/max/step/precisão.
- O formato/tipo do valor exposto e emitido (número vs string numérica) deve ser único e consistente em todas as situações.
- Quando disabled=true:
  - Não deve permitir foco nem edição.
  - Não deve emitir change por interação do usuário.
- Quando readonly=true:
  - Deve permitir foco e seleção.
  - Não deve permitir alteração do valor.
  - Não deve emitir change por interação do usuário.
- Quando loading=true:
  - Deve indicar estado de carregamento.
  - Deve bloquear interações que alterem o valor.
  - A política de permitir ou não foco durante loading deve ser definida e aplicada de forma consistente.
- Eventos change e blur devem ser emitidos com comportamento consistente (incluindo propagação) conforme contrato do grupo.

# Notes
- “Estados intermediários” incluem entradas como "-", "0.", "." e equivalentes aceitos pela regra de separador decimal, desde que não sejam confirmadas como valor final inválido.
- A apresentação de rótulos, descrições e placeholder deve ser fornecida pelo consumidor e o componente deve respeitar essas informações para acessibilidade e orientação do usuário.`;

