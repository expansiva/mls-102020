/// <mls fileReference="_102020_/l2/aura/helpers/appConfigSections.ts" enhancement="_blank"/>

// Pure core of the App Config plugin (pluginAppConfig): the `l5/config.json` of a client project as
// sections a person can read and edit. No DOM and no mls calls; the widget renders and does the I/O
// (configIo.ts). Proposal: collabMyFiles/configideia.md.
//
// What lives here, so it has tests and one place to update:
//   * the SCHEMA of the document (runtimeConfigTypes.ts + the keys the generators write): kind of each
//     field, required, options, format checks, the item a "+ add" creates;
//   * the OWNER of each field: who writes it and what happens to an edit (the badge on screen);
//   * the SECTIONS and which key goes where; a key nobody knows lands in "other", nothing is hidden;
//   * immutable edits (set, remove, insert, move, rename), the change list shown before applying, and the
//     rebase that applies the edit on top of a file that changed under the screen;
//   * validation: schema errors block the apply, consistency warnings do not.
//
// Everything is driven by the structure of the document: no module, page or project id is named here.

import { readModuleMenu, type MenuIssue } from '/_102020_/l2/aura/plugins/helpers/menuConfigCore.js';

export type Path = Array<string | number>;
export type Json = unknown;
export type JsonObject = Record<string, unknown>;

export interface Help { en: string; pt: string }

/**
 * Who writes a field, and so what an edit made here is worth:
 *   * generated    — written by a generation run; the next run keeps what exists and appends new items;
 *   * regenerated  — rewritten by a run or by every publish: an edit here lasts until then;
 *   * customizable — the publish takes `customize.*` of l5/project.json when it exists, else keeps this value;
 *   * free         — nobody rewrites it.
 */
export type Owner = 'generated' | 'regenerated' | 'customizable' | 'free';

/** Format checks; the file checks only warn (the stor may not hold every project). */
export type Check =
  | 'basePath' | 'route' | 'projectId' | 'settingsUrl' | 'favicon'
  | 'sourceFile' | 'entrypoint' | 'dir' | 'testFile';

interface SpecBase {
  /** Name on screen when FIELD_LABELS (by key) does not fit this place. */
  label?: Help;
  help?: Help;
  required?: boolean;
  /** Set where the owner differs from the parent's. */
  owner?: Owner;
  /** Who writes it / where to change it for good, shown next to the owner badge. */
  ownerNote?: Help;
}
export interface TextSpec extends SpecBase { kind: 'text' | 'textarea'; check?: Check }
export interface NumberSpec extends SpecBase { kind: 'number' }
export interface BooleanSpec extends SpecBase { kind: 'boolean' }
export interface EnumSpec extends SpecBase { kind: 'enum'; options: string[] }
export interface StringsSpec extends SpecBase { kind: 'strings'; check?: Check }
export interface ObjectSpec extends SpecBase { kind: 'object'; fields: Record<string, Spec> }
export interface ListSpec extends SpecBase {
  kind: 'list';
  item: Spec;
  /** Unique per list; also the title of the item. */
  keyField?: string;
  /** Second line of the item title. */
  titleField?: string;
  /** What names an item for a person (an error location): defaults to keyField. */
  nameField?: string;
  /** The item "+ add" creates, from the entry that holds the list (a module, for its pages). */
  newItem: (holder: JsonObject | undefined, list: Json[]) => Json;
}
export interface MapSpec extends SpecBase {
  kind: 'map';
  value: Spec;
  keyCheck?: Check;
  newValue: (key: string) => Json;
}
export interface JsonSpec extends SpecBase { kind: 'json' }
export type Spec = TextSpec | NumberSpec | BooleanSpec | EnumSpec | StringsSpec | ObjectSpec | ListSpec | MapSpec | JsonSpec;

const h = (en: string, pt: string): Help => ({ en, pt });

// ── schema ────────────────────────────────────────────────────────────────────

const GENERATED_FRONTEND = h(
  'Written by the frontend generation (agentMaterializeL2). The next generation keeps what is here and only appends new pages.',
  'Escrito pela geração do frontend (agentMaterializeL2). A próxima geração mantém o que está aqui e só acrescenta páginas novas.',
);
const FROM_L4_MODULE = h(
  'Comes from l4/<module>/module.defs.ts (productLanguages / userLanguage): the next generation rewrites it. Change it there for good.',
  'Vem do l4/<módulo>/module.defs.ts (productLanguages / userLanguage): a próxima geração reescreve. Para mudar de vez, altere lá.',
);
const FROM_BACKEND = h(
  'Rewritten on every publish by the backend composer (agentMaterializeL1/nodejsSaveConfigJson) from the backend block of l5/project.json. Change it there for good.',
  'Reescrito a cada publish pelo composer do backend (agentMaterializeL1/nodejsSaveConfigJson) a partir do bloco backend do l5/project.json. Para mudar de vez, altere lá.',
);
const FROM_L5_PROJECT = h(
  'Rewritten on every publish from l5/project.json (projectId, domain, port, database…). Change it there for good.',
  'Reescrito a cada publish a partir do l5/project.json (projectId, domain, port, database…). Para mudar de vez, altere lá.',
);
const CUSTOMIZE = h(
  'The publish keeps this value unless l5/project.json has customize.{key}, which wins.',
  'O publish mantém este valor, a não ser que o l5/project.json tenha customize.{key}, que tem prioridade.',
);

const navigationItem: ObjectSpec = {
  kind: 'object',
  fields: {
    id: { kind: 'text', required: true, help: h('Page id the item opens.', 'Id da página que o item abre.') },
    label: { kind: 'text', required: true, help: h('Text in the menu.', 'Texto no menu.') },
    href: { kind: 'text', required: true, check: 'route' },
    description: { kind: 'textarea' },
    actors: { kind: 'strings', help: h('Roles that see the item. Empty: everybody.', 'Papéis que veem o item. Vazio: todos.') },
    landing: { kind: 'boolean', help: h('Start page of some role (kept in sync with landings).', 'Página inicial de algum papel (acompanha landings).') },
    manageable: { kind: 'boolean' },
    hub: { kind: 'text' },
  },
};

const pageItem: ObjectSpec = {
  kind: 'object',
  fields: {
    pageId: { kind: 'text', required: true },
    route: { kind: 'text', required: true, check: 'route', help: h('The first page of the list also answers the module address.', 'A primeira página da lista também responde no endereço do módulo.') },
    title: { kind: 'text' },
    source: { kind: 'text', required: true, check: 'sourceFile' },
    definition: { kind: 'text', check: 'sourceFile' },
    componentTag: { kind: 'text', required: true },
    actors: { kind: 'strings', help: h('Roles allowed on the route. Empty: everybody.', 'Papéis com acesso à rota. Vazio: todos.') },
    public: { kind: 'boolean' },
  },
};

const moduleItem: ObjectSpec = {
  kind: 'object',
  fields: {
    moduleId: { kind: 'text', required: true },
    basePath: { kind: 'text', required: true, check: 'basePath' },
    shellMode: {
      kind: 'enum', options: ['spa', 'pwa'],
      help: h('Required when the module has pages: the server picks shellTemplates.<shellMode> to mount it.', 'Obrigatório quando o módulo tem páginas: o servidor usa shellTemplates.<shellMode> para montá-lo.'),
    },
    userLanguage: { kind: 'text', owner: 'regenerated', ownerNote: FROM_L4_MODULE },
    languages: { kind: 'strings', owner: 'regenerated', ownerNote: FROM_L4_MODULE },
    designSystems: { kind: 'strings', owner: 'generated', ownerNote: GENERATED_FRONTEND },
    navigation: {
      kind: 'list', owner: 'generated', ownerNote: GENERATED_FRONTEND,
      help: h('The aside menu, in its order.', 'O menu lateral, na ordem em que aparece.'),
      item: navigationItem, keyField: 'id', titleField: 'label', nameField: 'label',
      newItem: (module) => ({ id: '', label: '', href: `${basePathOf(module)}/`, description: '' }),
    },
    landings: {
      kind: 'list', owner: 'generated', ownerNote: GENERATED_FRONTEND,
      help: h('Start page per role.', 'Página inicial por papel.'),
      item: {
        kind: 'object',
        fields: {
          actorId: { kind: 'text', required: true },
          pageId: { kind: 'text', required: true },
          route: { kind: 'text', required: true, check: 'route' },
        },
      },
      keyField: 'actorId', titleField: 'pageId',
      newItem: (module) => ({ actorId: '', pageId: '', route: `${basePathOf(module)}/` }),
    },
    headerLinks: {
      kind: 'list', item: navigationItem, keyField: 'id', titleField: 'label', nameField: 'label',
      help: h('Links of this module in the app header.', 'Links deste módulo no cabeçalho do app.'),
      newItem: (module) => ({ id: '', label: '', href: `${basePathOf(module)}/`, actors: [] }),
    },
    frontend: {
      kind: 'object', owner: 'generated', ownerNote: GENERATED_FRONTEND,
      fields: {
        layer: { kind: 'text' },
        pages: {
          kind: 'list', item: pageItem, keyField: 'pageId', titleField: 'title', nameField: 'title',
          newItem: (frontend, list) => newPage(frontend, list),
        },
        pageTests: { kind: 'strings', check: 'testFile' },
        moduleEntrypoint: { kind: 'text', check: 'entrypoint' },
        moduleSource: { kind: 'text', check: 'sourceFile' },
      },
    },
    frontendEntrypoints: { kind: 'json' },
    backendControllers: { kind: 'text', check: 'dir', owner: 'regenerated', ownerNote: FROM_BACKEND },
    backendRouter: { kind: 'text', check: 'entrypoint', owner: 'regenerated', ownerNote: FROM_BACKEND },
    backend: {
      kind: 'object', owner: 'regenerated', ownerNote: FROM_BACKEND,
      fields: { pageTests: { kind: 'strings', check: 'testFile' } },
    },
  },
};

const persistenceItem: ObjectSpec = {
  kind: 'object',
  fields: {
    moduleId: { kind: 'text', required: true },
    tableDefsDir: { kind: 'text', check: 'dir' },
    persistenceEntrypoint: { kind: 'text', check: 'entrypoint' },
  },
};

/** One entry of `projects[<client>].modules`: the module screen of the plugin reads its fields. */
export const MODULE_SPEC: ObjectSpec = moduleItem;

/** The list of modules of the client, for "+ module". */
export const MODULES_LIST: ListSpec = {
  kind: 'list', item: moduleItem, keyField: 'moduleId', titleField: 'basePath',
  newItem: () => ({ moduleId: '', basePath: '/', shellMode: 'spa', navigation: [], headerLinks: [] }),
};
const modulesList = MODULES_LIST;
const persistenceList: ListSpec = {
  kind: 'list', item: persistenceItem, keyField: 'moduleId', titleField: 'tableDefsDir',
  owner: 'regenerated', ownerNote: FROM_BACKEND,
  newItem: () => ({ moduleId: '', tableDefsDir: '' }),
};

const projectRecord: ObjectSpec = {
  kind: 'object',
  fields: {
    root: { kind: 'text', required: true, help: h('Folder of the project, relative to this one.', 'Pasta do projeto, relativa a este.') },
    type: { kind: 'enum', options: ['client', 'master frontend', 'master backend', 'lib'] },
    role: { kind: 'text' },
    runtime: {
      kind: 'object', owner: 'regenerated', ownerNote: FROM_L5_PROJECT,
      fields: {
        projectId: { kind: 'text', check: 'projectId' },
        domain: { kind: 'text' },
        port: { kind: 'number' },
        databaseName: { kind: 'text' },
        environment: { kind: 'text' },
        studioEnabled: { kind: 'boolean' },
      },
    },
    modules: { ...modulesList, owner: 'regenerated', ownerNote: FROM_BACKEND },
    persistenceModules: persistenceList,
  },
};

const regionProfile: ObjectSpec = {
  kind: 'object',
  fields: {
    renderer: {
      kind: 'object', required: true,
      fields: {
        entrypoint: { kind: 'text', required: true, check: 'entrypoint' },
        tag: { kind: 'text', required: true },
        source: { kind: 'text', check: 'sourceFile' },
      },
    },
    heightPx: { kind: 'number', help: h('Fixed band height. Same value in every profile: no layout shift on switch.', 'Altura fixa da faixa. Mesmo valor em todos os perfis: nada pula ao trocar.') },
    widthPx: { kind: 'number' },
    brand: {
      kind: 'object',
      fields: {
        title: { kind: 'text', required: true },
        subtitle: { kind: 'text' },
        logoSvg: { kind: 'textarea' },
        logoUrl: { kind: 'text' },
        logoAlt: { kind: 'text' },
        href: { kind: 'text' },
      },
    },
    props: { kind: 'json' },
    source: { kind: 'text' },
    component: { kind: 'text' },
    appsMenuSource: { kind: 'text' },
    switchWithoutRouteReload: { kind: 'boolean' },
  },
};

const regionProfiles: ObjectSpec = {
  kind: 'object',
  fields: {
    activeProfile: { kind: 'text', required: true, help: h('Must be one of the profiles below.', 'Precisa ser um dos perfis abaixo.') },
    switchWithoutRouteReload: { kind: 'boolean' },
    profiles: {
      kind: 'map', value: regionProfile, required: true,
      newValue: () => ({ renderer: { entrypoint: '', tag: '' } }),
    },
  },
};

export const ROOT_SPEC: ObjectSpec = {
  kind: 'object',
  fields: {
    defaultProjectId: { kind: 'text', required: true, check: 'projectId' },
    shellTemplates: {
      kind: 'object', required: true, owner: 'customizable', ownerNote: CUSTOMIZE,
      fields: {
        spa: { kind: 'text', required: true, check: 'entrypoint' },
        pwa: { kind: 'text', required: true, check: 'entrypoint' },
      },
    },
    clientShell: {
      kind: 'object', owner: 'customizable', ownerNote: CUSTOMIZE,
      fields: {
        mode: { kind: 'enum', options: ['spa', 'pwa'], required: true },
        activeProfile: { kind: 'text' },
        runtimeControls: { kind: 'json' },
        regions: {
          kind: 'object', required: true,
          fields: { header: regionProfiles, aside: regionProfiles },
        },
      },
    },
    favicon: { kind: 'text', check: 'favicon', help: h('Same-origin href (/…). Other origins are ignored.', 'Endereço da mesma origem (/…). Outras origens são ignoradas.') },
    workspaceDependencies: {
      kind: 'strings', check: 'projectId',
      help: h('Projects of the workspace (also edited by the Dependencies plugin of 100555).', 'Projetos do workspace (também editado pelo plugin de dependências do 100555).'),
    },
    projects: {
      kind: 'map', value: projectRecord, required: true, keyCheck: 'projectId',
      newValue: (key) => ({ root: `../mls-${key}`, type: 'lib' }),
    },
    projectSettings: {
      kind: 'object',
      fields: {
        driver: { kind: 'enum', options: ['vm', 'GitHub', 'GitLab'], required: true },
        url: { kind: 'text', required: true, check: 'settingsUrl', help: h('The last three segments are branch/owner/repo.', 'Os três últimos segmentos são branch/dono/repositório.') },
        name: { kind: 'text' },
        userAuth: { kind: 'enum', options: ['public', 'private'] },
      },
    },
    organization: {
      kind: 'object',
      fields: { source: { kind: 'enum', options: ['project-file', 'development-project'], label: h('Source', 'Origem') } },
    },
    onboarding: {
      kind: 'object',
      fields: {
        moduleId: { kind: 'text', required: true },
        entryPath: { kind: 'text', required: true, check: 'route' },
        personType: { kind: 'text', required: true },
        companyType: { kind: 'text', required: true },
        organizationSource: { kind: 'enum', options: ['project-file', 'development-project'] },
        redirect: { kind: 'boolean' },
      },
    },
    vmGitOrigin: { kind: 'text' },
    alphaAllAuthorities: { kind: 'boolean' },
  },
};

function basePathOf(module: JsonObject | undefined): string {
  const basePath = typeof module?.basePath === 'string' ? module.basePath : '';
  return basePath.replace(/\/+$/, '');
}

/** A new page next to the existing ones: same folder as the last page, so only the id is left to type. */
function newPage(_frontend: JsonObject | undefined, list: Json[]): JsonObject {
  const last = [...list].reverse().find(isObject);
  const folder = typeof last?.source === 'string' ? last.source.replace(/[^/]*$/, '') : '';
  const route = typeof last?.route === 'string' ? last.route.replace(/[^/]*$/, '') : '/';
  return { pageId: '', route, title: '', source: folder, definition: folder, componentTag: '' };
}

// ── names on screen ───────────────────────────────────────────────────────────

/**
 * The name of a field for a person, by its key. The key itself stays in the tooltip. A key that means
 * something else in one place carries its own `label` in the spec, which wins.
 */
export const FIELD_LABELS: Record<string, Help> = {
  // module
  moduleId: h('Module id', 'Id do módulo'),
  basePath: h('Base address', 'Endereço base'),
  shellMode: h('Shell mode', 'Modo do shell'),
  userLanguage: h('User language', 'Idioma do usuário'),
  languages: h('Languages', 'Idiomas'),
  designSystems: h('Design systems', 'Design systems'),
  navigation: h('Menu', 'Menu'),
  landings: h('Start pages', 'Páginas iniciais'),
  headerLinks: h('Header links', 'Links do cabeçalho'),
  frontend: h('Frontend', 'Frontend'),
  frontendEntrypoints: h('Frontend entrypoints', 'Entradas do frontend'),
  backendControllers: h('Backend controllers', 'Controllers do backend'),
  backendRouter: h('Backend router', 'Roteador do backend'),
  backend: h('Backend', 'Backend'),
  layer: h('Layer', 'Camada'),
  pages: h('Pages', 'Páginas'),
  pageTests: h('Page tests', 'Testes de página'),
  moduleEntrypoint: h('Module entrypoint', 'Entrada do módulo'),
  moduleSource: h('Module source', 'Fonte do módulo'),
  // menu item, page, start page
  id: h('Page', 'Página'),
  label: h('Label', 'Rótulo'),
  href: h('Link', 'Link'),
  description: h('Description', 'Descrição'),
  actors: h('Roles', 'Papéis'),
  landing: h('Start page', 'Página inicial'),
  manageable: h('Manageable', 'Gerenciável'),
  hub: h('Hub', 'Hub'),
  icon: h('Icon', 'Ícone'),
  iconSvg: h('Icon (SVG)', 'Ícone (SVG)'),
  pageId: h('Page', 'Página'),
  route: h('Route', 'Rota'),
  title: h('Title', 'Título'),
  source: h('Source file', 'Arquivo'),
  definition: h('Definition file', 'Arquivo de definição'),
  componentTag: h('Component tag', 'Tag do componente'),
  public: h('Public', 'Pública'),
  actorId: h('Role', 'Papel'),
  // persistence
  tableDefsDir: h('Tables folder', 'Pasta das tabelas'),
  persistenceEntrypoint: h('Persistence entrypoint', 'Entrada da persistência'),
  persistenceModules: h('Persistence', 'Persistência'),
  // projects
  root: h('Folder', 'Pasta'),
  type: h('Type', 'Tipo'),
  role: h('Role in the workspace', 'Papel no workspace'),
  runtime: h('Runtime', 'Execução'),
  projectId: h('Project id', 'Id do projeto'),
  domain: h('Domain', 'Domínio'),
  port: h('Port', 'Porta'),
  databaseName: h('Database', 'Banco de dados'),
  environment: h('Environment', 'Ambiente'),
  studioEnabled: h('Studio on', 'Estúdio ligado'),
  modules: h('Modules', 'Módulos'),
  // shell
  renderer: h('Renderer', 'Renderizador'),
  entrypoint: h('Entrypoint', 'Entrada'),
  tag: h('Tag', 'Tag'),
  heightPx: h('Height (px)', 'Altura (px)'),
  widthPx: h('Width (px)', 'Largura (px)'),
  brand: h('Brand', 'Marca'),
  subtitle: h('Subtitle', 'Subtítulo'),
  logoSvg: h('Logo (SVG)', 'Logo (SVG)'),
  logoUrl: h('Logo (address)', 'Logo (endereço)'),
  logoAlt: h('Logo text', 'Texto do logo'),
  props: h('Properties', 'Propriedades'),
  component: h('Component', 'Componente'),
  appsMenuSource: h('Apps menu source', 'Fonte do menu de apps'),
  switchWithoutRouteReload: h('Switch without reloading the route', 'Trocar sem recarregar a rota'),
  activeProfile: h('Active profile', 'Perfil ativo'),
  profiles: h('Profiles', 'Perfis'),
  defaultProjectId: h('Default project', 'Projeto padrão'),
  shellTemplates: h('HTML templates', 'Templates HTML'),
  spa: h('SPA', 'SPA'),
  pwa: h('PWA', 'PWA'),
  clientShell: h('App shell', 'Shell do app'),
  mode: h('Mode', 'Modo'),
  runtimeControls: h('Runtime controls', 'Controles de execução'),
  regions: h('Regions', 'Regiões'),
  header: h('Header', 'Cabeçalho'),
  aside: h('Side menu', 'Menu lateral'),
  favicon: h('Favicon', 'Favicon'),
  // project
  workspaceDependencies: h('Workspace projects', 'Projetos do workspace'),
  projects: h('Projects', 'Projetos'),
  projectSettings: h('Where the code is saved', 'Onde o código é salvo'),
  driver: h('Driver', 'Driver'),
  url: h('Address', 'Endereço'),
  name: h('Name', 'Nome'),
  userAuth: h('Access', 'Acesso'),
  organization: h('Organization', 'Organização'),
  onboarding: h('Onboarding', 'Onboarding'),
  entryPath: h('Entry route', 'Rota de entrada'),
  personType: h('Person type', 'Tipo de pessoa'),
  companyType: h('Company type', 'Tipo de empresa'),
  organizationSource: h('Organization source', 'Origem da organização'),
  redirect: h('Redirect', 'Redirecionar'),
  vmGitOrigin: h('VM git origin', 'Origem git da VM'),
  alphaAllAuthorities: h('All authorities (alpha)', 'Todas as autoridades (alpha)'),
};

/** The name of a field on screen; undefined only for a key nobody named (the key is shown). */
export function labelOf(key: string, spec?: Spec): Help | undefined {
  return spec?.label ?? FIELD_LABELS[key];
}

// ── where a path lives on screen ──────────────────────────────────────────────

/**
 * The screen of the plugin that shows a path: `module:<index>` for a module of the client, else one of
 * `shell`, `dependencies`, `project`, `persistence`, `other`; `checks` when the path is the modules list
 * itself (an orphan page belongs to no module entry yet).
 */
export function viewOfPath(config: Json, projectId: number, path: Path): string {
  const client = clientKey(config, projectId);
  const [first, second, third, fourth] = path;
  if (first === 'projects' && second === client) {
    if (third === 'modules') return typeof fourth === 'number' ? `module:${fourth}` : 'checks';
    if (third === 'persistenceModules') return 'persistence';
  }
  const key = String(first ?? '');
  for (const [view, keys] of Object.entries(SECTION_KEYS)) if (keys.includes(key)) return view;
  return 'other';
}

/** One step of a location: a field name (translated on screen) or the name of an item (shown as is). */
export type Where = Help | string;

/**
 * Where a path is, for a person: `['tarefas', Menu, 'Minhas tarefas', Route]` instead of
 * `projects.102047.modules[3].navigation[2].href`. A module path starts at the module's id.
 */
export function describePath(config: Json, projectId: number, path: Path): Where[] {
  const trail: Where[] = [];
  let spec: Spec | undefined = ROOT_SPEC;
  let node: Json = config;
  path.forEach((part, index) => {
    const value = getAt(node, [part]);
    if (spec?.kind === 'object' && typeof part === 'string') {
      const field: Spec | undefined = spec.fields[part];
      trail.push(labelOf(part, field) ?? part);
      spec = field;
    } else if (spec?.kind === 'list' && typeof part === 'number') {
      const field = spec.nameField ?? spec.keyField;
      const name = field && isObject(value) ? String(value[field] ?? '') : '';
      const fallback = spec.keyField && isObject(value) ? String(value[spec.keyField] ?? '') : '';
      trail.push(name || fallback || `#${part + 1}`);
      spec = spec.item;
    } else if (spec?.kind === 'map') {
      trail.push(String(part));
      spec = spec.value;
    } else {
      trail.push(typeof part === 'number' ? `#${part + 1}` : (index ? part : FIELD_LABELS[part] ?? part));
      spec = undefined;
    }
    node = value;
  });
  // A module of the client: the projects/<client>/modules steps say nothing a person needs.
  if (viewOfPath(config, projectId, path).startsWith('module:')) return trail.slice(3);
  return trail;
}

// ── sections ──────────────────────────────────────────────────────────────────

export type SectionId = 'modules' | 'shell' | 'dependencies' | 'project' | 'other';

export interface Section {
  id: SectionId;
  title: Help;
  help: Help;
  /** The blocks of the section: a path in the document and its spec. */
  blocks: Array<{ path: Path; spec: Spec; label: string }>;
}

/** The project entry this screen is about: the project itself, or the only `client` entry. */
export function clientKey(config: Json, projectId: number): string {
  const projects = isObject(config) && isObject(config.projects) ? config.projects : {};
  if (isObject(projects[String(projectId)])) return String(projectId);
  const client = Object.entries(projects).find(([, record]) => isObject(record) && record.type === 'client');
  return client ? client[0] : String(projectId);
}

const SECTION_KEYS: Record<Exclude<SectionId, 'modules' | 'other'>, string[]> = {
  shell: ['clientShell', 'shellTemplates', 'favicon'],
  dependencies: ['workspaceDependencies', 'projects'],
  project: ['defaultProjectId', 'projectSettings', 'organization', 'onboarding', 'vmGitOrigin', 'alphaAllAuthorities'],
};

export function buildSections(config: Json, projectId: number): Section[] {
  const client = clientKey(config, projectId);
  const root = isObject(config) ? config : {};
  const block = (key: string) => ({ path: [key], spec: ROOT_SPEC.fields[key], label: key });
  const known = new Set([...Object.values(SECTION_KEYS).flat()]);
  return [
    {
      id: 'modules',
      title: h('Modules', 'Módulos'),
      help: h(
        `Every module of project ${client}: pages, menu, start pages, tests and backend.`,
        `Todos os módulos do projeto ${client}: páginas, menu, páginas iniciais, testes e backend.`,
      ),
      blocks: [
        { path: ['projects', client, 'modules'], spec: modulesList, label: 'modules' },
        { path: ['projects', client, 'persistenceModules'], spec: persistenceList, label: 'persistenceModules' },
      ],
    },
    {
      id: 'shell',
      title: h('App shell', 'Shell do app'),
      help: h('How the app boots: SPA/PWA, header and aside, brand and logo, HTML templates.', 'Como o app sobe: SPA/PWA, cabeçalho e lateral, marca e logo, templates HTML.'),
      blocks: SECTION_KEYS.shell.map(block),
    },
    {
      id: 'dependencies',
      title: h('Dependencies', 'Dependências'),
      help: h('Projects of the workspace and where each one lives.', 'Projetos do workspace e onde cada um fica.'),
      blocks: SECTION_KEYS.dependencies.map(block),
    },
    {
      id: 'project',
      title: h('Project', 'Projeto'),
      help: h('Identity, organization, where the source is saved.', 'Identidade, organização, onde o código é salvo.'),
      blocks: SECTION_KEYS.project.map(block),
    },
    {
      id: 'other',
      title: h('Other', 'Outros'),
      help: h('Keys this screen does not know yet, edited as JSON so nothing stays hidden.', 'Chaves que esta tela ainda não conhece, editadas como JSON para nada ficar escondido.'),
      blocks: Object.keys(root).filter(key => !known.has(key))
        .map(key => ({ path: [key], spec: { kind: 'json' } as JsonSpec, label: key })),
    },
  ];
}

/** Paths a section already shows elsewhere: the projects map does not repeat the client modules. */
export function shownElsewhere(config: Json, projectId: number): Path[] {
  const client = clientKey(config, projectId);
  return [['projects', client, 'modules'], ['projects', client, 'persistenceModules']];
}

/** Optional fields of an object spec that the value does not have yet (what "+ field" offers). */
export function missingFields(spec: ObjectSpec, value: Json): string[] {
  const object = isObject(value) ? value : {};
  return Object.keys(spec.fields).filter(key => !(key in object));
}

/** Keys of the value the spec does not know: shown as JSON next to the known fields. */
export function unknownKeys(spec: ObjectSpec, value: Json): string[] {
  return isObject(value) ? Object.keys(value).filter(key => !(key in spec.fields)) : [];
}

/** A blank value for a field, used by "+ field". */
export function emptyValue(spec: Spec): Json {
  switch (spec.kind) {
    case 'text': case 'textarea': return '';
    case 'number': return 0;
    case 'boolean': return false;
    case 'enum': return spec.options[0] ?? '';
    case 'strings': case 'list': return [];
    case 'map': return {};
    case 'json': return {};
    case 'object': {
      const object: JsonObject = {};
      for (const [key, field] of Object.entries(spec.fields)) if (field.required) object[key] = emptyValue(field);
      return object;
    }
  }
}

/** The owner that applies at a node: its own, else the nearest parent's, else free. */
export function ownerOf(spec: Spec, parent: Owner = 'free'): Owner {
  return spec.owner ?? parent;
}

// ── paths and immutable edits ─────────────────────────────────────────────────

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function pathKey(path: Path): string {
  return path.map((part, index) => typeof part === 'number' ? `[${part}]` : `${index ? '.' : ''}${part}`).join('');
}

export function getAt(root: Json, path: Path): Json {
  let node = root;
  for (const part of path) {
    if (Array.isArray(node) && typeof part === 'number') node = node[part];
    else if (isObject(node)) node = node[String(part)];
    else return undefined;
  }
  return node;
}

/** Sets the value at `path`, creating missing objects; `undefined` removes the key (or the list item). */
export function setAt(root: Json, path: Path, value: Json): Json {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (Array.isArray(root) && typeof head === 'number') {
    const copy = [...root];
    if (rest.length === 0 && value === undefined) copy.splice(head, 1);
    else copy[head] = setAt(root[head], rest, value);
    return copy;
  }
  const object: JsonObject = isObject(root) ? { ...root } : {};
  const key = String(head);
  if (rest.length === 0 && value === undefined) delete object[key];
  else object[key] = setAt(object[key], rest, value);
  return object;
}

export function removeAt(root: Json, path: Path): Json {
  return setAt(root, path, undefined);
}

/** Appends to the list at `listPath` (creating it). */
export function appendAt(root: Json, listPath: Path, item: Json): Json {
  const list = getAt(root, listPath);
  return setAt(root, listPath, [...(Array.isArray(list) ? list : []), item]);
}

export function moveAt(root: Json, listPath: Path, from: number, to: number): Json {
  const list = getAt(root, listPath);
  if (!Array.isArray(list) || to < 0 || to >= list.length || from === to) return root;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return setAt(root, listPath, copy);
}

/** Renames a key of the map at `mapPath`, keeping its position. Refused when the new key exists. */
export function renameKeyAt(root: Json, mapPath: Path, from: string, to: string): Json {
  const map = getAt(root, mapPath);
  if (!isObject(map) || !(from in map) || !to || (to !== from && to in map)) return root;
  const renamed: JsonObject = {};
  for (const [key, value] of Object.entries(map)) renamed[key === from ? to : key] = value;
  return setAt(root, mapPath, renamed);
}

export function deepEqual(a: Json, b: Json): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ── change list and rebase ────────────────────────────────────────────────────

export interface Change { path: Path; before: Json; after: Json }

/**
 * What changed between two versions, as the smallest paths: objects are compared key by key, a list of
 * the same length item by item; a list that grew, shrank or was reordered is one change of the whole list.
 */
export function diffConfig(before: Json, after: Json, path: Path = []): Change[] {
  if (deepEqual(before, after)) return [];
  if (isObject(before) && isObject(after)) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    return keys.flatMap(key => diffConfig(before[key], after[key], [...path, key]));
  }
  if (Array.isArray(before) && Array.isArray(after) && before.length === after.length && sameItemKeys(before, after)) {
    return before.flatMap((item, index) => diffConfig(item, after[index], [...path, index]));
  }
  return [{ path, before, after }];
}

/** Same length is not enough to diff a list item by item: a move keeps the length and changes the order. */
function sameItemKeys(before: Json[], after: Json[]): boolean {
  const keyOf = (item: Json) => isObject(item) ? String(item.id ?? item.pageId ?? item.moduleId ?? item.actorId ?? '') : '';
  return before.every((item, index) => keyOf(item) === keyOf(after[index]));
}

export interface RebaseResult { config: Json; conflicts: Path[] }

/**
 * Applies the edit (original → edited) on top of `fresh`, the file as it is now. A change whose place in
 * `fresh` still holds the original value goes in; a change whose place changed meanwhile (an agent, the
 * header editor, another tab) is a conflict and nothing is written.
 */
export function rebaseConfig(original: Json, edited: Json, fresh: Json): RebaseResult {
  let config = fresh;
  const conflicts: Path[] = [];
  for (const change of diffConfig(original, edited)) {
    const current = getAt(fresh, change.path);
    if (deepEqual(current, change.before)) config = setAt(config, change.path, change.after);
    else if (!deepEqual(current, change.after)) conflicts.push(change.path);
  }
  return { config: conflicts.length ? fresh : config, conflicts };
}

// ── validation ────────────────────────────────────────────────────────────────

export type IssueCode =
  | 'required' | 'wrong-type' | 'bad-option' | 'duplicate-key' | 'empty-key'
  | 'bad-basePath' | 'bad-route' | 'bad-projectId' | 'bad-settingsUrl' | 'bad-favicon'
  | 'duplicate-route' | 'route-outside-module' | 'unknown-profile'
  | 'missing-file' | 'missing-dir' | 'orphan-page' | 'menu';

export interface Issue {
  path: Path;
  code: IssueCode;
  severity: 'error' | 'warning';
  /** The offending value. */
  detail?: string;
  /** For `menu`: the issue of menuConfigCore, which `fixMenuIssue` corrects. */
  menuIssue?: MenuIssue;
}

/** A file or folder the config points at, in stor terms. */
export interface FileRef {
  kind: 'file' | 'dir';
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
}

export interface ValidationEnv {
  /** Does the stor hold it? `undefined` = cannot tell (project not loaded): no warning. */
  refExists?: (ref: FileRef) => boolean | undefined;
  /** Project-relative paths (`l2/<module>/web/<device>/pageNN/<page>.ts`) of the client's page files. */
  pageFiles?: string[];
}

const FORMAT_CHECKS: Partial<Record<Check, { code: IssueCode; test: (value: string) => boolean }>> = {
  basePath: { code: 'bad-basePath', test: value => /^\/[^\s/][^\s]*$/.test(value) && !value.endsWith('/') },
  route: { code: 'bad-route', test: value => /^\/\S*$/.test(value) },
  projectId: { code: 'bad-projectId', test: value => /^\d+$/.test(value) },
  settingsUrl: { code: 'bad-settingsUrl', test: value => value.split('/').filter(Boolean).length >= 3 },
  favicon: { code: 'bad-favicon', test: value => value.startsWith('/') && !value.startsWith('//') },
};

/**
 * Reads a path of the config as a stor file. Accepted shapes:
 *   `l2/a/b/page.ts` (project-relative, of `projectId`), `../mls-<id>/l2/a/b.ts`,
 *   `/_<id>_/l2/a/b.js`, `./_<id>_/l2/a/b.html`, `_<id>_/l2/a/b.test.js` and, for folders, `./_<id>_/l1/a/b`.
 * A compiled `.js` is looked up as its `.ts`.
 */
export function parseRef(value: string, projectId: number, kind: 'file' | 'dir'): FileRef | undefined {
  const match = /^(?:\.\/|\/)?(?:_(\d+)_\/|\.\.\/mls-(\d+)\/)?l(\d)\/(.+)$/.exec(value.trim());
  if (!match) return undefined;
  const project = Number(match[1] ?? match[2] ?? projectId);
  const level = Number(match[3]);
  const rest = match[4].replace(/\/+$/, '');
  if (kind === 'dir') return { kind, project, level, folder: rest, shortName: '', extension: '' };
  const slash = rest.lastIndexOf('/');
  const folder = slash < 0 ? '' : rest.slice(0, slash);
  const file = rest.slice(slash + 1);
  const dot = file.lastIndexOf('.');
  if (dot <= 0) return undefined;
  const extension = file.slice(dot) === '.js' ? '.ts' : file.slice(dot);
  return { kind, project, level, folder, shortName: file.slice(0, dot), extension };
}

const FILE_CHECKS: Partial<Record<Check, 'file' | 'dir'>> = {
  sourceFile: 'file', entrypoint: 'file', testFile: 'file', dir: 'dir',
};

export function validateConfig(config: Json, projectId: number, env: ValidationEnv = {}): Issue[] {
  const issues: Issue[] = [];
  const project = Number(clientKey(config, projectId)) || projectId;
  // A lib or master keeps only projectSettings in its config.json: the app keys are not missing there.
  const spec: ObjectSpec = isAppConfig(config) ? ROOT_SPEC : {
    ...ROOT_SPEC,
    fields: Object.fromEntries(Object.entries(ROOT_SPEC.fields).map(([key, field]) => [key, { ...field, required: false }])),
  };
  walk(spec, config, [], issues, project, env);
  crossChecks(config, projectId, issues, env);
  return issues;
}

function checkString(value: string, check: Check | undefined, path: Path, issues: Issue[], project: number, env: ValidationEnv): void {
  if (!check || !value) return;
  const format = FORMAT_CHECKS[check];
  if (format && !format.test(value)) {
    issues.push({ path, code: format.code, severity: 'error', detail: value });
    return;
  }
  const kind = FILE_CHECKS[check];
  if (!kind || !env.refExists) return;
  const ref = parseRef(value, project, kind);
  if (!ref) return;
  if (env.refExists(ref) === false) issues.push({ path, code: kind === 'dir' ? 'missing-dir' : 'missing-file', severity: 'warning', detail: value });
}

function walk(spec: Spec, value: Json, path: Path, issues: Issue[], project: number, env: ValidationEnv): void {
  if (value === undefined) return;
  const wrongType = () => issues.push({ path, code: 'wrong-type', severity: 'error', detail: spec.kind });
  switch (spec.kind) {
    case 'text': case 'textarea':
      if (typeof value !== 'string') return void wrongType();
      checkString(value, spec.check, path, issues, project, env);
      return;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) wrongType();
      return;
    case 'boolean':
      if (typeof value !== 'boolean') wrongType();
      return;
    case 'enum':
      if (typeof value !== 'string' || !spec.options.includes(value)) issues.push({ path, code: 'bad-option', severity: 'error', detail: String(value) });
      return;
    case 'strings':
      if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) return void wrongType();
      value.forEach((item, index) => checkString(item as string, spec.check, [...path, index], issues, project, env));
      duplicates(value as string[]).forEach(index => issues.push({ path: [...path, index], code: 'duplicate-key', severity: 'error', detail: value[index] as string }));
      return;
    case 'json':
      return;
    case 'object':
      if (!isObject(value)) return void wrongType();
      for (const [key, field] of Object.entries(spec.fields)) {
        const child = value[key];
        if (child === undefined || (field.required && child === '')) {
          if (field.required) issues.push({ path: [...path, key], code: 'required', severity: 'error' });
          if (child === undefined) continue;
        }
        walk(field, child, [...path, key], issues, project, env);
      }
      return;
    case 'list': {
      if (!Array.isArray(value)) return void wrongType();
      value.forEach((item, index) => walk(spec.item, item, [...path, index], issues, project, env));
      if (spec.keyField) {
        const keys = value.map(item => isObject(item) && typeof item[spec.keyField!] === 'string' ? item[spec.keyField!] as string : '');
        duplicates(keys).forEach(index => issues.push({ path: [...path, index, spec.keyField!], code: 'duplicate-key', severity: 'error', detail: keys[index] }));
      }
      return;
    }
    case 'map':
      if (!isObject(value)) return void wrongType();
      for (const [key, child] of Object.entries(value)) {
        if (!key.trim()) issues.push({ path: [...path, key], code: 'empty-key', severity: 'error' });
        else if (spec.keyCheck) checkString(key, spec.keyCheck, [...path, key], issues, project, env);
        walk(spec.value, child, [...path, key], issues, project, env);
      }
      return;
  }
}

/** Indexes of the second and later occurrences of a non-empty value. */
function duplicates(values: string[]): number[] {
  const seen = new Set<string>();
  const result: number[] = [];
  values.forEach((value, index) => {
    if (!value) return;
    if (seen.has(value)) result.push(index);
    seen.add(value);
  });
  return result;
}

function crossChecks(config: Json, projectId: number, issues: Issue[], env: ValidationEnv): void {
  const client = clientKey(config, projectId);
  const modules = getAt(config, ['projects', client, 'modules']);
  const routes = new Map<string, Path>();
  const declaredSources = new Set<string>();
  if (Array.isArray(modules)) {
    modules.forEach((module, moduleIndex) => {
      if (!isObject(module)) return;
      const modulePath: Path = ['projects', client, 'modules', moduleIndex];
      const basePath = typeof module.basePath === 'string' ? module.basePath.replace(/\/+$/, '') : '';
      const pages = getAt(module, ['frontend', 'pages']);
      // appRegistry (102034) mounts a module with routes through shellTemplates[shellMode]: absent, it throws.
      if (Array.isArray(pages) && pages.length > 0 && !module.shellMode) {
        issues.push({ path: [...modulePath, 'shellMode'], code: 'required', severity: 'error' });
      }
      if (Array.isArray(pages)) {
        pages.forEach((page, pageIndex) => {
          if (!isObject(page)) return;
          const pagePath: Path = [...modulePath, 'frontend', 'pages', pageIndex, 'route'];
          if (typeof page.source === 'string') declaredSources.add(page.source.replace(/^\.?\//, ''));
          const route = typeof page.route === 'string' ? page.route : '';
          if (!route) return;
          const routeKey = route.replace(/\/+$/, '');
          if (routes.has(routeKey)) issues.push({ path: pagePath, code: 'duplicate-route', severity: 'error', detail: route });
          else routes.set(routeKey, pagePath);
          if (basePath && routeKey !== basePath && !routeKey.startsWith(`${basePath}/`)) {
            issues.push({ path: pagePath, code: 'route-outside-module', severity: 'warning', detail: route });
          }
        });
      }
      for (const issue of readModuleMenu(module).issues) {
        issues.push({ path: [...modulePath, 'navigation'], code: 'menu', severity: 'warning', detail: issue.pageId, menuIssue: issue });
      }
    });
  }
  for (const region of ['header', 'aside']) {
    const profiles = getAt(config, ['clientShell', 'regions', region]);
    if (!isObject(profiles) || typeof profiles.activeProfile !== 'string' || !profiles.activeProfile) continue;
    if (!isObject(profiles.profiles) || !(profiles.activeProfile in profiles.profiles)) {
      issues.push({ path: ['clientShell', 'regions', region, 'activeProfile'], code: 'unknown-profile', severity: 'error', detail: profiles.activeProfile });
    }
  }
  for (const file of orphanPages(env.pageFiles ?? [], declaredSources)) {
    issues.push({ path: ['projects', client, 'modules'], code: 'orphan-page', severity: 'warning', detail: file });
  }
}

/**
 * Page files under a `pageNN` folder that no route points at. Only the page itself counts: its .defs,
 * .test and the other helpers of the folder are not pages. Variants (page21…) are swapped on the same
 * route by the shell, so a folder whose page id has a route in ANY genome is not orphan.
 */
export function orphanPages(pageFiles: string[], declaredSources: Set<string>): string[] {
  const pageIdOf = (file: string) => /\/web\/[^/]+\/page\d+\/([^/]+)\.ts$/.exec(file)?.[1];
  const routed = new Set([...declaredSources].map(source => {
    const id = pageIdOf(source);
    return id ? `${source.split('/web/')[0]}/${id}` : source;
  }));
  return pageFiles.filter(file => {
    if (/\.(defs|test)\.ts$/.test(file)) return false;
    const id = pageIdOf(file);
    return id !== undefined && !routed.has(`${file.split('/web/')[0]}/${id}`);
  });
}

/** Issues by path, to show each one next to its field; the `menu` and `orphan-page` ones stay on their list. */
export function issuesByPath(issues: Issue[]): Map<string, Issue[]> {
  const map = new Map<string, Issue[]>();
  for (const issue of issues) {
    const key = pathKey(issue.path);
    map.set(key, [...(map.get(key) ?? []), issue]);
  }
  return map;
}

export function hasErrors(issues: Issue[]): boolean {
  return issues.some(issue => issue.severity === 'error');
}

/** A config that describes an app (has `projects`); a lib or master holds only projectSettings. */
export function isAppConfig(config: Json): boolean {
  return isObject(config) && isObject(config.projects);
}

/**
 * The errors the edit brought: only these block the apply. An error the file already had is shown but
 * does not stop an unrelated edit (an old shape of a region must not lock the whole file).
 */
export function newErrors(before: Issue[], after: Issue[]): Issue[] {
  const keyOf = (issue: Issue) => `${issue.code}@${pathKey(issue.path)}@${issue.detail ?? ''}`;
  const existing = new Set(before.filter(issue => issue.severity === 'error').map(keyOf));
  return after.filter(issue => issue.severity === 'error' && !existing.has(keyOf(issue)));
}
