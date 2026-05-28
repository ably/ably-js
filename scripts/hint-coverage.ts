/*
 * DX-1209 - static hint-coverage check.
 *
 * Walks the TypeScript AST of every `.ts` file under src/ for
 * ErrorInfo (and PartialErrorInfo) constructions that carry a `hint`
 * field, then verifies:
 *
 *   1. The hint string is non-empty.
 *   2. If we have a rubric entry for the ErrorInfo code, the hint
 *      contains every required substring (`contains`) or matches every
 *      required regex (`matches`).
 *
 * Matches three call shapes:
 *   - `new ErrorInfo({ message, code, statusCode, hint, ... })`
 *   - `new PartialErrorInfo({ ... })`
 *   - `ErrorInfo.fromValues({ ... })` / `PartialErrorInfo.fromValues({ ... })`
 *
 * The constructor reference can be `ErrorInfo`, `PartialErrorInfo`, or a
 * member access ending in either (e.g. `this.client.ErrorInfo`).
 *
 * Hints are now a discoverable surface for LLMs and humans alike; this
 * check is a cheap drift guard for that surface. It does NOT lock down
 * exact wording. It DOES lock down presence and the API-name / concept
 * tokens we don't want silently renamed (e.g. `annotation_subscribe`,
 * `defaultTokenParams`).
 *
 * Add new entries to RUBRIC as new hint sites land. Missing rubric
 * entries for an error code are not an error - only an explicit rule
 * violation is.
 *
 * Run with:
 *   tsc --noEmit --esModuleInterop --target ES2017 --moduleResolution node scripts/hint-coverage.ts \
 *     && esr scripts/hint-coverage.ts
 *
 * (Wired up as `npm run hintcoverage` in package.json.)
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { exit } from 'process';
import * as ts from 'typescript';

interface HintEntry {
  file: string;
  line: number;
  code: number | null;
  hintText: string;
  isTemplate: boolean;
}

type RubricRule = { kind: 'contains'; value: string } | { kind: 'matches'; value: RegExp };

interface RubricEntry {
  description: string;
  require: RubricRule[];
}

/**
 * Per-error-code rubric. Add entries for codes whose hint contains
 * API names / concept tokens we want guarded against silent rename.
 *
 * Rules of thumb when adding entries:
 *   - Pin SDK API identifiers (`enterClient`, `defaultTokenParams`, ...)
 *     and Ably product/feature words (`annotation_subscribe`, `Mutable
 *     Messages`, ...). They're the public-ish surface.
 *   - Avoid pinning prose ("must", "the resulting"). Wording is allowed
 *     to evolve.
 *   - Use `matches` (regex) only when the token genuinely varies.
 */
const RUBRIC: Record<number, RubricEntry> = {
  40009: {
    description: 'publish payload exceeds maxMessageSize',
    require: [{ kind: 'contains', value: 'maxMessageSize' }],
  },
  40019: {
    description: 'missing plugin',
    // 40019 is shared between modular-plugin missing (ably/modular) and the
    // vcdiff-decoder missing site. Either install path is acceptable.
    require: [{ kind: 'matches', value: /ably\/modular|@ably\/vcdiff-decoder/ }],
  },
  40024: {
    description: 'LiveObjects channel mode missing',
    require: [
      { kind: 'contains', value: 'modes' },
      { kind: 'contains', value: 'expectedMode' }, // dynamic; rendered as object_subscribe/_publish
    ],
  },
  40106: {
    description: 'endpoint + environment conflict',
    require: [{ kind: 'contains', value: 'endpoint' }],
  },
  40160: {
    description: 'no authentication options',
    require: [
      { kind: 'contains', value: 'authUrl' },
      { kind: 'contains', value: 'authCallback' },
    ],
  },
  40162: {
    description: 'revokeTokens under token auth',
    require: [
      { kind: 'contains', value: 'revoke' },
      { kind: 'contains', value: 'key' },
    ],
  },
  93001: {
    description: 'annotation_subscribe mode missing',
    require: [
      { kind: 'contains', value: 'annotation_subscribe' },
      { kind: 'contains', value: 'modes' },
    ],
  },
  // Codes deliberately NOT keyed in the rubric:
  //   40000, 40012, 40013, 40400, 40500 - each is shared across multiple
  //   unrelated throw sites, so a code-level rubric over-constrains. Add
  //   message-keyed rules in a follow-up if/when needed.
};

const SRC_ROOT = path.resolve(__dirname, '..', 'src');

const ERROR_INFO_CTOR_NAMES = new Set(['ErrorInfo', 'PartialErrorInfo']);

/**
 * Walks an Expression and returns the trailing identifier name if it
 * is an ErrorInfo-like ctor target, else null.
 *
 *   `ErrorInfo`                  -> 'ErrorInfo'
 *   `PartialErrorInfo`           -> 'PartialErrorInfo'
 *   `this.client.ErrorInfo`      -> 'ErrorInfo'
 *   `client.ErrorInfo`           -> 'ErrorInfo'
 *   `ErrorInfo.fromValues`       -> null (this is a call target, not a ctor)
 */
function ctorTrailingName(expr: ts.Expression): string | null {
  if (ts.isIdentifier(expr)) return ERROR_INFO_CTOR_NAMES.has(expr.text) ? expr.text : null;
  if (ts.isPropertyAccessExpression(expr)) {
    return ERROR_INFO_CTOR_NAMES.has(expr.name.text) ? expr.name.text : null;
  }
  return null;
}

/** Returns the property-access tail components, e.g. `ErrorInfo.fromValues` -> ['ErrorInfo', 'fromValues']. */
function propertyAccessChain(expr: ts.Expression): string[] | null {
  const parts: string[] = [];
  let cur: ts.Expression = expr;
  while (ts.isPropertyAccessExpression(cur)) {
    parts.unshift(cur.name.text);
    cur = cur.expression;
  }
  if (ts.isIdentifier(cur)) {
    parts.unshift(cur.text);
    return parts;
  }
  return null;
}

/**
 * Collapse a template literal to a plain-text approximation suitable
 * for substring/regex checks. `${expr}` segments are rendered as the
 * identifier-like fragments inside them so token checks succeed on
 * dynamic variable names (e.g. `${expectedMode}` -> ` expectedMode `).
 */
function renderTemplateLiteral(tpl: ts.TemplateLiteral): string {
  if (ts.isNoSubstitutionTemplateLiteral(tpl)) return tpl.text;
  let out = tpl.head.text;
  for (const span of tpl.templateSpans) {
    const expr = span.expression.getText();
    const ident = ' ' + expr.replace(/[^A-Za-z0-9_]+/g, ' ') + ' ';
    out += ident + span.literal.text;
  }
  return out;
}

/**
 * Resolve a string-valued initializer to its plain-text representation.
 * Handles:
 *   - String literals: 'foo' -> 'foo'
 *   - Template literals: `foo${x}bar` -> 'foo x bar'
 *   - String concatenations: 'a' + 'b' + '...' -> 'ab...'
 *   - Identifier references resolved within the same file's top-level scope
 *
 * Returns null if the expression cannot be resolved to a static-ish value.
 */
function resolveStringExpr(
  expr: ts.Expression,
  fileConsts: Map<string, ts.Expression>,
): { text: string; isTemplate: boolean } | null {
  if (ts.isStringLiteralLike(expr)) return { text: expr.text, isTemplate: false };
  if (ts.isTemplateExpression(expr)) return { text: renderTemplateLiteral(expr), isTemplate: true };
  if (ts.isNoSubstitutionTemplateLiteral(expr)) return { text: expr.text, isTemplate: true };
  if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = resolveStringExpr(expr.left, fileConsts);
    const right = resolveStringExpr(expr.right, fileConsts);
    if (left && right) return { text: left.text + right.text, isTemplate: left.isTemplate || right.isTemplate };
    return null;
  }
  if (ts.isIdentifier(expr)) {
    const referenced = fileConsts.get(expr.text);
    if (referenced) return resolveStringExpr(referenced, fileConsts);
  }
  return null;
}

/** Resolve a numeric expression (integer literal or const reference) to its value. */
function resolveNumericExpr(expr: ts.Expression, fileConsts: Map<string, ts.Expression>): number | null {
  if (ts.isNumericLiteral(expr)) {
    const n = Number(expr.text);
    return Number.isFinite(n) ? n : null;
  }
  if (ts.isIdentifier(expr)) {
    const referenced = fileConsts.get(expr.text);
    if (referenced) return resolveNumericExpr(referenced, fileConsts);
  }
  return null;
}

/**
 * Collect top-level `const X = <expr>` declarations into a map so we can
 * resolve identifier references inside ErrorInfo arguments.
 */
function collectFileConsts(sourceFile: ts.SourceFile): Map<string, ts.Expression> {
  const consts = new Map<string, ts.Expression>();
  sourceFile.forEachChild((node) => {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer) {
          consts.set(decl.name.text, decl.initializer);
        }
      }
    }
  });
  return consts;
}

function extractHints(filePath: string): HintEntry[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const fileConsts = collectFileConsts(sourceFile);
  const entries: HintEntry[] = [];

  function processObjectArg(objExpr: ts.ObjectLiteralExpression, anchorNode: ts.Node) {
    let codeExpr: ts.Expression | null = null;
    let hintExpr: ts.Expression | null = null;
    for (const prop of objExpr.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      if (!ts.isIdentifier(prop.name)) continue;
      if (prop.name.text === 'code') codeExpr = prop.initializer;
      else if (prop.name.text === 'hint') hintExpr = prop.initializer;
    }
    if (!hintExpr) return;
    const resolved = resolveStringExpr(hintExpr, fileConsts);
    if (!resolved) return;
    const code = codeExpr ? resolveNumericExpr(codeExpr, fileConsts) : null;
    const { line } = sourceFile.getLineAndCharacterOfPosition(anchorNode.getStart(sourceFile));
    entries.push({
      file: path.relative(process.cwd(), filePath),
      line: line + 1,
      code,
      hintText: resolved.text,
      isTemplate: resolved.isTemplate,
    });
  }

  function visit(node: ts.Node) {
    // new ErrorInfo({...}) / new PartialErrorInfo({...}) / new <chain>.ErrorInfo({...})
    if (ts.isNewExpression(node) && node.arguments && node.arguments.length >= 1) {
      const tail = ctorTrailingName(node.expression);
      if (tail) {
        const first = node.arguments[0];
        if (ts.isObjectLiteralExpression(first)) processObjectArg(first, node);
      }
    }
    // ErrorInfo.fromValues({...})
    if (ts.isCallExpression(node) && node.arguments.length >= 1) {
      const chain = propertyAccessChain(node.expression);
      if (chain && chain.length >= 2 && chain[chain.length - 1] === 'fromValues') {
        const ctorName = chain[chain.length - 2];
        if (ERROR_INFO_CTOR_NAMES.has(ctorName)) {
          const first = node.arguments[0];
          if (ts.isObjectLiteralExpression(first)) processObjectArg(first, node);
        }
      }
    }
    node.forEachChild(visit);
  }

  visit(sourceFile);
  return entries;
}

interface Failure {
  kind: 'empty' | 'rubric';
  entry: HintEntry;
  detail: string;
}

function check(entry: HintEntry): Failure[] {
  const failures: Failure[] = [];
  const text = entry.hintText.trim();
  if (text.length === 0) {
    failures.push({ kind: 'empty', entry, detail: 'hint is empty' });
    return failures;
  }
  if (entry.code != null && RUBRIC[entry.code]) {
    const rules = RUBRIC[entry.code].require;
    for (const rule of rules) {
      if (rule.kind === 'contains' && !text.includes(rule.value)) {
        failures.push({
          kind: 'rubric',
          entry,
          detail: `code ${entry.code} hint must contain "${rule.value}"`,
        });
      } else if (rule.kind === 'matches' && !rule.value.test(text)) {
        failures.push({
          kind: 'rubric',
          entry,
          detail: `code ${entry.code} hint must match ${rule.value}`,
        });
      }
    }
  }
  return failures;
}

async function main() {
  const files = await glob('**/*.ts', {
    cwd: SRC_ROOT,
    absolute: true,
    ignore: ['**/*.test.ts', '**/*.d.ts'],
  });

  const allEntries: HintEntry[] = files.flatMap(extractHints);

  const failures: Failure[] = [];
  for (const e of allEntries) {
    failures.push(...check(e));
  }

  // Per-code summary for visibility.
  const byCode = new Map<number | null, HintEntry[]>();
  for (const e of allEntries) {
    const list = byCode.get(e.code) ?? [];
    list.push(e);
    byCode.set(e.code, list);
  }

  console.log(`hint-coverage: scanned ${files.length} files, found ${allEntries.length} hint sites\n`);
  const codes = [...byCode.keys()].sort((a, b) => (a ?? -1) - (b ?? -1));
  for (const code of codes) {
    const list = byCode.get(code)!;
    const rubric = code != null && RUBRIC[code] ? ` [${RUBRIC[code].description}]` : '';
    console.log(`  ${code ?? '(no code)'} × ${list.length}${rubric}`);
  }

  if (failures.length === 0) {
    console.log(`\n✓ all hints non-empty and pass rubric checks`);
    return;
  }

  console.log(`\n✗ ${failures.length} failure(s):\n`);
  for (const f of failures) {
    console.log(`  ${f.entry.file}:${f.entry.line}  (code ${f.entry.code ?? 'unknown'})`);
    console.log(`    ${f.detail}`);
    console.log(
      `    hint: ${JSON.stringify(f.entry.hintText.slice(0, 120))}${f.entry.hintText.length > 120 ? '…' : ''}`,
    );
  }
  exit(1);
}

main().catch((err) => {
  console.error(err);
  exit(2);
});
