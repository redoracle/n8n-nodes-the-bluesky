# Release security gate

Publishing must never bypass the production dependency audit.

The `Release` workflow starts with a production dependency audit job that has read-only repository permissions. The release job depends on that audit and is not started unless it succeeds. Only the release job receives `contents: write`; its checkout does not persist credentials, and its explicit `GITHUB_TOKEN` and `NPM_TOKEN` environment variables are limited to the final semantic-release step.

The audit runs:

```sh
pnpm audit --prod --audit-level high
```

The same command runs independently in `.github/workflows/security.yml`, including on pull requests and on a weekly schedule. Do not suppress, reclassify, or exclude a high/critical advisory just to turn a workflow green; an exception requires a documented security review, specific risk analysis, and explicit human authorization.

## Known blocker — November 6, 2026

The current `@atproto/api@0.19.6` dependency and related AT Protocol packages rely on Zod 3.x. [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) affects versions below 4.6.6, with no published patched Zod 3 release. The November 6 upstream `@atproto/api@0.30.3` also declares `zod: ^3.23.8` and requires Node >=22 with ESM packaging. The upstream [Zod 4 support issue](https://github.com/bluesky-social/atproto/issues/5811) remains open.

Consequently, **this release gate intentionally blocks publication** until a reviewed, integration-tested SDK migration (or compatible upstream fix) resolves the production advisory. Do not attempt a forced Zod 4 pnpm override against unmigrated Zod 3-consuming code.

A valid remediation PR must demonstrate:
1. Frozen pnpm install; production audit reports no high/critical vulnerability.
2. Real n8n installation/credential/session/authorization compatibility.
3. Post/reply/media/chat/search/feed integration under the upgraded SDK.
4. CI lint/Jest/TypeScript build/pack success, plus live video and trigger protocol checks when those features are involved.

Track the SDK migration in [#56](https://github.com/redoracle/n8n-nodes-the-bluesky/issues/56) and the broader API-quality milestones in [#58](https://github.com/redoracle/n8n-nodes-the-bluesky/issues/58).
