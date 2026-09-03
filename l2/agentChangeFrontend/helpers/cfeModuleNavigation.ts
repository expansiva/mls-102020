/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeModuleNavigation.ts" enhancement="_blank"/>

/**
 * Menu rebuild: E8 `model.menu` (places only) intersected with pages that materialized.
 * Order and inclusion come from E8; existence comes from CF. A materialized page that is
 * not in the E8 menu stays routable and is not listed.
 */

export interface CfeE8MenuPlace {
  workspaceId: string;
  label: string;
}

export interface CfeNavigationPage {
  pageId: string;
  label: string;
  actors?: string[];
  landing?: boolean;
}

export interface CfeNavigationEntry {
  id: string;
  label: string;
  href: string;
  description: string;
  actors?: string[];
  landing?: boolean;
}

export function navigationFromE8Menu(args: {
  moduleName: string;
  menu: CfeE8MenuPlace[];
  pages: CfeNavigationPage[];
  labels?: Record<string, string>;
}): CfeNavigationEntry[] {
  const labels = args.labels || {};
  const pageById = new Map(args.pages.map(page => [page.pageId, page]));
  if (!args.menu.length) {
    return args.pages.map(page => navigationEntry(args.moduleName, page, labels[page.pageId] || page.label));
  }
  return args.menu.flatMap(entry => {
    const page = pageById.get(entry.workspaceId);
    if (!page) return [];
    return [navigationEntry(args.moduleName, page, labels[page.pageId] || entry.label || page.label)];
  });
}

function navigationEntry(moduleName: string, page: CfeNavigationPage, label: string): CfeNavigationEntry {
  return {
    id: page.pageId,
    label,
    href: `/${moduleName}/${page.pageId}`,
    description: label,
    ...(page.actors?.length ? { actors: page.actors } : {}),
    ...(page.landing ? { landing: true } : {}),
  };
}
