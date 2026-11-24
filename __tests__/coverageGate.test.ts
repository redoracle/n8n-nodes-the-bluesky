import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('Production coverage regression gate', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'bluesky-coverage-'));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  function verify(metrics: Record<string, number> | null) {
    const filename = join(directory, 'coverage-summary.json');
    if (metrics !== null) {
      const total = Object.fromEntries(
        Object.entries(metrics).map(([name, pct]) => [name, { pct }]),
      );
      writeFileSync(filename, JSON.stringify({ total }), 'utf8');
    }
    return spawnSync(
      process.execPath,
      [join(__dirname, '..', 'scripts', 'check-coverage.mjs'), filename],
      { encoding: 'utf8', timeout: 5_000 },
    );
  }

  const passingMetrics = {
    statements: 73.8,
    branches: 76.57,
    functions: 86.66,
    lines: 73.8,
  };

  it('accepts a complete report above all established coverage floors', () => {
    const result = verify(passingMetrics);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('branches 76.57% (minimum 70%)');
  });

  it('fails the build if any measured coverage dimension regresses', () => {
    const result = verify({ ...passingMetrics, branches: 69.99 });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('branches fell below the 70% floor');
  });

  it('rejects missing metrics rather than interpreting them as zero or passing', () => {
    const result = verify({ statements: 99 });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('missing or invalid total.branches.pct');
    expect(result.stderr).toContain('missing or invalid total.functions.pct');
  });

  it('fails when the coverage JSON artifact does not exist', () => {
    const result = verify(null);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('failed to read');
  });

  it('rejects malformed JSON instead of accidentally passing the gate', () => {
    const filename = join(directory, 'coverage-summary.json');
    writeFileSync(filename, '{invalid', 'utf8');
    const result = spawnSync(
      process.execPath,
      [join(__dirname, '..', 'scripts', 'check-coverage.mjs'), filename],
      { encoding: 'utf8', timeout: 5_000 },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('failed to read');
  });
});
