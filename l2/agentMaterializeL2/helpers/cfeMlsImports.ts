/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/cfeMlsImports.ts" enhancement="_blank"/>

export interface MlsImportContext {
  outputPath: string;
  /** Exact Studio-indexed MLS source refs, such as _102047_/l2/stock/web/contracts/stock.defs.ts. */
  knownFiles: string[];
  /** Exact external specifiers declared by the output's effective enhancement import map. */
  declaredPackages: string[];
}

export interface MlsImportResult {
  code: string;
  changes: { from: string; to: string }[];
  issues: string[];
}

interface Token { kind: 'id' | 'number' | 'string' | 'punct'; value: string; start: number; end: number }
interface ModuleRef { token: Token; nonLiteral: boolean }

/**
 * Canonicalize syntactic TS/JS module references only. Comments and string/template contents are not
 * searched or rewritten. Local refs must resolve to one exact Studio-indexed MLS file; package refs
 * must be declared by this file's enhancement import map.
 */
export function normalizeMlsImports(source: string, context: MlsImportContext): MlsImportResult {
  const refs = moduleRefs(source);
  const known = new Set(context.knownFiles.map(canonicalMlsSource).filter((value): value is string => !!value));
  const packages = new Set(context.declaredPackages);
  const changes: MlsImportResult['changes'] = [];
  const issues: string[] = [];
  const edits: { start: number; end: number; value: string }[] = [];

  for (const ref of refs) {
    if (ref.nonLiteral) {
      issues.push(`${context.outputPath}: non-literal dynamic import() is not verifiable`);
      continue;
    }
    const specifier = ref.token.value;
    const local = isLocalMlsSpecifier(specifier);
    if (!local) {
      if (packages.has(specifier)) continue;
      issues.push(`${context.outputPath}: undeclared or unrecognized module '${specifier}'`);
      continue;
    }
    const resolved = resolveMlsSpecifier(specifier, context.outputPath, known);
    if ('issue' in resolved) {
      issues.push(`${context.outputPath}: cannot resolve module '${specifier}': ${resolved.issue}`);
      continue;
    }
    if (resolved.path !== specifier) {
      changes.push({ from: specifier, to: resolved.path });
      edits.push({ start: ref.token.start, end: ref.token.end, value: quoteLike(ref.token, resolved.path) });
    }
  }

  let code = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    code = `${code.slice(0, edit.start)}${edit.value}${code.slice(edit.end)}`;
  }
  return { code, changes, issues };
}

/** Extract only literal names inside `export const requires = [...]` from the selected enhancement source. */
export function declaredEnhancementPackages(source: string): string[] {
  const start = /\brequires\s*:\s*[^=]*=\s*\[/u.exec(source);
  if (!start) return [];
  const arrayStart = start.index + start[0].length - 1;
  const end = matchingArrayEnd(source, arrayStart);
  if (end < 0) return [];
  const body = source.slice(arrayStart + 1, end);
  return [...body.matchAll(/\bname\s*:\s*(['"])([^'"\r\n]+)\1/gu)].map(match => match[2]);
}

function resolveMlsSpecifier(specifier: string, outputPath: string, known: Set<string>): { path: string } | { issue: string } {
  const output = canonicalMlsSource(outputPath);
  if (!output) return { issue: 'outputPath is not a canonical MLS path' };
  const outputProject = /^(_\d+_\/l\d+\/)/u.exec(output)?.[1];
  if (!outputProject) return { issue: 'outputPath has no project/level root' };
  const projectRoot = /^(_\d+_)\//u.exec(output)?.[1];
  if (!projectRoot) return { issue: 'outputPath has no project root' };

  let rawTarget: string;
  if (/^\/_\d+_\//u.test(specifier)) rawTarget = specifier.slice(1);
  else if (/^_\d+_\//u.test(specifier)) rawTarget = specifier;
  else if (specifier.startsWith('/l2/') || specifier.startsWith('l2/')) rawTarget = `${projectRoot}/${specifier.replace(/^\//u, '')}`;
  else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const outputDir = output.slice(0, output.lastIndexOf('/') + 1);
    rawTarget = `${outputDir}${specifier}`;
  } else return { issue: 'MLS alias is not an absolute project ref or an explicit relative path' };

  const normalized = normalizePath(rawTarget);
  if (!normalized || !/^_\d+_\/l\d+\//u.test(normalized)) return { issue: 'reference escapes its MLS project root' };
  if (/\.(?:defs\.)?(?:ts|tsx|mts|cts|js)$/u.test(normalized) && !toCanonicalJsPath(normalized)) {
    return { issue: 'MLS source reference must be TypeScript or JavaScript' };
  }

  const matches = new Set<string>();
  if (/\.(?:defs\.)?ts$/u.test(normalized)) {
    const source = normalized.replace(/\.ts$/u, '.ts');
    if (known.has(source)) matches.add(source);
  } else if (/\.(?:defs\.)?js$/u.test(normalized)) {
    const stem = normalized.replace(/\.js$/u, '');
    for (const source of known) if (source === `${stem}.ts` || source === `${stem}.js`) matches.add(source);
  } else {
    for (const source of known) {
      if (source === `${normalized}.ts` || source === `${normalized}.js`) matches.add(source);
    }
  }
  if (matches.size === 0) return { issue: `no exact indexed MLS target for '${normalized}'` };
  if (matches.size > 1) return { issue: `multiple indexed MLS targets for '${normalized}'` };
  return { path: `/${toCanonicalJsPath([...matches][0])}` };
}

function canonicalMlsSource(path: string): string | null {
  const normalized = normalizePath(path.replace(/^\//u, ''));
  return normalized && /^_\d+_\/l\d+\//u.test(normalized) ? normalized : null;
}

function normalizePath(path: string): string | null {
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (parts.length <= 1) return null;
      parts.pop();
    } else parts.push(part);
  }
  return parts.join('/');
}

function toCanonicalJsPath(source: string): string | null {
  if (/\.defs\.ts$/u.test(source)) return source.replace(/\.defs\.ts$/u, '.defs.js');
  if (/\.(?:ts|tsx|mts|cts)$/u.test(source)) return source.replace(/\.(?:ts|tsx|mts|cts)$/u, '.js');
  if (/\.js$/u.test(source)) return source;
  return null;
}

function isLocalMlsSpecifier(value: string): boolean {
  return value.startsWith('./') || value.startsWith('../') || value.startsWith('/_')
    || /^_\d+_/u.test(value) || value.startsWith('/l2/') || value.startsWith('l2/');
}

function quoteLike(token: Token, value: string): string {
  const quote = token.value && token.start >= 0 ? tokenRawQuote(token) : "'";
  return `${quote}${value.replaceAll('\\', '\\\\').replaceAll(quote, `\\${quote}`)}${quote}`;
}

const tokenQuotes = new WeakMap<Token, string>();
function tokenRawQuote(token: Token): string { return tokenQuotes.get(token) ?? "'"; }

function moduleRefs(source: string): ModuleRef[] {
  const tokens = tokenize(source);
  const refs: ModuleRef[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind !== 'id' || (token.value !== 'import' && token.value !== 'export')) continue;
    if (tokens[i - 1]?.value === '.' || tokens[i - 1]?.value === '?.') continue;
    if (token.value === 'import' && tokens[i + 1]?.value === '(') {
      const arg = tokens[i + 2];
      refs.push(arg?.kind === 'string' && (tokens[i + 3]?.value === ')' || tokens[i + 3]?.value === ',')
        ? { token: arg, nonLiteral: false } : { token, nonLiteral: true });
      continue;
    }
    if (token.value === 'import' && tokens[i + 1]?.kind === 'string') {
      refs.push({ token: tokens[i + 1], nonLiteral: false });
      continue;
    }
    if (token.value === 'export') {
      const next = tokens[i + 1]?.value === 'type' ? tokens[i + 2]?.value : tokens[i + 1]?.value;
      if (next !== '{' && next !== '*') continue;
    }
    const limit = nextDeclarationBoundary(tokens, i + 1);
    for (let j = i + 1; j < limit; j++) {
      if (tokens[j].value === 'from' && tokens[j + 1]?.kind === 'string') {
        refs.push({ token: tokens[j + 1], nonLiteral: false });
        break;
      }
    }
  }
  return refs;
}

function nextDeclarationBoundary(tokens: Token[], start: number): number {
  for (let i = start; i < tokens.length; i++) {
    if (tokens[i].value === ';' || ((tokens[i].value === 'import' || tokens[i].value === 'export') && tokens[i].kind === 'id')) return i;
  }
  return tokens.length;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  for (let i = 0; i < source.length;) {
    const c = source[i];
    if (/\s/u.test(c)) { i++; continue; }
    if (c === '/' && source[i + 1] === '/') { i = skipLine(source, i + 2); continue; }
    if (c === '/' && source[i + 1] === '*') { i = skipBlock(source, i + 2); continue; }
    if (c === '/' && startsRegex(tokens)) { i = skipRegex(source, i); continue; }
    if (c === '"' || c === "'") {
      const start = i++;
      let value = '';
      while (i < source.length && source[i] !== c) {
        if (source[i] === '\\' && i + 1 < source.length) { value += source[i + 1]; i += 2; }
        else value += source[i++];
      }
      if (i < source.length) i++;
      const token: Token = { kind: 'string', value, start, end: i };
      tokenQuotes.set(token, c);
      tokens.push(token);
      continue;
    }
    if (c === '`') { i = tokenizeTemplate(source, i + 1, tokens); continue; }
    if (/[0-9]/u.test(c)) {
      const start = i++;
      while (i < source.length && /[0-9A-Za-z_.]/u.test(source[i])) i++;
      tokens.push({ kind: 'number', value: source.slice(start, i), start, end: i });
      continue;
    }
    if (/[A-Za-z_$]/u.test(c)) {
      const start = i++;
      while (i < source.length && /[A-Za-z0-9_$]/u.test(source[i])) i++;
      tokens.push({ kind: 'id', value: source.slice(start, i), start, end: i });
      continue;
    }
    tokens.push({ kind: 'punct', value: c, start: i, end: i + 1 });
    i++;
  }
  return tokens;
}

function startsRegex(tokens: Token[]): boolean {
  const previous = tokens[tokens.length - 1];
  if (!previous) return true;
  if (previous.kind === 'string' || previous.kind === 'number') return false;
  if (previous.kind === 'id') return /^(?:return|throw|case|delete|void|typeof|instanceof|in|of|new|yield|await)$/u.test(previous.value);
  if (previous.value === ')') {
    let depth = 0;
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (tokens[i].value === ')') depth++;
      else if (tokens[i].value === '(' && --depth === 0) {
        return /^(?:if|while|for|with|switch|catch)$/u.test(tokens[i - 1]?.value ?? '');
      }
    }
    return false;
  }
  return !/^[)\]}]$/u.test(previous.value) && previous.value !== '.';
}

function skipRegex(source: string, start: number): number {
  let inClass = false;
  for (let i = start + 1; i < source.length; i++) {
    if (source[i] === '\\') { i++; continue; }
    if (source[i] === '\n' || source[i] === '\r') return i;
    if (source[i] === '[') inClass = true;
    else if (source[i] === ']') inClass = false;
    else if (source[i] === '/' && !inClass) {
      i++;
      while (i < source.length && /[A-Za-z]/u.test(source[i])) i++;
      return i;
    }
  }
  return source.length;
}

function skipLine(source: string, i: number): number {
  while (i < source.length && source[i] !== '\n' && source[i] !== '\r') i++;
  return i;
}

function skipBlock(source: string, i: number): number {
  const end = source.indexOf('*/', i);
  return end < 0 ? source.length : end + 2;
}

function tokenizeTemplate(source: string, i: number, tokens: Token[]): number {
  while (i < source.length) {
    if (source[i] === '\\') { i += 2; continue; }
    if (source[i] === '`') return i + 1;
    if (source[i] === '$' && source[i + 1] === '{') {
      const start = i + 2;
      const end = templateExpressionEnd(source, start);
      if (end < 0) return source.length;
      const nested = tokenize(source.slice(start, end));
      for (const token of nested) tokens.push({ ...token, start: token.start + start, end: token.end + start });
      i = end + 1;
      continue;
    }
    i++;
  }
  return i;
}

function skipTemplate(source: string, start: number): number {
  let i = start + 1;
  const ignored: Token[] = [];
  return tokenizeTemplate(source, i, ignored);
}

function templateExpressionEnd(source: string, start: number): number {
  let depth = 0;
  const tokens: Token[] = [];
  for (let i = start; i < source.length;) {
    const c = source[i];
    if (c === '"' || c === "'") { i = skipQuoted(source, i, c); continue; }
    if (c === '`') { i = skipTemplate(source, i); continue; }
    if (c === '/' && source[i + 1] === '/') { i = skipLine(source, i + 2); continue; }
    if (c === '/' && source[i + 1] === '*') { i = skipBlock(source, i + 2); continue; }
    if (c === '/' && startsRegex(tokens)) { i = skipRegex(source, i); continue; }
    if (/[A-Za-z_$]/u.test(c)) {
      const wordStart = i++;
      while (i < source.length && /[A-Za-z0-9_$]/u.test(source[i])) i++;
      tokens.push({ kind: 'id', value: source.slice(wordStart, i), start: wordStart, end: i });
      continue;
    }
    if (/[0-9]/u.test(c)) {
      const numberStart = i++;
      while (i < source.length && /[0-9A-Za-z_.]/u.test(source[i])) i++;
      tokens.push({ kind: 'number', value: source.slice(numberStart, i), start: numberStart, end: i });
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      if (depth === 0) return i;
      depth--;
    }
    if (!/\s/u.test(c)) tokens.push({ kind: 'punct', value: c, start: i, end: i + 1 });
    i++;
  }
  return -1;
}

function skipQuoted(source: string, start: number, quote: string): number {
  let i = start + 1;
  while (i < source.length) {
    if (source[i] === '\\') { i += 2; continue; }
    if (source[i++] === quote) return i;
  }
  return i;
}

function matchingArrayEnd(source: string, start: number): number {
  let depth = 0;
  let quote = '';
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '[') depth++;
    if (c === ']' && --depth === 0) return i;
  }
  return -1;
}
