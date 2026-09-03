/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeUiScenary.ts" enhancement="_blank"/>

// Deterministic l4/commands → uiScenary map for the shared generator.
//
// Contract written into shared `.defs.ts` as `scenaries[]` (page skeleton reads `value`):
//   { value, kind: 'base'|'detail'|'command', commandName?, preconditions: stateKey[] }
// `preconditions` are required route/selection input state keys (skill rule 8 — empty id
// disables the action). Form fields are NOT preconditions: the user fills them in the scene.
// Destructive commands (delete*/cancel*) never become scenes; they stay modal.

export type CfeUiScenaryKind = 'base' | 'detail' | 'command';

export interface CfeUiScenaryInput {
  name: string;
  required?: boolean;
  presentation?: string;
  source?: string;
}

export interface CfeUiScenaryCommand {
  commandName: string;
  kind: 'query' | 'command' | string;
  accessKind?: string;
  selection?: string;
  outputShape?: string;
  input?: CfeUiScenaryInput[];
}

export interface CfeUiScenary {
  value: string;
  kind: CfeUiScenaryKind;
  commandName?: string;
  /** Required route/selection input state keys that must be non-empty to activate the scene. */
  preconditions: string[];
}

export function isDestructiveCommandName(commandName: string): boolean {
  const stripped = commandName.replace(/^cmd/i, '');
  const titled = stripped.charAt(0).toUpperCase() + stripped.slice(1);
  return /^(Delete|Cancel)(?=[A-Z]|$)/.test(titled);
}

/** `cmdDecideTaskStatus` → `decideTaskStatus`; already-bare names stay. */
export function commandScenaryValue(commandName: string): string {
  if (!/^cmd/i.test(commandName)) return commandName;
  const rest = commandName.replace(/^cmd/i, '');
  if (!rest) return commandName;
  return rest.charAt(0).toLowerCase() + rest.slice(1);
}

export function isGetByIdQuery(command: CfeUiScenaryCommand): boolean {
  if (String(command.kind).toLowerCase() !== 'query') return false;
  const access = String(command.accessKind || '').toLowerCase();
  if (access === 'getbyid') return true;
  if (access === 'list' || access === 'lookup') return false;
  const shape = String(command.outputShape || '').toLowerCase();
  return shape === 'object' && requiredRouteOrSelectionInputs(command).length > 0;
}

export function isListOrHubQuery(command: CfeUiScenaryCommand): boolean {
  if (String(command.kind).toLowerCase() !== 'query') return false;
  if (isGetByIdQuery(command)) return false;
  const access = String(command.accessKind || '').toLowerCase();
  if (access === 'list' || access === 'lookup') return true;
  const shape = String(command.outputShape || '').toLowerCase();
  return shape === 'array' || shape === 'paginated' || shape === '';
}

function requiredRouteOrSelectionInputs(command: CfeUiScenaryCommand): CfeUiScenaryInput[] {
  return (command.input || []).filter(field => field.required === true && isRouteOrSelectionInput(field));
}

export function isRouteOrSelectionInput(field: CfeUiScenaryInput): boolean {
  const presentation = String(field.presentation || '').toLowerCase();
  const source = String(field.source || '').toLowerCase();
  if (presentation === 'route' || presentation === 'selection') return true;
  return source === 'routeparam' || source === 'selectedentity' || source === 'selection';
}

function inputStateKey(pageId: string, commandName: string, fieldName: string): string {
  return `ui.${pageId}.input.${commandName}.${fieldName}`;
}

function preconditionKeys(pageId: string, command: CfeUiScenaryCommand): string[] {
  return requiredRouteOrSelectionInputs(command).map(field => inputStateKey(pageId, command.commandName, field.name));
}

/**
 * Always emits at least the base scene (even when the page has a single query).
 * Detail exists when some query has `selection: 'single'` AND a getById/inspect query is present.
 * Each non-destructive command is its own scene, named without the `cmd` prefix.
 */
export function deriveUiScenaries(pageId: string, commands: readonly CfeUiScenaryCommand[]): CfeUiScenary[] {
  const scenaries: CfeUiScenary[] = [];
  const queries = commands.filter(command => String(command.kind).toLowerCase() === 'query' && command.commandName);
  const mutations = commands.filter(command => String(command.kind).toLowerCase() !== 'query' && command.commandName);

  const baseQuery = queries.find(isListOrHubQuery) || queries[0];
  scenaries.push({
    value: 'base',
    kind: 'base',
    ...(baseQuery?.commandName ? { commandName: baseQuery.commandName } : {}),
    preconditions: [],
  });

  const hasSingleSelection = commands.some(command => String(command.selection || '').toLowerCase() === 'single');
  const inspectQuery = queries.find(isGetByIdQuery);
  if (hasSingleSelection && inspectQuery) {
    scenaries.push({
      value: 'detail',
      kind: 'detail',
      commandName: inspectQuery.commandName,
      preconditions: preconditionKeys(pageId, inspectQuery),
    });
  }

  for (const command of mutations) {
    if (isDestructiveCommandName(command.commandName)) continue;
    scenaries.push({
      value: commandScenaryValue(command.commandName),
      kind: 'command',
      commandName: command.commandName,
      preconditions: preconditionKeys(pageId, command),
    });
  }

  return scenaries;
}

export function destructiveCommandIds(commands: readonly CfeUiScenaryCommand[]): string[] {
  return commands
    .filter(command => command.commandName && String(command.kind).toLowerCase() !== 'query' && isDestructiveCommandName(command.commandName))
    .map(command => command.commandName);
}

export const UI_SCENARY_DEFS_CONTRACT = [
  'uiScenary contract (page skeleton reads `scenaries[].value` as <Scene value>):',
  '  scenaries[]: { value, kind: "base"|"detail"|"command", commandName?, preconditions: stateKey[] }',
  '  preconditions = required route/selection inputs (skill rule 8). Unsatisfied → base, silently.',
  '  URL `?scenary=` is a request; the shared setter is the source of truth.',
  '  destructiveCommandIds never become scenes (confirmation stays a modal).',
].join('\n');
