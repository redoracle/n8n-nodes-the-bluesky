# Contributing

Thanks for improving the Bluesky community node. Keep changes compatible
with existing n8n workflows and minimize unnecessary production dependencies.

## Local verification

1. Install Node.js 22 and activate pnpm via Corepack using the version in
   `package.json`: `corepack enable`.
2. Run `pnpm install --frozen-lockfile`.
3. Run `pnpm lint`, `pnpm exec jest --runInBand`, and `pnpm build`.
4. Run `pnpm pack` and inspect the archive to confirm only the expected
   `dist/` paths are published.
5. For behavior changes, exercise the node with a self-hosted n8n
   instance following [DEV_SETUP.md](DEV_SETUP.md).

CI enforces those checks on every pull request. Any change to the package
manifest must include an updated `pnpm-lock.yaml`, generated with the
pinned pnpm version, and must pass frozen installation.

## Code organization

- Put Bluesky API operations in `nodes/Bluesky/V2/*Operations.ts`.
- Keep shared node dispatch in `BlueskyV2.class.ts` and avoid duplicate
  implementations.
- Use n8n's item-aware helpers and `NodeOperationError` for operational
  failures. Avoid logging credentials, tokens, and binary payloads.
- Cover successful, failed, and malformed external responses with unit
  tests under `__tests__/`.
- Document user-visible changes and include a reproducible workflow
  example where helpful.

## Dependency update policy

Prefer patch-level, CommonJS-compatible dependency upgrades. Regenerate
the lockfile with `pnpm update <package>`; run the complete local check
suite and verify the packed node loads in n8n. Treat ESM-only AT Protocol
SDK releases, Node engine changes, and major n8n API versions as a
separate migration PR with integration tests.

## Protocol caution

The repository trigger does not currently decode the complete binary AT
Protocol subscription frame or CAR block format. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing the parser
or relying on firehose event delivery.

## Reporting problems and reviewing changes

Use the GitHub issue templates for reproducible bugs and feature requests.
For security vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of
opening a public issue. Include regression tests, runtime compatibility
notes, and migration guidance in pull requests. Maintainers should inspect
the publishable tarball, not only a successful TypeScript build.
