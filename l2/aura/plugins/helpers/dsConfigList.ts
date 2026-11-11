/// <mls fileReference="_102020_/l2/aura/plugins/helpers/dsConfigList.ts" enhancement="_blank"/>

// The design systems a module offers in the published app: `projects[<client>].modules[].designSystems` of
// `l5/config.json`. The boot picks a DS by name from it, the header's DS select and Ctrl+Alt+D cycle it, and
// `mls.sites.setDS` refuses a name outside it.
//
// The list is DERIVED: every DS of the project, in the order of designSystem.ts. Keeping a DS in the Studio
// rewrites it (like the menu and the header write their part of the file), and the next release publishes it —
// no materialize needed. Pure: config in, config out.

/** The names of the project's DS, in file order, without blanks or repeats (case-insensitive). */
export function designSystemNames(themes: readonly { themeName?: unknown }[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const theme of themes) {
    const name = typeof theme?.themeName === 'string' ? theme.themeName.trim() : '';
    const key = name.toLowerCase();
    if (name && !seen.has(key)) { seen.add(key); out.push(name); }
  }
  return out;
}

/**
 * Every module of the client project gets `designSystems: names`. Nothing else in the file is touched.
 * `changed` is false when every module already said exactly that (or there is no module to update).
 */
export function withModuleDesignSystems(config: unknown, projectId: number, names: readonly string[]): { config: unknown; changed: boolean } {
  if (!config || typeof config !== 'object') return { config, changed: false };
  const client = (config as { projects?: Record<string, { modules?: unknown }> }).projects?.[String(projectId)];
  const modules = client?.modules;
  if (!Array.isArray(modules) || !modules.length) return { config, changed: false };
  let changed = false;
  for (const mod of modules) {
    if (!mod || typeof mod !== 'object') continue;
    const entry = mod as Record<string, unknown>;
    if (JSON.stringify(entry.designSystems) === JSON.stringify(names)) continue;
    entry.designSystems = [...names];
    changed = true;
  }
  return { config, changed };
}
