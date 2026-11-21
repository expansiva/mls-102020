/// <mls fileReference="_102047_/l4/tarefas/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const tarefasRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "tarefas",
  "rules": {
    "apenasResponsavelExecuta": "Somente o responsável da tarefa pode iniciá-la, enviá-la para revisão e retomá-la.",
    "avisarQuemAgeAgora": "Ao criar a tarefa o responsável é avisado, e a cada mudança de situação ou reatribuição a pessoa que passa a agir agora é avisada; no cancelamento, quem estava agindo é avisado.",
    "apenasCriadorRevisa": "Somente quem criou a tarefa pode aceitá-la ou devolvê-la enquanto ela está em revisão.",
    "devolucaoExigeMotivo": "Devolver uma tarefa em revisão exige que quem criou informe o motivo da devolução, e a tarefa volta a em andamento.",
    "retomarSoAposDevolucao": "O responsável só pode retomar uma tarefa em andamento que foi devolvida e ainda não foi retomada depois dessa devolução.",
    "cancelarApenasCriadorOuGestor": "Somente quem criou a tarefa ou o gestor pode cancelá-la, e apenas enquanto ela está a fazer, em andamento ou em revisão.",
    "participanteNaoConfiguradoAceitaECria": "Um participante ainda não configurado pelo gestor aceita tarefas e pode criar tarefas até o gestor marcar outra escolha.",
    "escolhaGestorNuncaSobrescrita": "Uma marca de aceitar tarefas ou de poder criar tarefas já feita pelo gestor nunca é sobrescrita automaticamente; só o gestor a altera.",
    "gestorPorAcessoPlataforma": "Ser gestor é determinado pelo acesso da plataforma e não pelas marcas de aceitar tarefas ou poder criar tarefas.",
    "responsavelAceitaTarefas": "O responsável de uma tarefa, na criação ou na reatribuição, só pode ser um participante ativo que aceita tarefas (marca do gestor ou ausência de configuração).",
    "criarTarefaExigePodeCriar": "Criar uma tarefa exige que a pessoa seja participante que pode criar tarefas, e quem criou é sempre a pessoa da sessão.",
    "participanteSemCadastroPessoal": "O módulo não cadastra pessoas nem pede dado pessoal: participantes são escolhidos entre os usuários da organização e o módulo guarda apenas as marcas do gestor.",
    "nomeListaUnico": "O nome de uma lista de tarefas é obrigatório e não pode repetir o nome de outra lista.",
    "somenteGestorMantemListas": "Somente o gestor cria e altera listas de tarefas e configura os participantes do módulo.",
    "podeCriarTarefasExigido": "Um participante cuja marca de poder criar tarefas está desligada não pode criar tarefas nem subtarefas.",
    "escolhaResponsavelPeloNome": "O responsável é escolhido pelo nome numa lista visível com busca pelo nome, como numa menção em conversa, e nunca pelo e-mail.",
    "reatribuirApenasCriadorOuGestor": "Somente quem criou a tarefa ou o gestor pode trocar o responsável, e a troca faz do novo responsável quem age agora quando a tarefa está a fazer ou em andamento.",
    "edicaoNaoMudaSituacao": "Quem vê a tarefa pode editar título, descrição, prioridade, prazo, lista, tarefa pai e etiquetas, mas a edição nunca muda a situação da tarefa.",
    "tarefaPaiDiferenteDaPropria": "A tarefa pai de uma subtarefa não pode ser a própria tarefa nem uma de suas subtarefas.",
    "quemAgeAgoraPorSituacao": "Quem age agora é o responsável quando a tarefa está a fazer ou em andamento, quem criou quando está em revisão, e ninguém quando está concluída ou cancelada.",
    "resumoDiarioOitoHoras": "Todo dia às 8h cada responsável recebe um aviso com as suas tarefas abertas que vencem hoje ou estão atrasadas.",
    "avisoNaoSobrepostoPorPessoa": "Um aviso ainda não terminado para uma pessoa impede que outro comece para ela, sem nunca bloquear os avisos das demais pessoas.",
    "membroVeResponsavelOuCriador": "O membro vê apenas as tarefas de que é responsável, as que criou e as que dependem dele agora; o gestor vê todas as tarefas.",
    "itemChecklistSoQuemVeTarefa": "Somente quem vê a tarefa pode adicionar, editar, marcar ou desmarcar itens da sua checklist.",
    "marcarItemNaoMudaSituacao": "Marcar ou desmarcar um item da checklist não muda a situação da tarefa.",
    "itemChecklistTarefaNaoEncerrada": "Itens da checklist só podem ser adicionados, editados ou marcados enquanto a tarefa não está concluída nem cancelada.",
    "tarefaAbertaVencimento": "Uma tarefa é aberta quando não está concluída nem cancelada; vence hoje quando aberta com prazo igual a hoje e está atrasada quando aberta com prazo anterior a hoje.",
    "moduloNaoGuardaComentarios": "A discussão e os anexos da tarefa ficam na conversa da própria tarefa na plataforma; o módulo não guarda comentários nem anexos."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type TarefasRulesType = typeof tarefasRules;

export default tarefasRules;
