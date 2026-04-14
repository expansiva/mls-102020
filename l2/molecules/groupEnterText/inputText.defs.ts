/// <mls fileReference="_102020_/l2/molecules/groupEnterText/inputText.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code. 

export const group = 'groupEnterText';
export const skill = `# Objective
Fornecer um campo de entrada de texto de linha única, reutilizável como componente base, com suporte a label, prefixo/sufixo, placeholder, texto de ajuda e indicação de erro, além de estados comuns (disabled/readonly/required) e eventos de interação.

# Responsibilities
- Permitir ao usuário inserir e editar texto em uma única linha.
- Exibir e manter um valor de texto controlável externamente, refletindo alterações de valor de forma imediata.
- Exibir um label opcional associado ao campo.
- Exibir conteúdo opcional de prefixo (antes do texto) e sufixo (após o texto) sem alterar o valor digitado.
- Exibir placeholder quando configurado e quando o campo não possuir conteúdo.
- Exibir texto de ajuda opcional para instrução/descrição.
- Suportar indicação de erro por flag de inválido e/ou mensagem de erro; quando houver mensagem, exibi-la ao usuário.
- Priorizar a exibição da mensagem de erro sobre o texto de ajuda quando ambos estiverem presentes.
- Suportar estados disabled, readonly e required, refletindo-os visualmente e no comportamento de interação.
- Emitir eventos de interação: mudança de valor, entrada (durante edição) e foco/perda de foco, incluindo o valor atual quando aplicável.
- Preservar a navegação e interação padrão por teclado (Tab para foco, edição, seleção e cópia conforme esperado).
- Permitir definição de identificador de campo para uso em contextos de formulário (ex.: atributo de nome).
- Funcionar de forma independente, sem depender de outros componentes para seu comportamento essencial.

# Constraints
- Deve aceitar apenas entrada de texto de linha única; não deve oferecer comportamento de múltiplas linhas.
- Não deve aplicar lógica de negócio ou validações específicas de domínio (ex.: validação de email, máscaras, regras proprietárias); apenas exibir e propagar estados/valores recebidos.
- Quando disabled:
  - Não deve permitir interação do usuário nem receber foco por interação direta.
  - Não deve emitir eventos de alteração de valor originados por interação do usuário.
  - Se houver configuração de erro/mensagem, deve manter a indicação de erro e exibir a mensagem quando fornecida.
- Quando readonly:
  - Deve permitir foco e seleção do conteúdo.
  - Não deve permitir alteração do valor por interação do usuário.
  - Não deve emitir eventos de alteração de valor por tentativas de edição.
- Quando required:
  - Deve indicar obrigatoriedade e expor o estado correspondente para validação/consumo externo.
- Prefixo/sufixo:
  - Não deve sobrepor nem impedir a leitura/edição do texto digitado.
  - Não deve modificar o valor do campo.
- Textos de ajuda e erro:
  - Devem suportar textos longos com quebra de linha apropriada, sem comprometer o uso do campo.

# Notes
- Caso não haja label, o campo deve permanecer totalmente utilizável sem reservar espaço desnecessário.
- O componente deve oferecer feedback visual claro de foco, hover (quando aplicável), erro, disabled e readonly para uso consistente como componente base.`;

