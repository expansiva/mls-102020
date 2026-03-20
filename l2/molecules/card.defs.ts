/// <mls fileReference="_102020_/l2/molecules/card.defs.ts" enhancement="_blank"/>

export const group = 'groupCard';
export const skill = `

# Objective
Permitir exibir um Card com face frontal e verso, contendo seções header/body/footer e suporte opcional a imagem no header. O Card deve alternar entre frente e verso ao ser acionado por clique ou teclado, com animação de flip e comportamento acessível e responsivo.

# Responsibilities
- Exibir uma face frontal composta por três áreas distintas: header, body e footer.
- Permitir fornecer conteúdo para header, body e footer por meio de áreas dedicadas de inserção de conteúdo.
- Permitir configurar uma imagem no header por propriedades de fonte e texto alternativo, com opção de exibir ou ocultar a imagem.
- Quando a imagem não estiver configurada ou estiver desabilitada, não exibir a imagem e aplicar o comportamento de layout esperado para essa ausência.
- Exibir uma face traseira (verso) com conteúdo adicional fornecido em uma área dedicada.
- Alternar entre estado “frente” e “verso” quando o Card for acionado:
  - Primeiro acionamento exibe o verso.
  - Segundo acionamento retorna à frente.
- Executar uma animação de flip (giro 3D) durante a alternância, mantendo frente e verso alinhados e ocupando o mesmo espaço visual.
- Permitir alternância via teclado quando o Card estiver focado (Enter e Espaço).
- Expor o estado atual de flip como propriedade/atributo observável (“flipped”) para permitir integração e estilização externa.
- Emitir um evento customizado a cada alternância, contendo no detalhe o estado atual (flipped: true/false).
- Prover comportamento acessível quando acionável:
  - Ser focável por teclado.
  - Possuir semântica/role apropriado para interação.
  - Refletir o estado atual em atributo ARIA equivalente.
- Respeitar a preferência do usuário por redução de movimento, reduzindo ou desabilitando a animação de flip.
- Garantir que elementos interativos contidos no Card (por exemplo, links e botões) possam, de forma configurável, não disparar o flip ao serem acionados.

# Constraints
- Não deve depender de bibliotecas externas.
- O verso deve ocupar exatamente a mesma área do Card, sem alterar o tamanho geral durante a alternância.
- A alternância deve ser determinística e sempre refletir corretamente no estado exposto (“flipped”) e no evento emitido.
- Quando a interação do Card estiver habilitada:
  - Deve permitir acionamento por clique e teclado.
  - Deve manter consistência entre estado visual e estado ARIA.
- Quando a preferência de redução de movimento estiver ativa:
  - Não deve forçar animações completas que possam causar desconforto.
- Se configurado para ignorar interações internas:
  - Acionamentos originados em elementos interativos internos não devem alternar o Card.

# Notes
- O Card deve ser responsivo, com largura fluida e possibilidade de limitar largura máxima por customização.
- Deve permitir customização visual básica (cores, borda, raio, sombra, duração de animação e altura da imagem do header) por propriedades de estilo expostas ao consumidor.

`