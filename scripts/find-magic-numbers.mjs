#!/usr/bin/env node
/**
 * Scans the codebase for leftover magic numbers / UPPER_SNAKE numeric consts.
 * Skips specs, known source-of-truth config files, GLSL, glyph bitmaps, StyleSheet noise.
 *
 * Usage:
 *   npm run find:magic
 *   node scripts/find-magic-numbers.mjs [rootDir]
 *
 * Default root: src/
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const DEFAULT_ROOT = join(process.cwd(), 'src');
const ROOT = resolve(process.argv[2] ?? DEFAULT_ROOT);

const SKIP_DIR = new Set([
  'node_modules',
  '.git',
  '.expo',
  'dist',
  'build',
  'coverage',
  '__snapshots__',
]);

/** Specs + intentional numeric sources of truth + shader/glyph assets. */
const SKIP_FILE =
  /\.spec\.(ts|tsx)$|\.d\.ts$|fieldConfig\.ts$|constants\.ts$|cameraConfig\.ts$|fieldGridDigitGlyphs\.ts$|fieldGridWaveMaterial\.ts$|spacing\.ts$|radius\.ts$|typography\.ts$|shadows\.ts$|layout\.ts$/;

const INCLUDE = /\.(ts|tsx)$/;

const NUMBER_LITERAL =
  /(?<![\w$.])(-?(?:0x[\da-fA-F]+|\d+\.\d+|\d+))(?![\w$])/g;
const NAMED_CONST =
  /(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=\s*(-?(?:0x[\da-fA-F]+|\d+\.\d+|\d+))/g;

/** Compile-time / identity constants that must not become runtime knobs. */
const IGNORE_CONST = new Set([
  'FIELD_WAVE_MAX_COUNT',
  'FIELD_WAVE_SLOT_INACTIVE',
  'DIGIT_GLYPH_WIDTH',
  'DIGIT_GLYPH_HEIGHT',
]);

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    if (SKIP_DIR.has(entry)) continue;
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      files.push(...walk(full));
      continue;
    }
    if (!INCLUDE.test(entry) || SKIP_FILE.test(entry)) continue;
    files.push(full);
  }
  return files;
}

function isBoringLiteral(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return true;
  if (Number.isInteger(n) && Math.abs(n) <= 16) return true;
  if (value === '0.5' || value === '0.0' || value === '1.0' || value === '2.0' || value === '3.0') {
    return true;
  }
  if (value === '180' || value === '255' || value === '0.0001' || value === '0.01') return true;
  // Calendar years are not app tunables.
  if (Number.isInteger(n) && n >= 1970 && n <= 2100) return true;
  return false;
}

function isNoiseLine(trimmed) {
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
    return true;
  }
  if (
    trimmed.includes('DEFAULT_FIELD_CONFIG') ||
    trimmed.includes('getFieldConfig()') ||
    trimmed.includes('httpConfig.') ||
    trimmed.includes('realtimeConfig.') ||
    trimmed.includes('cacheConfig.') ||
    trimmed.includes('offlineQueueConfig.') ||
    trimmed.includes('storageKeys.')
  ) {
    return true;
  }
  // StyleSheet / layout / RN style props.
  if (
    /zIndex|fontWeight|maxWidth|minWidth|maxHeight|minHeight|lineHeight|letterSpacing|borderRadius|borderWidth|opacity:|width:\s*'?\d|height:\s*'?\d|width:\s*'100%'|height:\s*'100%'|flex:|padding|margin|gap:|size=\{|safeBottom|elevation:|shadowOpacity|shadowRadius|AspectRatio/.test(
      trimmed,
    )
  ) {
    return true;
  }
  if (/Math\.PI\)\s*\/\s*180|\/\s*180\b|\*\s*Math\.PI\s*\/\s*180/.test(trimmed)) {
    return true;
  }
  if (/^\s*'[01]+'/.test(trimmed) || /:\s*\[['\"][01]/.test(trimmed)) {
    return true;
  }
  if (
    trimmed.includes('/* glsl */') ||
    /^\s*(precision|uniform|varying|float|vec[234]|gl_|return clamp|mix\()/.test(trimmed)
  ) {
    return true;
  }
  // Hash / FNV / radix helpers and pure math identities.
  if (/toString\(\s*36\s*\)|Math\.imul|2166136261|16777619/.test(trimmed)) {
    return true;
  }
  // HTTP status codes in switch/case or NetworkError constructors.
  if (
    /\bcase\s+(?:[1-5]\d{2})\s*:/.test(trimmed) ||
    /NetworkError\([^)]*,\s*[1-5]\d{2}/.test(trimmed) ||
    /status(?:Code)?\s*[!=]==?\s*[1-5]\d{2}/.test(trimmed) ||
    /status(?:Code)?\s*:\s*[1-5]\d{2}/.test(trimmed)
  ) {
    return true;
  }
  return false;
}

function scanFile(path) {
  const text = readFileSync(path, 'utf8');
  const lines = text.split(/\r?\n/);
  const hits = [];
  let inGlsl = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.includes('/* glsl */') || trimmed.includes('glsl`')) inGlsl = true;
    if (inGlsl) {
      if (trimmed.endsWith('`;') || trimmed === '`;') inGlsl = false;
      continue;
    }

    if (isNoiseLine(trimmed)) continue;

    NAMED_CONST.lastIndex = 0;
    let named;
    while ((named = NAMED_CONST.exec(line)) != null) {
      if (IGNORE_CONST.has(named[1])) continue;
      if (isBoringLiteral(named[2])) continue;
      hits.push({
        line: i + 1,
        kind: 'const',
        name: named[1],
        value: named[2],
        snippet: trimmed.slice(0, 120),
      });
    }

    NUMBER_LITERAL.lastIndex = 0;
    let lit;
    while ((lit = NUMBER_LITERAL.exec(line)) != null) {
      if (isBoringLiteral(lit[1])) continue;
      hits.push({
        line: i + 1,
        kind: 'literal',
        value: lit[1],
        snippet: trimmed.slice(0, 120),
      });
    }
  }

  return hits;
}

function main() {
  const files = walk(ROOT);
  let total = 0;
  let filesWithHits = 0;

  console.log(`Scanning ${relative(process.cwd(), ROOT) || '.'} …`);

  for (const file of files) {
    const hits = scanFile(file);
    if (hits.length === 0) continue;
    filesWithHits += 1;
    console.log(`\n${relative(process.cwd(), file)}`);
    for (const hit of hits) {
      total += 1;
      if (hit.kind === 'const') {
        console.log(`  L${hit.line} const ${hit.name} = ${hit.value}`);
      } else {
        console.log(`  L${hit.line} literal ${hit.value}  |  ${hit.snippet}`);
      }
    }
  }

  console.log(
    `\nFound ${total} leftover candidate(s) across ${filesWithHits}/${files.length} file(s).`,
  );
  console.log(
    'Skipped: specs, constants.ts, fieldConfig.ts, cameraConfig.ts, design tokens, shaders/glyphs.',
  );
}

main();
