/// <mls fileReference="_102047_/l2/tarefas/web/contracts/inicio_membro.defs.ts" enhancement="_blank"/>

/** Indicadores calculados de uma tarefa: se está aberta, se vence hoje, se está atrasada e o progresso da checklist. */
export interface TarefaResumoDetalhes {
  readonly aberta: boolean;
  readonly venceHoje: boolean;
  readonly atrasada: boolean;
  readonly progressoChecklist: string;
}

/** Lista (projeto ou área) à qual a tarefa pertence, identificada pelo nome. */
export interface ListaRef {
  nome: string;
}

/** Tarefa aberta da pessoa, com situação, prazo, prioridade, lista e indicadores de prazo e checklist. */
export interface TarefaResumo {
  id: string;
  titulo: string;
  status: 'aFazer' | 'emAndamento' | 'emRevisao' | 'concluida' | 'cancelada';
  prazo: string;
  prioridade: 'low' | 'medium' | 'high';
  listaId: string;
  details: TarefaResumoDetalhes;
  lista: ListaRef;
}

/** Carga de trabalho da pessoa: totais de tarefas abertas, que vencem hoje e atrasadas, e as tarefas abertas mais urgentes. */
export interface ResumoMinhasTarefas {
  readonly quantidadeAbertas: number;
  readonly quantidadeVencemHoje: number;
  readonly quantidadeAtrasadas: number;
  tarefas: TarefaResumo[];
}

/** Tarefa incluída no aviso diário, com o prazo no momento do aviso e a situação do prazo. */
export interface AvisoTarefa {
  tarefaId: string;
  prazo: string;
  situacaoPrazo: 'dueToday' | 'overdue';
}

/** Conteúdo do aviso diário: quantidades de tarefas e de atrasadas e as tarefas incluídas. */
export interface AvisoDetalhes {
  readonly quantidadeTarefas: number;
  readonly quantidadeAtrasadas: number;
  tarefas: AvisoTarefa[];
}

/** Aviso diário de vencimentos da pessoa para a data de hoje, com situação do envio e tarefas incluídas. */
export interface AvisoDoDia {
  id: string;
  readonly dataReferencia: string;
  status: 'pending' | 'completed' | 'failed';
  details: AvisoDetalhes;
}

/** Identificação do membro da equipe pelo nome. */
export interface MembroIdentificacao {
  name: string;
}

/** Dados do cadastro do membro da equipe visíveis ao membro. */
export interface MembroDetalhes {
  identification: MembroIdentificacao;
}

/** Membro da equipe (responsável ou criador de uma tarefa) com seu nome. */
export interface MembroRef {
  details: MembroDetalhes;
}

/** Dados da devolução e progresso da checklist de uma tarefa. */
export interface TarefaPendenciaDetalhes {
  motivoDevolucao?: string;
  devolvidaEm?: string;
  readonly progressoChecklist: string;
}

/** Tarefa que depende de uma ação da pessoa, com versão, responsável, criador, devolução e progresso da checklist. */
export interface TarefaPendencia {
  id: string;
  version: number;
  titulo: string;
  status: 'aFazer' | 'emAndamento' | 'emRevisao' | 'concluida' | 'cancelada';
  prazo: string;
  prioridade: 'low' | 'medium' | 'high';
  responsavelId: string;
  criadorId: string;
  details: TarefaPendenciaDetalhes;
  responsavel: MembroRef;
  criador: MembroRef;
}

/** Tarefas que dependem da pessoa, agrupadas pela ação esperada: iniciar, enviar para revisão, revisar e ajustar após devolução. */
export interface EsperaPorMim {
  paraIniciar: TarefaPendencia[];
  paraEnviarRevisao: TarefaPendencia[];
  paraRevisar: TarefaPendencia[];
  devolvidas: TarefaPendencia[];
}

export interface Inicio_membroContracts {
  /**
   * Finalidade: Carrega de uma vez tudo o que o Início do membro mostra: resumo da carga de trabalho, aviso diário de hoje e as pendências que esperam pela pessoa logada.
   * Entrada: Sem parâmetros; a pessoa é a da sessão.
   * Processamento: Resumo: considera as tarefas em que a pessoa da sessão é responsável e calcula no servidor quantas estão abertas (details.aberta), quantas vencem hoje (details.venceHoje) e quantas estão atrasadas (details.atrasada); devolve as tarefas abertas mais urgentes (até 10, ordenadas por atrasadas, vencendo hoje, prazo e prioridade) com o nome da lista e o progresso da checklist calculado a partir dos itens feitos sobre o total. Aviso: busca o aviso da pessoa com dataReferencia igual a hoje (há no máximo um, regra avisoUnicoPorResponsavelEDia) com quantidades e tarefas incluídas. Pendências: paraIniciar = responsável é a pessoa e status aFazer; paraEnviarRevisao = responsável é a pessoa, status emAndamento e sem devolução pendente; devolvidas = responsável é a pessoa, status emAndamento e com motivoDevolucao/devolvidaEm registrados; paraRevisar = criador é a pessoa e status emRevisao. Cada item traz versão, nomes do responsável e do criador lidos do cadastro mestre e o progresso da checklist calculado. Campos derivados são calculados, nunca gravados.
   * Saída: resumo com os três totais e as tarefas abertas mais urgentes; avisoDoDia de hoje com situação, quantidades e tarefas (ausente se ainda não foi gerado); esperaPorMim com as quatro listas de pendências.
   */
  'tarefas.inicio_membro.carregarInicio': {
    kind: 'qry';
    input: {};
    output: { resumo: ResumoMinhasTarefas; avisoDoDia?: AvisoDoDia; esperaPorMim: EsperaPorMim };
    rules: ['avisoUnicoPorResponsavelEDia'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroAvisosProprios', 'membroConsultaListas', 'membroEscolheResponsavel']; scope: 'own' };
  };
  /**
   * Finalidade: Inicia uma tarefa atribuída à pessoa, passando-a de a fazer para em andamento.
   * Entrada: id: tarefa a iniciar; version: versão lida, para concorrência otimista.
   * Processamento: Recusa se a pessoa da sessão não for o responsável (somenteResponsavelExecuta), se a tarefa estiver concluída ou cancelada (tarefaEncerradaNaoTransiciona) ou se não estiver em aFazer; recusa se a versão divergir. Executa a transição iniciar; a sala de discussão recebe a mensagem. Em seguida recalcula o resumo e as pendências da pessoa como em carregarInicio.
   * Saída: resumo recalculado e esperaPorMim recalculado, já com a tarefa em emAndamento.
   */
  'tarefas.inicio_membro.iniciarTarefa': {
    kind: 'cmd';
    writes: 'Tarefa.iniciar';
    input: { id: string; version: number };
    output: { resumo: ResumoMinhasTarefas; esperaPorMim: EsperaPorMim };
    rules: ['somenteResponsavelExecuta', 'tarefaEncerradaNaoTransiciona'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroAvisosProprios', 'membroConsultaListas', 'membroEscolheResponsavel']; scope: 'own' };
  };
  /**
   * Finalidade: Envia para revisão do criador uma tarefa em andamento da pessoa, inclusive a reenviada após devolução.
   * Entrada: id: tarefa a enviar; version: versão lida, para concorrência otimista.
   * Processamento: Recusa se a pessoa da sessão não for o responsável (somenteResponsavelExecuta), se a tarefa estiver encerrada (tarefaEncerradaNaoTransiciona) ou fora de emAndamento; recusa se a versão divergir. Executa a transição enviarParaRevisao; o criador passa a agir e é avisado. Recalcula resumo e pendências como em carregarInicio.
   * Saída: resumo recalculado e esperaPorMim recalculado, já com a tarefa em emRevisao.
   */
  'tarefas.inicio_membro.enviarParaRevisao': {
    kind: 'cmd';
    writes: 'Tarefa.enviarParaRevisao';
    input: { id: string; version: number };
    output: { resumo: ResumoMinhasTarefas; esperaPorMim: EsperaPorMim };
    rules: ['somenteResponsavelExecuta', 'tarefaEncerradaNaoTransiciona'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroAvisosProprios', 'membroConsultaListas', 'membroEscolheResponsavel']; scope: 'own' };
  };
  /**
   * Finalidade: Aceita a entrega de uma tarefa criada pela pessoa, concluindo-a.
   * Entrada: id: tarefa em revisão; version: versão lida, para concorrência otimista.
   * Processamento: Recusa se a pessoa da sessão não for o criador (somenteCriadorRevisa), se a tarefa estiver encerrada (tarefaEncerradaNaoTransiciona) ou fora de emRevisao; recusa se a versão divergir. Executa a transição aceitar, registrando concluidaEm; a sala recebe a mensagem. Recalcula resumo e pendências como em carregarInicio.
   * Saída: resumo recalculado e esperaPorMim recalculado, sem a tarefa concluída.
   */
  'tarefas.inicio_membro.aceitarEntrega': {
    kind: 'cmd';
    writes: 'Tarefa.aceitar';
    input: { id: string; version: number };
    output: { resumo: ResumoMinhasTarefas; esperaPorMim: EsperaPorMim };
    rules: ['somenteCriadorRevisa', 'tarefaEncerradaNaoTransiciona'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroAvisosProprios', 'membroConsultaListas', 'membroEscolheResponsavel']; scope: 'own' };
  };
  /**
   * Finalidade: Devolve para ajuste uma tarefa em revisão criada pela pessoa, registrando o motivo.
   * Entrada: id: tarefa em revisão; version: versão lida; details.motivoDevolucao: texto do motivo da devolução.
   * Processamento: Recusa se a pessoa da sessão não for o criador (somenteCriadorRevisa), se o motivo estiver vazio (devolucaoExigeMotivo), se a tarefa estiver encerrada (tarefaEncerradaNaoTransiciona) ou fora de emRevisao; recusa se a versão divergir. Executa a transição devolver gravando motivoDevolucao e devolvidaEm; a tarefa volta para emAndamento com o responsável como quem age e ele é avisado. Recalcula resumo e pendências como em carregarInicio.
   * Saída: resumo recalculado e esperaPorMim recalculado, sem a tarefa entre as para revisar.
   */
  'tarefas.inicio_membro.devolverComMotivo': {
    kind: 'cmd';
    writes: 'Tarefa.devolver';
    input: { id: string; version: number; details: { motivoDevolucao: string } };
    output: { resumo: ResumoMinhasTarefas; esperaPorMim: EsperaPorMim };
    rules: ['somenteCriadorRevisa', 'devolucaoExigeMotivo', 'tarefaEncerradaNaoTransiciona'];
    access: { actors: ['membroEquipe']; grants: ['membroTarefasProprias', 'membroAvisosProprios', 'membroConsultaListas', 'membroEscolheResponsavel']; scope: 'own' };
  };
}
