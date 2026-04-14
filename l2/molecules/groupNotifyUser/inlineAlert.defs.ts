/// <mls fileReference="_102020_/l2/molecules/groupNotifyUser/inlineAlert.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code. 

export const group = 'groupNotifyUser';
export const skill = `# Metadata
- TagName: molecules--group-notify-user--inline-alert-102020

# Objective
Exibir um alerta contextual inline no fluxo do conteúdo da página, comunicando mensagens ao usuário com severidades diferentes e, opcionalmente, oferecendo uma ação associada.

# Responsibilities
- Exibir uma mensagem contextual incorporada ao conteúdo da página, permanecendo no fluxo normal do documento.
- Permitir seleção de severidade com quatro tipos: info, success, warning e error.
- Exibir um ícone correspondente ao tipo selecionado.
- Permitir ocultar o ícone quando configurado.
- Exibir um título curto opcional.
- Exibir uma descrição opcional, com suporte a múltiplas linhas.
- Permitir que apenas título, apenas descrição, ou ambos sejam exibidos, conforme entradas.
- Oferecer uma ação opcional ao usuário (por exemplo, botão ou link) com rótulo configurável.
- Permitir definir o estado da ação como habilitada ou desabilitada.
- Quando a ação estiver habilitada e for ativada pelo usuário, emitir um evento ao consumidor.
- Incluir no evento informações suficientes para correlacionar a instância do alerta e identificar a ação disparada.
- Permitir um identificador opcional (id/nome) para correlação de eventos pelo consumidor.
- Operar de forma independente em múltiplas instâncias na mesma página, sem compartilhamento de estado entre elas.
- Refletir atualizações dinâmicas de tipo, título, descrição e configuração da ação, sem exigir que a instância seja substituída.
- Renderizar estritamente com base nas entradas fornecidas, sem aplicar regras de negócio para decidir quando exibir, ocultar ou alterar conteúdo.
- Prover acessibilidade: expor conteúdo textual de forma legível para tecnologias assistivas.
- Quando houver ação, permitir foco e ativação por teclado e garantir foco visível.

# Constraints
- Não deve flutuar, sobrepor conteúdo, nem se comportar como overlay, toast, sticky ou fixo; deve permanecer inline no fluxo do documento.
- Deve aceitar somente os tipos de severidade definidos: info, success, warning e error.
- Quando configurado como inerte/desabilitado, a ação (se existir) não deve ser acionável e não deve emitir eventos.
- A ausência de título e/ou descrição não deve causar estado inválido; o componente deve se adaptar para exibir apenas o conteúdo disponível.
- Se a ação não for fornecida, não deve haver área acionável nem emissão de eventos.
- Eventos emitidos devem ser atribuíveis a uma instância específica (por identificador quando fornecido, ou por contexto equivalente do próprio evento).

# Notes
- A distinção visual entre severidades deve ser clara e consistente com a gravidade (incluindo cor/ênfase).
- O layout deve manter alinhamento consistente do conteúdo com ou sem ícone.
- A ação, quando presente, deve ser visualmente associada ao alerta e separada do texto, adaptando-se ao espaço disponível.`;

