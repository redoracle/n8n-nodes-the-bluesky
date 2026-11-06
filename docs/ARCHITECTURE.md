# Architecture, packaging, and protocol limitations

## Production entry points

`package.json` registers `dist/nodes/Bluesky/Bluesky.node.js`,
`dist/nodes/BlueskyTrigger/BlueskyTrigger.node.js`, and
`dist/credentials/BlueskyApi.credentials.js` with n8n. The root
`index.js` exposes the same compiled classes.

`nodes/Bluesky/Bluesky.node.ts` selects the versioned V2 class. The V2
implementation delegates resource operations to the individual
`nodes/Bluesky/V2/*Operations.ts` modules. This is the single supported
implementation; do not add a second V2 class under `src/`.

`nodes/BlueskyTrigger/` contains the WebSocket trigger and its parser.
The node has an in-memory bounded queue, high/low water marks, and a
shutdown hook. The queue is **not durable**: events can be dropped under
load or during reconnects.

## AT Protocol subscription limitation

AT Protocol XRPC subscription messages are *framed*: they contain a CBOR
header and body as separate values. `subscribeRepos` commit bodies also
carry CAR blocks, and operation records must be resolved from those
blocks. The current `parseFirehoseMessage` helper only accepts a decoded
commit-shaped CBOR object or a JSON fixture. It does **not** decode the
native two-part frame or resolve its CAR blocks. The label trigger likewise
does not implement complete frame decoding. Therefore, do not treat the
current raw relay trigger as production-ready or lossless. The legacy
`rebase`/`tooBig` fields in its parser also need to be reconciled with
newer protocol revisions.

A complete implementation should use a maintained AT Protocol subscription
decoder, handle message/error frames and cursor resume, resolve CAR records,
add real binary fixtures, and run end-to-end tests against a test relay.
Until then, use authenticated polling operations for workflows requiring
reliable delivery.

Protocol references:
- https://atproto.com/specs/event-stream
- https://atproto.com/specs/repository
- https://atproto.com/specs/data-model

## Build and release boundaries

Only `nodes/`, `credentials/`, and required type declarations are
compiled to `dist/`; Jest sources and obsolete `src/` copies are excluded.
The icon copy task runs after compilation. `package.json` publishes
`dist/` and the CommonJS `index.js` entry point.

Use `pnpm install --frozen-lockfile`, then `pnpm lint`, `pnpm test`,
and `pnpm build`. CI additionally packs the tarball and checks its
required entry points. Production and test TypeScript programs have separate
configurations (`tsconfig.json` and `tsconfig.test.json`).

## Dependencies and compatibility

The package deliberately remains CommonJS for its current n8n integration.
`@atproto/api` and `@atproto/lex-cbor` stay on their existing
CommonJS-compatible release lines; newer major/minor transitions move
toward pure ESM and require separate migration and n8n integration testing.
`@atproto/lexicon` is direct to prevent shallow-install resolution
failures. Do not raise these versions or the minimum Node engine without
testing the installed community package inside n8n.

The `pnpm-lock.yaml` file must be changed together with dependency
specifiers. Never use an implicit install during `build` or `test`:
reproducibility is enforced at the install step.

## Transport trust boundaries

The trigger accepts a configured relay origin. The `subscriptionEndpoint` helper
rejects credentials, query strings, paths and URL fragments in relay origins.
Authenticated label subscriptions require `wss://`; unencrypted `ws://`
remains available only for unauthenticated repository events and local testing.
An encrypted connection does **not** make a remote relay trustworthy.
Only configure trusted endpoints. The same precaution applies to custom PDS URLs.

Website-card Open Graph fetching is an opt-in outbound network operation.
Do not enable it for arbitrary untrusted URLs without a network egress policy;
redirects, private DNS and DNS rebinding can expose internal services.

The production compiler does not emit an extra `dist/package.json`.
ESLint parses the root package manifest separately from the TypeScript project.
