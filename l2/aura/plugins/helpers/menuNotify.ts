/// <mls fileReference="_102020_/l2/aura/plugins/helpers/menuNotify.ts" enhancement="_blank"/>

// Tells whoever lists the apps menu (the collab-messages apps tab) that a menu changed, through
// `mls.sites.updateMenu()` (102033 sitesMenu). That call only fires `SitesMenuChanged`; the listener fetches
// the menu again by its own path, which in Studio reads the local edit of `l5/config.json`.
//
// The notice is best effort: the config is already written when this runs, so a missing or failing
// `updateMenu` is logged and never turns the save into a failure.

type UpdateMenu = () => unknown;

function defaultUpdateMenu(): UpdateMenu | undefined {
  const update = (globalThis as { mls?: { sites?: { updateMenu?: UpdateMenu } } }).mls?.sites?.updateMenu;
  return typeof update === 'function' ? update : undefined;
}

/** `lookup` is for tests; by default `mls.sites.updateMenu` is looked up at call time (the shell registers it after mount). */
export function notifyMenuChanged(lookup: () => UpdateMenu | undefined = defaultUpdateMenu): void {
  const update = lookup();
  if (!update) {
    console.error('[menuNotify] mls.sites.updateMenu is not available; the apps menu was not told about the saved menu');
    return;
  }
  try {
    update();
  } catch (error) {
    console.error('[menuNotify] mls.sites.updateMenu failed:', error);
  }
}
