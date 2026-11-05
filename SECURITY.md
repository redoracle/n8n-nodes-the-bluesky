# Security Policy

Security vulnerabilities in this community node should be disclosed privately.
This project is not affiliated with n8n, Bluesky, or the AT Protocol maintainers.

## Supported versions

Security fixes target the latest published version and the current `main`
branch. Older `0.x` releases are not maintained individually.

## Reporting a vulnerability

**Do not open a public issue containing exploit details, secrets, or proof of concept.**

Use [GitHub's private vulnerability reporting](https://github.com/redoracle/n8n-nodes-the-bluesky/security/advisories/new)
if it is enabled. Otherwise, email **n8n-support@redoracle.com**, the
contact listed in package metadata. Maintainers should confirm the mailbox
is monitored. Provide the affected version, impact, minimal reproducer and
sanitized logs. We cannot guarantee a response or fix deadline.

## Operator security checklist

- Use a dedicated Bluesky **app password**, not your account password.
- Configure trusted PDS endpoints. Use **HTTPS** for remote PDS servers;
  a custom PDS receives authentication credentials.
- The label trigger transmits a bearer token and therefore accepts **wss://**
  only. Unauthenticated repository streams can use `ws://` for local testing.
  TLS does not establish that a custom relay is trustworthy.
- Open Graph website-card fetching is opt-in and makes outbound requests.
  Obvious private IPs and DNS resolutions are rejected, redirects are blocked,
  and thumbnail downloads have a strict size and time limit. These checks
  **do not eliminate DNS rebinding**: retain network egress controls, avoid
  untrusted URLs, and protect cloud metadata and private networks.
- The raw firehose trigger is **not** a production-ready, lossless decoder.
  Native subscription CBOR framing, CAR records and replay are not complete.
- Keep the n8n host and dependencies patched. Rotate exposed credentials;
  never paste secrets into issues or workflow exports.

## Maintainer commitments

Security PRs should include regression tests and a frozen-lockfile build.
Use least privilege in CI; keep npm tokens and release credentials out of
pull-request jobs. Review Dependabot advisories and coordinate disclosure
privately when possible.

See [the security audit](docs/SECURITY_AUDIT_2026-11-05.md) and
[architecture](docs/ARCHITECTURE.md) for limitations and mitigations.

## Known outstanding advisory

The production dependency scanner currently reports a **high-severity**
Zod 3 resource exhaustion advisory, [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
through the pinned CJS AT Protocol SDK. No safe Zod 3 patch is available.
A breaking SDK/ESM migration and live compatibility testing are needed;
see [issue #56](https://github.com/redoracle/n8n-nodes-the-bluesky/issues/56).
The security audit is intentionally not suppressed. Treat this as a
release risk, limit untrusted input sizes and avoid publicly exposing the node.
