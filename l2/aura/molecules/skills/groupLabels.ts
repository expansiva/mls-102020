/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupLabels.ts" enhancement="_blank"/>

// DISPLAY labels of the molecule groups: a friendly title and a one- or two-sentence summary per
// group, per language, for the Studio's "Moléculas" panel.
//
// WHY A SEPARATE FILE
// `skills/index.ts` carries a `description` per group too, but that text is the contract the agents
// read (agentNewMolecule2, agentSyncMoleculeCatalog, agentIndexGroupPage…): English, technical, and
// written for a model. Translating or shortening it would change what the agents see. These labels
// are for people only — no identifier, tag or agent depends on them.
//
// Keys are the group `name` from `skills/index.ts`; the lookup ignores case, so the lowercase group
// read from a tag prefix finds them too. `groupLabels.test.ts` keeps every group covered in every
// language.

export interface IGroupLabel {
    title: string;
    summary: string;
}

type GroupLabels = Record<string, IGroupLabel>;

/// **collab_i18n_start**
const labels_en: GroupLabels = {
    groupSelectOne: { title: 'Select one option', summary: 'Picks exactly one option from a list, such as a dropdown, radio buttons or a segmented control.' },
    groupSelectMany: { title: 'Select several options', summary: 'Picks one or more options from a list, such as checkboxes, chips or a multi-select dropdown.' },
    groupEnterText: { title: 'Enter text', summary: 'Free text input: names, comments, emails, passwords and other written data.' },
    groupEnterBoolean: { title: 'Yes or no', summary: 'A yes/no choice, shown as a switch or a checkbox.' },
    groupEnterNumber: { title: 'Enter a number', summary: 'Numeric input for quantities, percentages and measurements, such as a number field, stepper or slider.' },
    groupEnterMoney: { title: 'Enter an amount of money', summary: 'Monetary input with currency symbol, separators and decimals in the user\'s format.' },
    groupEnterDatetime: { title: 'Enter date and time', summary: 'Date and/or time input for schedules, deadlines and appointments.' },
    groupEnterDate: { title: 'Enter a date', summary: 'Date only, without time: birth dates, due dates, expiration dates.' },
    groupEnterTime: { title: 'Enter a time', summary: 'Time only, without date: business hours, alarms, shifts.' },
    groupEnterDateInterval: { title: 'Date range', summary: 'A start date and an end date: vacations, report filters, bookings.' },
    groupEnterDateTimeInterval: { title: 'Date and time range', summary: 'A start and an end with exact times: meetings, reservations, maintenance windows.' },
    groupEnterTimeInterval: { title: 'Time range', summary: 'A start time and an end time, without date: shifts, opening hours, availability.' },
    groupEnterNumberInterval: { title: 'Number range', summary: 'A minimum and a maximum value: price bands, age brackets, filters.' },
    groupLocatePosition: { title: 'Location', summary: 'Informs or shows a place: address search, current location or a point on the map.' },
    groupSelectFileForUpload: { title: 'Choose files to upload', summary: 'Picks one or more files to send, by dragging, browsing or using the camera.' },
    groupTriggerAction: { title: 'Run an action', summary: 'Buttons that execute a command: with text, icon or both, in several styles and sizes.' },
    groupShowProgress: { title: 'Show progress', summary: 'Shows how far an operation has gone, such as a progress bar, ring or spinner.' },
    groupRateItem: { title: 'Rate', summary: 'Gives a score to something: stars, thumbs up/down, emojis or an NPS scale.' },
    groupPlayMedia: { title: 'Play media', summary: 'Plays audio or video, with the player controls.' },
    groupExpandContent: { title: 'Expand and collapse', summary: 'Shows or hides parts of the content on demand, such as an accordion or "show more".' },
    groupViewChart: { title: 'Chart', summary: 'Shows data as a chart: bars, lines, areas, pie and others, with the same data.' },
    groupViewCard: { title: 'Card', summary: 'Shows an item as a self-contained block, with title, content, footer and actions.' },
    groupScanCode: { title: 'Scan code', summary: 'Uses the camera to read a QR code, a barcode or a document.' },
    groupSearchContent: { title: 'Search', summary: 'Finds content by typing, with suggestions while the user types.' },
    groupViewData: { title: 'Data collection', summary: 'Shows a set of records, choosing the best layout for the screen.' },
    groupViewTable: { title: 'Table', summary: 'Shows data in rows and columns, with sorting, row selection and pagination.' },
    groupViewHierarchy: { title: 'Hierarchy', summary: 'Shows items with parent and children that open and close, such as a tree or org chart.' },
    groupViewMetric: { title: 'Metric', summary: 'Highlights an indicator: a big number, a KPI card, a trend or a gauge.' },
    groupNavigateSteps: { title: 'Steps', summary: 'Guides the user through a process in steps, such as a stepper or a wizard.' },
    groupNavigateSection: { title: 'Navigate sections', summary: 'Switches between sections of the same screen, like tabs or pills. The page shows the content of the chosen section.' },
    groupNotifyUser: { title: 'Notify', summary: 'Tells the user about an event or a result: toast, banner or alert.' },
};

const messages: Record<string, GroupLabels> = {
    en: labels_en,
    pt: {
        groupSelectOne: { title: 'Escolher uma opção', summary: 'Escolhe exatamente uma opção de uma lista, como uma lista suspensa, botões de rádio ou um controle segmentado.' },
        groupSelectMany: { title: 'Escolher várias opções', summary: 'Escolhe uma ou mais opções de uma lista, como caixas de seleção, chips ou uma lista suspensa múltipla.' },
        groupEnterText: { title: 'Digitar texto', summary: 'Entrada de texto livre: nomes, comentários, e-mails, senhas e outros dados escritos.' },
        groupEnterBoolean: { title: 'Sim ou não', summary: 'Uma escolha de sim ou não, como um interruptor ou uma caixa de seleção.' },
        groupEnterNumber: { title: 'Digitar número', summary: 'Entrada numérica para quantidades, porcentagens e medidas, como um campo numérico, botões de mais e menos ou um controle deslizante.' },
        groupEnterMoney: { title: 'Digitar valor em dinheiro', summary: 'Entrada de valores com símbolo da moeda, separadores e casas decimais no formato do usuário.' },
        groupEnterDatetime: { title: 'Digitar data e hora', summary: 'Entrada de data e/ou hora para agendas, prazos e compromissos.' },
        groupEnterDate: { title: 'Digitar data', summary: 'Só a data, sem hora: nascimento, vencimento, validade.' },
        groupEnterTime: { title: 'Digitar hora', summary: 'Só a hora, sem data: horário comercial, alarmes, turnos.' },
        groupEnterDateInterval: { title: 'Período de datas', summary: 'Uma data de início e uma de fim: férias, filtros de relatório, reservas.' },
        groupEnterDateTimeInterval: { title: 'Período com data e hora', summary: 'Início e fim com horário exato: reuniões, reservas de sala, janelas de manutenção.' },
        groupEnterTimeInterval: { title: 'Intervalo de horas', summary: 'Uma hora de início e uma de fim, sem data: turnos, horário de funcionamento, disponibilidade.' },
        groupEnterNumberInterval: { title: 'Faixa de números', summary: 'Um valor mínimo e um máximo: faixas de preço, faixas etárias, filtros.' },
        groupLocatePosition: { title: 'Localização', summary: 'Informa ou mostra um lugar: busca de endereço, localização atual ou um ponto no mapa.' },
        groupSelectFileForUpload: { title: 'Escolher arquivos para enviar', summary: 'Escolhe um ou mais arquivos para enviar, arrastando, procurando ou usando a câmera.' },
        groupTriggerAction: { title: 'Executar ação', summary: 'Botões que executam um comando: com texto, ícone ou os dois, em vários estilos e tamanhos.' },
        groupShowProgress: { title: 'Mostrar progresso', summary: 'Mostra quanto de uma operação já foi feito, como uma barra, um anel ou um indicador girando.' },
        groupRateItem: { title: 'Avaliar', summary: 'Dá uma nota a algo: estrelas, joinha, emojis ou escala NPS.' },
        groupPlayMedia: { title: 'Reproduzir mídia', summary: 'Toca áudio ou vídeo, com os controles do player.' },
        groupExpandContent: { title: 'Expandir e recolher', summary: 'Mostra ou esconde partes do conteúdo quando o usuário pede, como um acordeão ou "ver mais".' },
        groupViewChart: { title: 'Gráfico', summary: 'Mostra dados em gráfico: barras, linhas, áreas, pizza e outros, com os mesmos dados.' },
        groupViewCard: { title: 'Card', summary: 'Mostra um item como um bloco independente, com título, conteúdo, rodapé e ações.' },
        groupScanCode: { title: 'Ler código', summary: 'Usa a câmera para ler um QR code, um código de barras ou um documento.' },
        groupSearchContent: { title: 'Buscar', summary: 'Encontra conteúdo digitando, com sugestões enquanto o usuário digita.' },
        groupViewData: { title: 'Coleção de dados', summary: 'Mostra um conjunto de registros, escolhendo o melhor formato para a tela.' },
        groupViewTable: { title: 'Tabela', summary: 'Mostra dados em linhas e colunas, com ordenação, seleção de linhas e paginação.' },
        groupViewHierarchy: { title: 'Hierarquia', summary: 'Mostra itens com pai e filhos que abrem e fecham, como uma árvore ou um organograma.' },
        groupViewMetric: { title: 'Indicador', summary: 'Destaca um indicador: um número grande, um card de KPI, uma tendência ou um medidor.' },
        groupNavigateSteps: { title: 'Etapas', summary: 'Conduz o usuário por um processo em etapas, como um passo a passo ou um assistente.' },
        groupNavigateSection: { title: 'Navegar entre seções', summary: 'Troca entre seções da mesma tela, como abas ou pílulas. A página mostra o conteúdo da seção escolhida.' },
        groupNotifyUser: { title: 'Avisar', summary: 'Avisa o usuário sobre um evento ou resultado: notificação rápida, faixa ou alerta.' },
    },
    es: {
        groupSelectOne: { title: 'Elegir una opción', summary: 'Elige exactamente una opción de una lista, como un desplegable, botones de radio o un control segmentado.' },
        groupSelectMany: { title: 'Elegir varias opciones', summary: 'Elige una o más opciones de una lista, como casillas, chips o un desplegable múltiple.' },
        groupEnterText: { title: 'Escribir texto', summary: 'Entrada de texto libre: nombres, comentarios, correos, contraseñas y otros datos escritos.' },
        groupEnterBoolean: { title: 'Sí o no', summary: 'Una elección de sí o no, como un interruptor o una casilla.' },
        groupEnterNumber: { title: 'Escribir número', summary: 'Entrada numérica para cantidades, porcentajes y medidas, como un campo numérico, botones de más y menos o un deslizador.' },
        groupEnterMoney: { title: 'Escribir importe', summary: 'Entrada de importes con símbolo de moneda, separadores y decimales en el formato del usuario.' },
        groupEnterDatetime: { title: 'Escribir fecha y hora', summary: 'Entrada de fecha y/u hora para agendas, plazos y citas.' },
        groupEnterDate: { title: 'Escribir fecha', summary: 'Solo la fecha, sin hora: nacimiento, vencimiento, caducidad.' },
        groupEnterTime: { title: 'Escribir hora', summary: 'Solo la hora, sin fecha: horario comercial, alarmas, turnos.' },
        groupEnterDateInterval: { title: 'Rango de fechas', summary: 'Una fecha de inicio y una de fin: vacaciones, filtros de informe, reservas.' },
        groupEnterDateTimeInterval: { title: 'Rango con fecha y hora', summary: 'Inicio y fin con hora exacta: reuniones, reservas de sala, ventanas de mantenimiento.' },
        groupEnterTimeInterval: { title: 'Rango de horas', summary: 'Una hora de inicio y una de fin, sin fecha: turnos, horario de apertura, disponibilidad.' },
        groupEnterNumberInterval: { title: 'Rango de números', summary: 'Un valor mínimo y uno máximo: franjas de precio, rangos de edad, filtros.' },
        groupLocatePosition: { title: 'Ubicación', summary: 'Informa o muestra un lugar: búsqueda de dirección, ubicación actual o un punto en el mapa.' },
        groupSelectFileForUpload: { title: 'Elegir archivos para subir', summary: 'Elige uno o más archivos para enviar, arrastrando, buscando o usando la cámara.' },
        groupTriggerAction: { title: 'Ejecutar acción', summary: 'Botones que ejecutan un comando: con texto, icono o ambos, en varios estilos y tamaños.' },
        groupShowProgress: { title: 'Mostrar progreso', summary: 'Muestra cuánto de una operación ya se hizo, como una barra, un anillo o un indicador giratorio.' },
        groupRateItem: { title: 'Calificar', summary: 'Da una puntuación a algo: estrellas, pulgar arriba/abajo, emojis o escala NPS.' },
        groupPlayMedia: { title: 'Reproducir medios', summary: 'Reproduce audio o video, con los controles del reproductor.' },
        groupExpandContent: { title: 'Expandir y contraer', summary: 'Muestra u oculta partes del contenido a pedido, como un acordeón o "ver más".' },
        groupViewChart: { title: 'Gráfico', summary: 'Muestra datos en un gráfico: barras, líneas, áreas, torta y otros, con los mismos datos.' },
        groupViewCard: { title: 'Tarjeta', summary: 'Muestra un elemento como un bloque independiente, con título, contenido, pie y acciones.' },
        groupScanCode: { title: 'Escanear código', summary: 'Usa la cámara para leer un código QR, un código de barras o un documento.' },
        groupSearchContent: { title: 'Buscar', summary: 'Encuentra contenido escribiendo, con sugerencias mientras el usuario escribe.' },
        groupViewData: { title: 'Colección de datos', summary: 'Muestra un conjunto de registros, eligiendo el mejor formato para la pantalla.' },
        groupViewTable: { title: 'Tabla', summary: 'Muestra datos en filas y columnas, con ordenación, selección de filas y paginación.' },
        groupViewHierarchy: { title: 'Jerarquía', summary: 'Muestra elementos con padre e hijos que se abren y cierran, como un árbol o un organigrama.' },
        groupViewMetric: { title: 'Indicador', summary: 'Destaca un indicador: un número grande, una tarjeta de KPI, una tendencia o un medidor.' },
        groupNavigateSteps: { title: 'Pasos', summary: 'Guía al usuario por un proceso en pasos, como un paso a paso o un asistente.' },
        groupNavigateSection: { title: 'Navegar entre secciones', summary: 'Cambia entre secciones de la misma pantalla, como pestañas o píldoras. La página muestra el contenido de la sección elegida.' },
        groupNotifyUser: { title: 'Avisar', summary: 'Avisa al usuario sobre un evento o resultado: notificación breve, banner o alerta.' },
    },
};
/// **collab_i18n_end**

export const groupLabels: Readonly<Record<string, GroupLabels>> = messages;

/**
 * The display label of a group in a language, or null when that group has none — the caller then
 * falls back to what it showed before (the group id and its contract description). The language
 * key is the one `getMessageKey(groupLabels)` resolves; an unknown key falls back to English.
 */
export function getGroupLabel(group: string, lang: string): IGroupLabel | null {
    if (!group) return null;
    const table = messages[lang] ?? labels_en;
    const wanted = group.toLowerCase();
    const key = Object.keys(table).find((k) => k.toLowerCase() === wanted);
    return key ? table[key] : null;
}
