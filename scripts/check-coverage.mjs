#!/usr/bin/env node
/**
 * Validate Jest's V8 coverage summary independently of the legacy Jest 29
 * threshold reporter. Exits nonzero on missing, malformed or regressed data.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const floors = Object.freeze({
  statements: 70,
  branches: 70,
  functions: 80,
  lines: 70,
});

const reportFile = resolve(process.argv[2] || 'coverage/coverage-summary.json');
let failed = false;

try {
  const summary = JSON.parse(readFileSync(reportFile, 'utf8'));
  for (const [metric, minimum] of Object.entries(floors)) {
    const actual = summary?.total?.[metric]?.pct;
    if (typeof actual !== 'number' || !Number.isFinite(actual)) {
      console.error(`Coverage gate: missing or invalid total.${metric}.pct`);
      failed = true;
      continue;
    }
    console.log(`Coverage gate: ${metric} ${actual}% (minimum ${minimum}%)`);
    if (actual < minimum) {
      console.error(`Coverage gate: ${metric} fell below the ${minimum}% floor`);
      failed = true;
    }
  }
} catch (error) {
  console.error(`Coverage gate: failed to read ${reportFile}: ${error instanceof Error ? error.message : String(error)}`);
  failed = true;
}

if (failed) process.exitCode = 1;
