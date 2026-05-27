/*
 * DX-1209 — static hint-coverage check.
 *
 * Statically scans every `.ts` file under src/ for `err.hint = ...`
 * assignments associated with an `ErrorInfo` throw and verifies:
 *
 *   1. The hint string is non-empty.
 *   2. If we have a rubric entry for the ErrorInfo code, the hint contains
 *      every required substring (`contains`) or matches every required
 *      regex (`matches`).
 *
 * Hints are now a discoverable surface for LLMs and humans alike; this
 * check is a cheap drift guard for that surface. It does NOT lock down
 * exact wording — wording is allowed to evolve. It DOES lock down
 * presence and the API-name / concept tokens we don't want silently
 * renamed (e.g. `annotation_subscribe`, `defaultTokenParams`).
 *
 * Add new entries to RUBRIC as new hint sites land. Missing rubric entries
 * for an error code are not an error — only an explicit rule violation is.
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
  //   40000, 40012, 40013, 40400, 40500 — each is shared across multiple
  //   unrelated throw sites, so a code-level rubric over-constrains. Add
  //   message-keyed rules in a follow-up if/when needed.
};

const SRC_ROOT = path.resolve(__dirname, '..', 'src');

function stripBlockComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

function extractHints(filePath: string): HintEntry[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  const src = stripBlockComments(raw);
  const lines = src.split('\n');
  const entries: HintEntry[] = [];

  // Track the most-recent ErrorInfo code we saw within a sliding window.
  let pendingCode: number | null = null;
  let pendingCodeLine = -Infinity;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect `new ErrorInfo(... , <code>, ...)` — code can land on the same
    // line as the constructor or on a later line in a multiline call.
    const errInfoIdx = line.indexOf('new ErrorInfo(');
    const errInfoClientIdx = line.indexOf('.ErrorInfo(');
    if (errInfoIdx >= 0 || errInfoClientIdx >= 0) {
      // Look ahead up to 6 lines for the code argument.
      const span = lines.slice(i, i + 6).join(' ');
      const codeMatch = span.match(/,\s*(\d{4,5})\s*,/);
      if (codeMatch) {
        pendingCode = parseInt(codeMatch[1], 10);
        pendingCodeLine = i;
      }
    }

    // Detect `err.hint = ...` — string body may span multiple lines.
    const hintMatch = line.match(/(\w+)\.hint\s*=\s*(.*)$/);
    if (hintMatch) {
      // Drop the pending code if it's too far away (likely unrelated).
      const code = i - pendingCodeLine <= 12 ? pendingCode : null;

      // Reassemble the RHS until we hit a semicolon at the end of a line.
      const rhsParts: string[] = [hintMatch[2]];
      let j = i;
      while (!rhsParts[rhsParts.length - 1].trimEnd().endsWith(';') && j < lines.length - 1) {
        j++;
        rhsParts.push(lines[j]);
      }
      const rhs = rhsParts.join(' ').replace(/;$/, '').trim();

      // Classify literal vs template.
      const isTemplate = rhs.startsWith('`');
      // Extract a best-effort literal text by collapsing template segments
      // to spaces so we can still check for substring tokens.
      let text = rhs;
      if (rhs.startsWith("'") || rhs.startsWith('"') || rhs.startsWith('`')) {
        const quote = rhs[0];
        // Remove leading + trailing quote.
        text = rhs.slice(1);
        const lastQuoteIdx = text.lastIndexOf(quote);
        if (lastQuoteIdx >= 0) text = text.slice(0, lastQuoteIdx);
        // Collapse interpolations (`${...}`) to the bare identifier(s) inside
        // them. Lets token checks succeed on dynamic variable names without
        // requiring runtime evaluation. E.g. `${expectedMode}` -> `expectedMode`.
        text = text.replace(/\$\{([^}]*)\}/g, (_, expr) => {
          const id = String(expr).trim();
          // Pull only identifier-like fragments; drop method calls and operators
          // so the substring search isn't polluted by syntax.
          return ' ' + id.replace(/[^A-Za-z0-9_]+/g, ' ') + ' ';
        });
      }

      entries.push({
        file: path.relative(process.cwd(), filePath),
        line: i + 1,
        code,
        hintText: text,
        isTemplate,
      });
    }
  }

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

  let allEntries: HintEntry[] = [];
  for (const f of files) {
    allEntries = allEntries.concat(extractHints(f));
  }

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

  console.log(`hint-coverage: scanned ${files.length} files, found ${allEntries.length} err.hint assignments\n`);
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
