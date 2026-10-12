/// <mls fileReference="_102020_/l2/helpers/defsInput/grantDisclosure.ts" enhancement="_blank"/>

export function grantShowsPath(
  disclosure: { mode: string; allowedFields?: readonly string[]; deniedFields?: readonly string[] },
  path: string,
): boolean {
  if ((disclosure.deniedFields ?? []).some(item => covers(item, path))) return false;
  if (disclosure.mode === 'fullRecord') return true;
  if (disclosure.mode === 'fieldsOnly' || disclosure.mode === 'summaryOnly') {
    const allowed = disclosure.allowedFields ?? [];
    if (allowed.length === 0) return true;
    return allowed.some(item => covers(item, path));
  }
  return false;
}

function covers(item: string, path: string): boolean {
  return item === path || path.startsWith(`${item}.`);
}
