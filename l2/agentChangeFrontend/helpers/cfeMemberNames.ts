/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeMemberNames.ts" enhancement="_blank"/>

// Class-member naming rules for the generated shared defs (pure — node:test friendly, no libStor).
//
// State property names share ONE namespace on the generated base class with action method and
// handler names. The derived input-state name `<actionId><FieldPascal>` can equal ANOTHER
// command's methodName — real case (mls-102045 projectDetail): updateWorkTask.status ->
// `updateWorkTaskStatus`, which is the methodName of operation updateWorkTaskStatus. No generation
// (LLM or deterministic) compiles past that: the typecheck test asserts both names. The defs
// builder therefore dedupes state names against the reserved action members BEFORE the setter
// actions are derived from them.

/** Method/handler names the command actions will claim on the generated class. */
export function commandMemberNames(commands: ReadonlyArray<Record<string, unknown>>): Set<string> {
  const reserved = new Set<string>();
  for (const command of commands) {
    const commandName = typeof command.commandName === 'string' ? command.commandName : '';
    if (!commandName) continue;
    const kind = command.kind === 'query' ? 'query' : 'command';
    reserved.add(kind === 'query' ? `load${toPascal(commandName)}` : commandName);
    reserved.add(`handle${toPascal(commandName)}Click`);
  }
  return reserved;
}

/**
 * Renames colliding state names IN PLACE, suffixing 'Value' (then 'Value2', 'Value3', ...).
 * Input states also reserve their derived setter pair (set<Name> / handle<Name>Change), since
 * those members are generated from the state name. Returns the applied renames for tracing.
 */
export function dedupeSharedStateNames(
  states: Record<string, unknown>[],
  reserved: ReadonlySet<string>,
): string[] {
  const renames: string[] = [];
  const used = new Set<string>();
  const membersOf = (name: string, kind: unknown): string[] => (
    kind === 'input' ? [name, `set${toPascal(name)}`, `handle${toPascal(name)}Change`] : [name]
  );
  const isFree = (name: string, kind: unknown): boolean => (
    membersOf(name, kind).every(member => !reserved.has(member) && !used.has(member))
  );

  for (const state of states) {
    const original = typeof state.name === 'string' ? state.name : '';
    if (!original) continue;
    let candidate = original;
    for (let n = 1; !isFree(candidate, state.kind); n++) {
      candidate = n === 1 ? `${original}Value` : `${original}Value${n}`;
    }
    if (candidate !== original) {
      state.name = candidate;
      renames.push(`${original} -> ${candidate}`);
    }
    for (const member of membersOf(candidate, state.kind)) used.add(member);
  }
  return renames;
}

function toPascal(value: string): string {
  return value.replace(/(?:^|[-_\s]+)([A-Za-z0-9])/g, (_m, c: string) => c.toUpperCase());
}
