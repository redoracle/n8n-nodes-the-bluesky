# Maintainer playbook

## Pull request gate

Require a green GitHub Actions run for the **latest head commit**. CI installs
dependencies from the frozen lockfile, runs ESLint and Jest, builds the
production TypeScript sources, checks the package's entry points, and packs
the npm artifact. Confirm the packed `package/index.js` and `dist/` files
are included. Review dependency and semantic release implications.

Use a dedicated n8n integration instance for changes touching authentication,
the AT Protocol SDK, image/video uploads or WebSocket subscriptions.
Unit tests do not replace real-world integration.

## Dependencies

Run `pnpm update` only within currently compatible semver ranges, then
regenerate and commit `pnpm-lock.yaml`. Do not raise the pinned
`@atproto/api` or `@atproto/lex-cbor` lines to ESM-only releases
without a separate CommonJS/n8n migration and integration tests.
Triage security advisories promptly; document unfixable dependencies.

## Release process

`.github/workflows/release.yml` uses semantic-release when `main` changes.
Review [Conventional Commit](https://www.conventionalcommits.org/) messages
and release notes. Protect npm publication tokens; restrict CI permissions
to read-only except for the release job. No releases should run from fork PRs.

## GitHub repository settings

Set up branch protection or rulesets to require CI and a human review before
merging into `main`. Enable secret scanning, Dependabot security alerts and
private vulnerability reporting where supported. These settings must be
configured by a repository administrator; repository files alone do not
enable them.

## Local verification

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm lint
pnpm exec jest --runInBand
pnpm build
pnpm pack
```

Cross-check the latest [audit](SECURITY_AUDIT_2026-11-05.md) before declaring
a change production-ready.

## Outstanding release blocker

[Issue #56](https://github.com/redoracle/n8n-nodes-the-bluesky/issues/56)
tracks the high-severity Zod 3 advisory in the pinned AT Protocol SDK.
The dedicated security audit is expected to fail until the incompatible
SDK migration is tested and addressed. Do not override this red check
just to obtain a green status; require an explicit security review before
any release or merge.
