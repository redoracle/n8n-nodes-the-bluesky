# npm Trusted Publishing (OIDC) release cutover

This repository uses `pnpm exec semantic-release` with `@semantic-release/npm` to **publish directly** to the npm registry. The GitHub Actions workflow `.github/workflows/release.yml` is prepared to use OIDC without `NPM_TOKEN` or `NODE_AUTH_TOKEN`.

## Required one-time npm configuration (maintainer with 2FA)

On [npmjs.com](https://www.npmjs.com/package/n8n-nodes-the-bluesky) open **Package → Settings → Trusted publishing** and create this GitHub Actions publisher:

| Field | Value |
|---|---|
| GitHub user / owner | `redoracle` |
| Repository | `n8n-nodes-the-bluesky` |
| Workflow filename | `release.yml` (not a path) |
| Environment | leave empty (the release job has no `environment:`) |
| Allow npm publish | **enabled** (required by `@semantic-release/npm`) |
| Allow npm stage publish | available automatically; not used by this workflow |
| Allow npm dist-tag | optional; not needed by this workflow |

**Cutover order:** configure trusted publishing immediately before merging the migration PR; confirm branch protections and checks; merge the PR; allow a real release-worthy Conventional Commit to run; verify that `semantic-release` actually publishes a new version using OIDC, not a token. A newly created trust must complete its first successful publication within **48 hours** or it expires.

### Post-release confirmation

- In the release run, ensure npm OIDC exchange/publish succeeds, then inspect the new version and provenance on npmjs.com.
- Verify the GitHub release and npm version agree. `npm whoami` is **not** an OIDC publish test.
- **Only after that success**, revoke the old publish token on npmjs.com and delete the `NPM_TOKEN` GitHub Actions secret if it is no longer used elsewhere.
- In npm package **Settings → Publishing access**, consider `Require two-factor authentication and disallow tokens`. This does not disable properly configured OIDC publishers.

### Troubleshooting

- `404 OIDC token exchange error - package not found`: confirm the package still exists on npm and that the trust is attached to **that exact package**, not just a similar name.
- `ENEEDAUTH` / `ENONPMTOKEN`: verify the npm trusted publisher identity matches `redoracle/n8n-nodes-the-bluesky` and **`release.yml`** exactly, the correct permissions are enabled and the trust has not expired.
- If a release fails, inspect registry version and Git tags before retrying, to avoid trying to republish an immutable npm version.

Refs: https://docs.npmjs.com/trusted-publishers/ and https://docs.npmjs.com/staged-publishing/
