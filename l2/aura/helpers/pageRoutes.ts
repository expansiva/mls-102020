/// <mls fileReference="_102020_/l2/aura/helpers/pageRoutes.ts" enhancement="_blank" />
// The URL of a page, as the workspace config declares it.
//
// WHY THIS EXISTS AT ALL
// Two things were being called "open the page": opening the FILE in the editors (the genome's page
// knob did that, and only that) and taking the running APP to that screen. The app navigates by URL,
// so the second one needs a route — and the route is not derivable from the file path: it is
// declared, per page, in `l5/config.json` under `projects[<id>].modules[].frontend.pages[]`.
//
// PURE, and in its own file rather than in the service: the service is a Lit component and importing
// it drags the whole runtime in, while the part that can actually be wrong — which entry matches a
// file, and what of the route travels — is thirty lines of matching that deserve a test of their own.

/** One entry of `frontend.pages[]`, in the shape the config writes it. */
interface IConfigPage {
  /** `l2/<folder>/<shortName>.ts` — the file that renders this page. */
  source?: string;
  /** `/controleChamados/commentOpenTicket/:ticketId?` */
  route?: string;
}

/**
 * The URL of a page file, or '' when the config does not declare one.
 *
 * Matched by `source` and never by name: a variation (`page21`) is a DIFFERENT page entry with its
 * own route (`/module/commentOpenTicket-page21`), and the file path is the only thing that tells them
 * apart. Route PARAMETERS are dropped (`/x/y/:id?` -> `/x/y`), because this answers "which screen",
 * not "which record" — the app opens the screen and the screen asks for the rest.
 *
 * @param source the page file as the config writes it: `l2/<folder>/<shortName>.ts`
 */
export function routeForSource(config: unknown, project: number, source: string): string {
  const projects = (config as { projects?: Record<string, { modules?: unknown[] }> })?.projects;
  const modules = projects?.[String(project)]?.modules ?? [];

  for (const module of modules as { frontend?: { pages?: IConfigPage[] } }[]) {
    for (const page of module?.frontend?.pages ?? []) {
      if (String(page?.source ?? '') !== source) continue;
      const route = String(page?.route ?? '');
      if (!route) continue;
      return route.split('/').filter((segment) => !segment.startsWith(':')).join('/');
    }
  }
  return '';
}

/** The `source` the config would write for a page file — the key `routeForSource` matches on. */
export function sourceOfPageFile(file: { folder?: string; shortName?: string }): string {
  return `l2/${file.folder ?? ''}/${file.shortName ?? ''}.ts`;
}
