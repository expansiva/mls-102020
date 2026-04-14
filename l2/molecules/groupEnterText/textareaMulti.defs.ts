/// <mls fileReference="_102020_/l2/molecules/groupEnterText/textareaMulti.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code. 

export const group = 'groupEnterText';
export const skill = `
# Metadata
 - tag: molecules--group-enter-text--textarea-multi-102020
 
# Objective
Fornecer um campo de entrada de texto multi-linha (Textarea) para criação e edição de conteúdos longos (ex.: descrições e comentários), com suporte a configuração de linhas iniciais, opções de redimensionamento e modo autosize para crescer conforme o conteúdo.

# Responsibilities
- Permitir ao usuário inserir, editar e visualizar texto multi-linha.
- Expor um valor de texto atual que possa ser controlado externamente e aceite string vazia.
- Refletir no campo quaisquer mudanças externas do valor, mantendo o conteúdo exibido sincronizado.
- Emitir um evento de mudança quando o usuário alterar o conteúdo, incluindo no detail o valor atual.
- Emitir eventos de foco e de perda de foco (blur) para integração com validação e fluxos externos.
- Exibir placeholder quando o campo estiver vazio.
- Suportar configuração de número de linhas visíveis iniciais (rows).
- Suportar modo de redimensionamento configurável: none, vertical, horizontal, both.
- Quando autosize estiver ativo, expandir verticalmente para acomodar o conteúdo conforme o usuário digita ou cola texto.
- Quando autosize estiver ativo, respeitar limites opcionais de altura por linhas (minRows e maxRows, ou equivalentes), usando rows como mínimo quando limites não forem fornecidos.
- Preservar quebras de linha e caracteres inseridos, incluindo colagem de conteúdo multi-linha.
- Manter comportamentos padrão de teclado: Enter cria nova linha; Tab não deve ser capturado indevidamente quando aplicável.
- Oferecer propriedade name para identificação externa e integração com formulários.
- Oferecer propriedades de acessibilidade para associação com rótulos e descrições externas (ex.: id e atributos equivalentes para nome/descrição acessível).
- Quando houver descrição/ajuda (hint), exibi-la ao usuário e permitir que seja referenciável por leitores de tela.
- Expor e refletir estados de interface: disabled, readonly, required, error e loading.
- Quando error estiver ativo, apresentar indicação visual e, quando fornecida, mensagem de erro, sem bloquear necessariamente a digitação.
- Quando required estiver ativo, sinalizar obrigatoriedade de forma não intrusiva, sem aplicar validação de negócio.
- Quando loading estiver ativo, indicar indisponibilidade temporária e aplicar um comportamento consistente e previsível quanto à edição/interação.
- Funcionar de forma independente, sem exigir contexto específico da página.

# Constraints
- Disabled: não deve permitir interação nem edição; deve impedir alterações pelo usuário enquanto ativo.
- Readonly: deve impedir edição, mas permitir seleção e cópia do conteúdo.
- Required: deve apenas sinalizar/propagar estado para validação externa; não deve executar validação de negócio.
- Error: deve apenas refletir o estado de erro e exibir a mensagem/flag quando fornecida; não deve impor bloqueio de digitação a menos que outros estados (disabled/readonly/loading) o façam.
- Loading: quando ativo, o componente deve apresentar claramente o estado e manter um comportamento consistente sobre permitir ou impedir edição/interação; esse comportamento não deve ser ambíguo para o usuário.
- maxLength (quando configurado): deve limitar o número máximo de caracteres aceitos e, quando habilitado, exibir contagem atual versus limite de forma acessível.
- Placeholder deve ser visível apenas quando o valor estiver vazio.
- Autosize não deve desrespeitar os limites definidos (minRows/maxRows ou equivalentes); na ausência de minRows, rows deve ser tratado como mínimo.
- Alterações externas do valor não devem causar discrepância entre valor exposto e texto exibido.

# Notes
- A lógica de validação e regras de negócio pertence ao nível superior; o componente deve apenas emitir eventos e refletir estados fornecidos.
- Os estados visuais esperados incluem: normal, foco, disabled, readonly, erro e loading, mantendo clareza de uso em larguras variadas.`;

