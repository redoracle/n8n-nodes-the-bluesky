# Test Strategy and Validation Boundaries

This repository is an n8n community node integrating with Bluesky and the AT Protocol.
A passing mocked test does **not** prove that a Bluesky service exposes an endpoint or
that the packaged node works inside a deployed n8n instance.

## Test levels

| Level | Current evidence | Required next validation |
| --- | --- | --- |
| Unit | Jest operation-level checks with mock SDK calls | Exact inputs, outputs, negative cases, malformed payloads |
| Execution | V2 dispatcher parameter/output tests | Dispatch every exposed resource/operation with correct item index |
| Contract | SDK method shape checks | Pin and validate against official lexicon schemas and XRPC transport |
| Protocol | Commit-shaped JSON and CBOR helper tests | **Actual** framed CBOR subscription messages and CAR record decoding |
| Runtime | TypeScript build and tarball contents in CI | Install packed node in supported n8n versions and execute workflows |
| Live | Not automatically run by current CI | Disposable account / PDS smoke tests, isolated from production |

## Determinism policy

- Control time via Jest fake timers with guaranteed cleanup. Do not assert that a
  timestamp falls between two wall-clock reads.
- Every write test must assert whether a remote mutation occurred, including when
  parsing, authorization, or optimistic concurrency fails.
- Pagination tests must verify *output content*, cursor progression, and the exact
  number of requests, not only an array length.
- Keep I/O mocked in unit tests and use controlled, local HTTP/WebSocket servers
  for network behavior tests. Never depend on public Bluesky availability in CI.
- Create fresh mock data per test; use strict input/output expectations. Avoid
  mocks which blindly return success for non-existent endpoint NSIDs.
- Do not use test count as a proxy for risk coverage: catalog invariants belong
  in a few comprehensive tests, not one identical test per static catalog item.

## High-risk gaps that remain

1. The firehose parser validates decoded commit-like shapes; native relay header
   framing and CAR record decoding are **not** end-to-end verified.
2. The video-processing fix is being reviewed separately in PR #59. Its mocked
   processing tests are not evidence of live video-service compatibility.
3. Outbound URL checks are defense-in-depth. DNS rebinding between validation
   and connection still needs a network-layer integration strategy.
4. The core V2 dispatcher has a large operation surface; new dispatch tests
   cover representative multi-item workflows but not every operation.
5. Auth/session recovery, partial notification marking, and chat permission
   behavior need controlled XRPC tests.
6. Current CI does not establish statement/branch/mutation coverage, or test
   installation inside an actual n8n runtime.
7. Production dependency advisory GHSA-mrhx-c7xc-m3w5 remains separately
   tracked in issue #56. Do not silence security checks to make tests green.

## Proposed release gates

- Unit, dispatch, SDK-contract and integration suites run as separate CI jobs,
  with failure modes clearly reported.
- Record coverage baselines first, then require module-specific thresholds for
  security-sensitive, posting, and event-streaming branches.
- Add contract fixtures pinned to upstream lexicon revisions, with an explicit
  compatibility review when changing `@atproto/api`.
- Make a lightweight installed-node smoke test part of PR checks; keep live
  service smoke tests isolated and opt-in with disposable credentials.
- Cover at least one success, invalid input, auth failure, server failure and
  pagination/retry scenario per public operation where applicable.

See [roadmap issue #58](https://github.com/redoracle/n8n-nodes-the-bluesky/issues/58).
