/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/shared40/rebuildGuard.ts" enhancement="_blank"/>

// A Studio remount inserts a new node and runs connectedCallback again. The visit reset and the
// entry-param apply would wipe the state the person was editing. Guard those two calls.

import type { M4Finding } from '/_102020_/l2/agentMaterializeL2/steps/shared40/run.js';
import { methodBody, reachableBody, type M4SharedTarget } from '/_102020_/l2/agentMaterializeL2/steps/shared40/gate.js';

const REBUILD_IMPORT = "import { wasRebuiltByStudio } from '/_102033_/l2/shared/elementSwapRegistry.js';";
const STATEMENT = /^([ \t]*)this\.([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*;[ \t]*$/u;

export function m4GuardRebuiltConnected(text: string, target: M4SharedTarget): { text: string; findings: M4Finding[] } {
  const body = methodBody(text, 'connectedCallback');
  if (!body) return { text, findings: [] };
  const head = text.search(/\bconnectedCallback\s*(?:<[^>\n]*>)?\s*\(/u);
  const start = text.indexOf(body, head < 0 ? 0 : head);
  if (start < 0) return { text, findings: [] };
  const end = start + body.length;

  const transient = [...Object.keys(target.shared.requests).flatMap(id => [`${id}Status`, `${id}Error`]), 'scenary'];
  const params = Object.keys(target.shared.entry.params);
  const role = new Map<string, boolean>();
  const roleOf = (name: string): boolean => {
    const known = role.get(name);
    if (known !== undefined) return known;
    const reached = reachableBody(text, name);
    const initial = name.startsWith('qry') || /\bexecBff\b/u.test(reached);
    const reset = transient.some(member => quotes(reached, member));
    const entry = params.some(param => quotes(reached, param));
    const guards = !initial && (reset || entry);
    role.set(name, guards);
    return guards;
  };

  const findings: M4Finding[] = [];
  const reported = new Set<string>();
  let guarded = 0;
  let offset = 0;
  let depth = 0;
  let dangling = false;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineStart = offset;
    offset += line.length + 1;
    if (lineStart < start || lineStart >= end) continue;
    const direct = depth === 0 && !dangling && !line.includes('wasRebuiltByStudio(');
    const statement = direct ? STATEMENT.exec(line) : null;
    if (!line.includes('wasRebuiltByStudio(')) {
      for (const call of line.matchAll(/\bthis\.([A-Za-z_$][\w$]*)\s*\(/gu)) {
        const name = call[1];
        if (!roleOf(name)) continue;
        if (statement && statement[2] === name) {
          lines[i] = `${statement[1]}if (!wasRebuiltByStudio(this)) this.${name}(${statement[3]});`;
          guarded += 1;
        } else if (!reported.has(name)) {
          reported.add(name);
          findings.push({
            code: 'GUARD_NOT_APPLIED',
            message: `${name} resets the visit or reads an entry param, but connectedCallback does not call it as a single statement this.${name}(); the call was left unchanged.`,
          });
        }
      }
    }
    depth += braceDelta(line);
    dangling = opensControl(line);
  }

  let next = lines.join('\n');
  if (guarded > 0 && !hasRebuildImport(next)) next = insertImport(next);
  return { text: next, findings };
}

function braceDelta(line: string): number {
  let delta = 0;
  for (const ch of line) {
    if (ch === '{') delta += 1;
    else if (ch === '}') delta -= 1;
  }
  return delta;
}

/** A control line that holds its body on the following line, without a brace. */
function opensControl(line: string): boolean {
  const trimmed = line.trim();
  return /^(?:if|else|for|while|do)\b/u.test(trimmed) && !trimmed.includes('{') && !trimmed.endsWith(';');
}

function quotes(body: string, name: string): boolean {
  return new RegExp(`['"\`]${name}['"\`]`, 'u').test(body);
}

function hasRebuildImport(source: string): boolean {
  return /import\s*\{[^}]*\bwasRebuiltByStudio\b[^}]*\}\s*from\s*['"]\/_102033_\/l2\/shared\/elementSwapRegistry\.js['"]/u.test(source);
}

function insertImport(source: string): string {
  const lines = source.split('\n');
  let last = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s*import\s/u.test(lines[i])) last = i;
  }
  lines.splice(last + 1, 0, REBUILD_IMPORT);
  return lines.join('\n');
}
