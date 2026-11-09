// Release gate: prove the packed package survives n8n's community-package install.
//
// Replays n8n's updater (extract tarball, strip dev/peer/optional dependencies, run
// `npm install --install-strategy=shallow ...` inside the package folder) in fresh
// directories, then asserts:
//   - the package declares no runtime dependencies and the install creates no node_modules;
//   - every file in package.json `n8n.nodes` / `n8n.credentials` loads and instantiates;
//   - the tarball stays inside a size budget.
// `n8n-workflow` is provided by the host in production, so it is installed once in a
// parent directory here, exactly where n8n would resolve it from.
//
// Usage: node scripts/verify-installable.mjs [path/to/package.tgz]
// Env:   VERIFY_RUNS (default 5)
import { execFileSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const RUNS = Number(process.env.VERIFY_RUNS ?? 5);
const MAX_TARBALL_BYTES = 5 * 1024 * 1024;
const root = resolve(new URL('..', import.meta.url).pathname);
const rootPkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const work = mkdtempSync(join(tmpdir(), 'verify-installable-'));

const run = (cmd, args, cwd) =>
	execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
const fail = (message) => {
	console.error(`FAIL: ${message}`);
	process.exitCode = 1;
};

try {
	let tarball = process.argv[2] && resolve(process.argv[2]);
	if (!tarball) {
		const out = join(work, 'pack');
		mkdirSync(out);
		run('pnpm', ['pack', '--pack-destination', out], root);
		tarball = join(
			out,
			readdirSync(out).find((f) => f.endsWith('.tgz')),
		);
	}
	const size = statSync(tarball).size;
	console.log(`tarball: ${tarball} (${size} bytes)`);
	if (size > MAX_TARBALL_BYTES) fail(`tarball ${size} bytes exceeds budget ${MAX_TARBALL_BYTES}`);

	// Host layout: <work>/host/node_modules/n8n-workflow (+ its dependencies).
	const host = join(work, 'host');
	mkdirSync(host);
	writeFileSync(join(host, 'package.json'), '{"name":"host","private":true}');
	const workflowRange = rootPkg.devDependencies?.['n8n-workflow'] ?? 'latest';
	run(
		'npm',
		[
			'install',
			`n8n-workflow@${workflowRange}`,
			'--audit=false',
			'--fund=false',
			'--ignore-scripts',
		],
		host,
	);

	for (let i = 1; i <= RUNS; i++) {
		const nodes = join(work, `run-${i}`, 'node_modules');
		const pkgDir = join(nodes, rootPkg.name);
		mkdirSync(pkgDir, { recursive: true });
		for (const entry of readdirSync(join(host, 'node_modules'))) {
			symlinkSync(join(host, 'node_modules', entry), join(nodes, entry));
		}
		run('tar', ['-xzf', tarball, '-C', pkgDir, '--strip-components=1'], work);

		const pkgPath = join(pkgDir, 'package.json');
		const { devDependencies, peerDependencies, optionalDependencies, ...pkg } = JSON.parse(
			readFileSync(pkgPath, 'utf8'),
		);
		writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
		if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
			fail(`run ${i}: package declares runtime dependencies: ${Object.keys(pkg.dependencies)}`);
		}

		run(
			'npm',
			[
				'install',
				'--audit=false',
				'--fund=false',
				'--bin-links=false',
				'--install-strategy=shallow',
				'--ignore-scripts=true',
				'--package-lock=false',
			],
			pkgDir,
		);
		if (existsSync(join(pkgDir, 'node_modules'))) {
			fail(`run ${i}: install created node_modules inside the package`);
		}

		const files = [...(pkg.n8n?.nodes ?? []), ...(pkg.n8n?.credentials ?? [])];
		for (const file of files) {
			const probe =
				'const m=require(process.argv[1]);' +
				'const C=Object.values(m).find((v)=>typeof v==="function");' +
				'const o=new C();const name=(o.description&&o.description.name)||o.name;' +
				'if(!name)throw new Error("no description.name / name");console.log(name)';
			try {
				run(process.execPath, ['-e', probe, join(pkgDir, file)], pkgDir);
			} catch (error) {
				const lines = String(error.stderr ?? error.message).split('\n');
				const detail = lines.find((l) => /Error|Cannot find/.test(l)) ?? lines.find(Boolean);
				fail(`run ${i}: cannot load ${file}: ${detail}`);
			}
		}
		console.log(`run ${i}/${RUNS}: ok (${files.length} entry files)`);
	}
} finally {
	rmSync(work, { recursive: true, force: true });
}

if (process.exitCode) {
	console.error('verify-installable: FAILED');
} else {
	console.log('verify-installable: PASSED');
}
