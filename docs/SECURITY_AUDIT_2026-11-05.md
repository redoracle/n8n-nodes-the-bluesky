# Second-pass audit — 2026-11-05

**Scope:** the current pull request branch, TypeScript runtime code,
dependency manifests, GitHub workflows and repository documentation.
This is source review and CI verification, **not** a penetration test.

| Severity | Finding | Status |
| --- | --- | --- |
| High | Authenticated label WebSocket could transmit a bearer token over unencrypted `ws://` | Fixed by requiring `wss://`, with regression tests |
| Medium | Declared package `main` was missing from publishable allowlist | Fixed: include and smoke-test `index.js` |
| Medium | Missing coordinated security disclosure and issue/PR templates | Fixed: add `SECURITY.md`, `SUPPORT.md`, templates, CODEOWNERS and maintainer guide |
| Low | Code of Conduct incident reports pointed to an unrelated team mailbox | Replaced with repository metadata contact; maintainer should verify mailbox |
| Low | Makefile used a removed dependency script; Docker README pinned obsolete tarball example | Fixed |
| Medium | Open Graph SSRF/redirect and image download exhaustion | Mitigated: public-address DNS guard, redirect rejection, timeout, bounded image downloads; DNS rebinding remains a residual risk requiring network egress rules |
| Open | Firehose does not implement binary CBOR frame/CAR parsing, cursor replay or durable queue | Disclosed; separate AT Protocol migration required |
| Open | Docker images track `latest` and setup uses root; not verified as hardened | Pin digest and migrate to nonroot in a Docker integration-tested PR |
| High / open | Zod 3 memory-exhaustion advisory reachable through the legacy `@atproto/api` dependency tree | No compatible patched 3.x line; tracked in [#56](https://github.com/redoracle/n8n-nodes-the-bluesky/issues/56); requires SDK/ESM migration and live integration tests |
| Open | Live n8n integration has not been completed | Test against n8n before release |

## Dependency strategy

The preceding audit upgraded semver-compatible runtime/development dependencies
and regenerated the lockfile. This review does not force incompatible
ESM-only `@atproto` SDK migrations. Perform them as a separate tested change.

## Evidence and limitations

CI validates the frozen dependency installation, test suite, TypeScript build,
and npm tarball. A green CI result is not a guarantee that all vulnerabilities,
security misconfigurations or live API integration errors have been eliminated.
The latest PR check status is the authoritative verification result.

## Unresolved high-severity dependency advisory

`pnpm audit --prod --audit-level high` reports
[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
for Zod 3 in the pinned CommonJS-compatible `@atproto/api` runtime tree.
The Zod fix is available only in 4.6.6+, a major migration for consumers
of Zod 3. Attempted parent-scoped overrides exposed additional nested
Zod 3 paths and were **reverted**, rather than silently forcing a
potentially incompatible validator replacement. The security audit remains
failing intentionally, pending a separately tested SDK/ESM migration.
Track the remediation and constraints in
[issue #56](https://github.com/redoracle/n8n-nodes-the-bluesky/issues/56).
