// Bundle the n8n entry points so the published package has no runtime dependencies.
//
// n8n's community-package updater runs `npm install --install-strategy=shallow` inside
// the package folder, which can fail or lay out nested dependencies differently between
// versions. Shipping self-contained entry files removes that install step as a failure
// source. `n8n-workflow` and `n8n-core` stay external: n8n provides them at runtime.
//
// Run after `tsc && gulp build:icons`. The bundles overwrite the tsc output at the same
// paths, so package.json `n8n.*` and index.js keep working unchanged.
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const entryPoints = [...(pkg.n8n?.nodes ?? []), ...(pkg.n8n?.credentials ?? [])];
if (entryPoints.length === 0) {
	throw new Error('package.json declares no n8n.nodes / n8n.credentials to bundle');
}

await build({
	entryPoints,
	outdir: 'dist',
	outbase: 'dist',
	allowOverwrite: true,
	bundle: true,
	platform: 'node',
	target: 'node20',
	format: 'cjs',
	external: ['n8n-workflow', 'n8n-core'],
	sourcemap: true,
	sourcesContent: false,
	legalComments: 'linked',
	logLevel: 'warning',
});

console.log(`bundled ${entryPoints.length} entry points into dist/`);
