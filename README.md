# n8n Community Node: Bluesky

[![npm version](https://img.shields.io/npm/v/n8n-nodes-the-bluesky.svg)](https://www.npmjs.com/package/n8n-nodes-the-bluesky)
[![Downloads](https://img.shields.io/npm/dm/n8n-nodes-the-bluesky.svg)](https://www.npmjs.com/package/n8n-nodes-the-bluesky)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)
[![CI](https://github.com/redoracle/n8n-nodes-the-bluesky/actions/workflows/ci.yml/badge.svg)](https://github.com/redoracle/n8n-nodes-the-bluesky/actions/workflows/ci.yml)

A community maintained n8n node package for interacting with the Bluesky (AT Protocol) API. It covers posting, feed reading, list management, search, analytics, and real time streaming in your n8n workflows.

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration & Credentials](#configuration--credentials)
- [Usage Examples](#usage-examples)
  - [Example Workflow Files](#example-workflow-files)
  - [Create a Post](#create-a-post)
  - [Fetch an Author Feed](#fetch-an-author-feed)
  - [Manage Lists](#manage-lists)
- [Available Resources & Operations](#available-resources--operations)
- [Testing](#testing)
- [Development & Contributing](#development--contributing)
- [License](#license)
- [References](#references)

---

## Features

- **Posting**: Create posts, replies, quotes, and reposts with optional media or website cards. Includes likes, unlikes, and post deletion.
- **Media**: Image uploads with automatic aspect ratio detection; video upload support (availability depends on your Bluesky account status).
- **Feeds**: Author feeds, timelines, thread contexts, list feeds, suggested feeds, feed skeletons, and pagination.
- **Search**: Search users and posts with filtering options.
- **Lists**: Create and manage lists, add or remove users, and retrieve list feeds.
- **Notifications**: Fetch notifications, unread counts, and mark as seen.
- **Analytics**: Post interaction data and enhanced notification workflows.
- **Authentication**: Session management (create, refresh, delete), app password creation, invite codes, and signing key rotation.
- **Account**: Repository transfer requests (experimental).
- **User Management**: Profile operations (get, update), follow/unfollow, block/unblock, mute/unmute.
- **Chat**: Full conversation and message management: list, get, send, delete, and mute conversations.
- **Repository**: Direct record operations (create, update, delete, list) and blob management.
- **Moderation**: Submit reports for content or accounts.
- **Labels**: Query and apply labels (labeler/admin).
- **Lexicon**: Resolve lexicon schemas by URL or NSID.
- **Identity**: Resolve handles and DIDs.
- **Preferences**: Get and update user preferences.
- **Sync**: Repository synchronization, crawling, and status checks.
- **Trigger Node**: Real time streaming via WebSocket connections:
  - **Firehose**: Subscribe to all public Bluesky repository events (posts, likes, follows, etc.)
  - **Label Updates**: Subscribe to moderation label updates
  - **Filtering**: Filter events by collection type, DID, or operation
  - **Auto reconnect**: Reconnect automatically on connection loss
  - **Event Limits**: Cap the number of events or run continuously

---

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- [pnpm](https://pnpm.io/) v10 or higher
- A self hosted [n8n](https://n8n.io/) instance

---

## Installation

```bash
# From your n8n project root:
pnpm install n8n-nodes-the-bluesky
```

### Building with or without the plugin

The Dockerfiles in this repository use a multistage build with an optional plugin install step.

**Build with plugin**: provide the tarball via `--build-arg` and target `final-plugin`. The tarball must exist in the build context, or specify a path relative to it.

```bash
docker build --target final-plugin --build-arg PLUGIN_TARBALL=n8n-nodes-the-bluesky-0.0.21.tgz -t n8n-with-plugin .
```

**Local development without plugin**:

```bash
docker build -f Dockerfile.dev -t n8n-dev:plain .
```

**Local development with plugin**:

```bash
docker build -f Dockerfile.dev --target final-plugin --build-arg PLUGIN_TARBALL=n8n-nodes-the-bluesky-0.0.21.tgz -t n8n-dev:plugin .
```

> The plugin tarball is only used when building the `final-plugin` target. Default builds without a specified target will not attempt to install the plugin. This approach works across common Docker installations and does not rely on BuildKit-specific optional mounts.

The node is detected automatically by n8n after installation. Restart your n8n instance if it is already running.

---

## Configuration & Credentials

Before using the Bluesky node, create a Bluesky App Password and configure credentials in n8n:

1. In Bluesky, create an App Password for your account.
2. In the n8n UI, go to **Credentials > New > Bluesky API** and fill in:
   - **Identifier**: your handle (e.g. `yourname.bsky.social`) or DID
   - **App Password**: the app password you created
   - **Service URL**: `https://bsky.social` (or your custom service URL)
3. Save and click **Connect**.

---

## Usage Examples

### Example Workflow Files

The repository includes ready-to-import n8n workflows in the `examples/` directory:

- `examples/Comprehensive BlueSky Test Workflow.json` — A safe, comprehensive compatibility run focused on read operations and reversible writes with cleanup. Good default for validating credentials, connectivity, and core functionality.
- `examples/Comprehensive BlueSky Test Workflow.safe.json` — Same as above, kept as an explicit safe variant. Useful when maintaining a separate full mode file alongside it.
- `examples/Comprehensive BlueSky Test Workflow.full.json` — Full coverage workflow including admin only, experimental, and higher impact operations (account transfer, label apply, chat). Use only in controlled test environments with test accounts.
- `examples/Bluesky_example_workflow.json` — Minimal practical example: create a post and read from feeds and search. Good starting point for basic create-and-read patterns.
- `examples/Bluesky_node_template.json` — Reusable template for common post, feed, and search flows. Useful for quickly assembling a workflow and swapping operations.

Import any file in n8n via **Workflows > Import from File**.

### Create a Post

1. Add a Bluesky node.
2. Set Resource to **Post** and Operation to **Create**.
3. Fill in the **Text** field, and optionally include media or additional fields.

```yaml
- name: Create Post
  type: n8n-nodes-community/n8n-nodes-the-bluesky:Bluesky
  parameters:
    resource: post
    operation: create
    text: 'Hello from n8n and Bluesky!'
    additionalFields:
      replyTo: ''
```

### Fetch an Author Feed

Set Resource to **Feed** and Operation to **Get Author Feed**. Use **Additional Fields** to filter content types and configure paging.

```yaml
- name: Get Author Feed
  type: n8n-nodes-community/n8n-nodes-the-bluesky:Bluesky
  parameters:
    resource: feed
    operation: authorFeed
    handle: 'example.bsky.social'
    additionalFields:
      limit: 20
```

### Manage Lists

**Create a list**:

```yaml
- name: Create List
  type: n8n-nodes-community/n8n-nodes-the-bluesky:Bluesky
  parameters:
    resource: lists
    operation: create
    name: 'My Curated List'
```

**Add a user**:

```yaml
- name: Add User
  type: n8n-nodes-community/n8n-nodes-the-bluesky:Bluesky
  parameters:
    resource: lists
    operation: addUser
    listUri: 'at://did:plc:.../app.bsky.graph.list/...'
    userDid: 'did:plc:...'
```

### Monitor Posts in Real Time (Trigger Node)

The Bluesky Trigger node streams Bluesky events over WebSocket in real time.

#### Example 1: Monitor All New Posts

```yaml
- name: Bluesky Firehose Trigger
  type: n8n-nodes-community/n8n-nodes-the-bluesky:BlueskyTrigger
  parameters:
    stream: subscribeRepos
    serviceEndpoint: 'wss://bsky.network'
    filterCollection: 'app.bsky.feed.post'
    maxEvents: 100
```

#### Example 2: Monitor Specific User Activity

```yaml
- name: Watch User Activity
  type: n8n-nodes-community/n8n-nodes-the-bluesky:BlueskyTrigger
  parameters:
    stream: subscribeRepos
    serviceEndpoint: 'wss://bsky.network'
    filterDid: 'did:plc:...'
    filterOperation: 'create'
    maxEvents: 0
```

#### Example 3: Continuous Firehose

```yaml
- name: Continuous Firehose
  type: n8n-nodes-community/n8n-nodes-the-bluesky:BlueskyTrigger
  parameters:
    stream: subscribeRepos
    serviceEndpoint: 'wss://bsky.network'
    maxEvents: 0
    autoReconnect: true
    reconnectInterval: 5000
```

#### Endpoint, Auth & Rate Limits

The examples use `wss://bsky.network` as a public relay. Whether authentication is required depends on the relay: some permit unauthenticated read only subscriptions, others require a valid session or app password. If your connection is rejected, add your Bluesky credentials (App Password and service URL) in the node settings and retry.

Public relays typically enforce per connection, per IP, or per account limits on events per second, concurrent connections, or message size. These limits vary and can change. Recommended practices:

- Enable `autoReconnect: true` with a `reconnectInterval` of around 5000 ms.
- Use exponential backoff on repeated reconnects (e.g. 5s, 10s, 20s, capped at 60s) to avoid hammering the relay.
- Avoid multiple parallel trigger connections to the same relay from one host. Prefer a single shared connection or a dedicated relay per worker.

#### Continuous Monitoring

Running the firehose continuously (`maxEvents: 0`) can generate very high event volumes, increasing CPU, memory, network, and downstream processing costs. Some guidelines:

- Use `maxEvents` during development and testing; only switch to continuous mode in production when you have capacity planning in place.
- Batch or debounce downstream processing and use a queue to smooth bursts.
- Run trigger nodes on dedicated, scalable worker instances with per worker concurrency limits.

#### Troubleshooting

**Connection refused or cannot connect:**

- Confirm the WebSocket URL is correct and reachable from the host running n8n. You can test with `wscat` or an equivalent tool.
- Use `wss://` for secure connections when required by the relay.

**Authentication errors (401/403 or immediate disconnect):**

- If the relay requires authentication, verify that your Bluesky App Password and Service URL are correct in n8n credentials.
- Some relays accept a token rather than an App Password. Check the relay documentation for the expected format.

**Frequent disconnects or rate limited responses:**

- Increase `reconnectInterval`, enable `autoReconnect`, and implement exponential backoff.
- Apply stricter filters (collection, DID, operation) to reduce event volume.

**High downstream load or queue buildup:**

- Throttle or batch events, add a durable queue (Redis, RabbitMQ), and scale your workers.
- Sample the feed by filtering to specific collections or DIDs.

**Common use cases:**

- Real-time content moderation
- Custom notification systems
- Analytics and trend detection
- Building custom feeds
- Automated responses to mentions or keywords

---

## Available Resources & Operations

| Resource         | Operations                                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**         | createSession, refreshSession, deleteSession, createAppPassword                                                                                    |
| **Post**         | create, delete, reply, quote, repost, like, unlike, get                                                                                            |
| **Feed**         | getAuthorFeed, getTimeline, getPostThread, getPosts, getLikes, getRepostedBy, getSuggestedFeeds, getFeedGenerators, getFeed, describeFeedGenerator |
| **User**         | getProfile, getProfiles, updateProfile, follow, unfollow, block, unblock, mute, unmute, listFollowers, listFollows, getSuggestions                 |
| **Search**       | searchUsers, searchPosts                                                                                                                           |
| **List**         | create, update, delete, addUser, removeUser, get, getList, getListFeed                                                                             |
| **Notification** | listNotifications, getUnreadCount, updateSeen                                                                                                      |
| **Chat**         | listConvos, getConvo, getConvoForMembers, leaveConvo, muteConvo, unmuteConvo, getMessages, sendMessage, deleteMessage, getLog                      |
| **Graph**        | muteThread, unmuteThread, getBlocks, getMutes                                                                                                      |
| **Repo**         | createRecord, putRecord, deleteRecord, getRecord, listRecords, applyWrites, uploadBlob                                                             |
| **Moderation**   | createReport                                                                                                                                       |
| **Label**        | queryLabels                                                                                                                                        |
| **Identity**     | resolveHandle, resolveDid, resolveIdentity                                                                                                         |
| **Preferences**  | getPreferences, putPreferences                                                                                                                     |
| **Sync**         | getRepo, getRecord, getRepoStatus, getLatestCommit, getBlob, listBlobs, listRepos, notifyOfUpdate, requestCrawl                                    |
| **Trigger**      | subscribeRepos, subscribeLabels (real time WebSocket streaming)                                                                                    |

### API Coverage

This package covers a broad range of the AT Protocol API:

- **Social operations**: Full post lifecycle, user relationships (follow, block, mute), conversations
- **Content discovery**: Multiple feed types with pagination, search, suggested content, and feed skeletons
- **Data access**: Direct repository operations and lexicon resolution for advanced use cases
- **Administration**: Sessions, app passwords, invite codes, signing key rotation, and moderation tools
- **Advanced features**: Identity resolution, label queries and application, repository sync status, analytics

For field descriptions and parameter options, see the source under `nodes/Bluesky/`.

---

## Testing

Tests use [Jest](https://jestjs.io/).

```bash
pnpm install
pnpm test
```

Test files are in the `__tests__` directory.

---

## Development & Contributing

Contributions are welcome. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

1. Fork the repository and clone it locally.
2. Create a feature branch: `git checkout -b feature-name`.
3. Install dependencies: `pnpm install`.
4. Build and lint: `pnpm run build && pnpm run lint`.
5. Run tests: `pnpm test`.
6. Commit and push your changes, then open a pull request.

**Code style**: ESLint and Prettier are configured. Run:

```bash
pnpm run lint
pnpm run format
```

### Makefile

The repository includes a `Makefile` with developer shortcuts. Run `make help` to list all available targets.

Common targets:

- `make install` — install dependencies
- `make deps` — ensure build and test tooling is present
- `make build` — compile TypeScript and assets
- `make dev` — start TypeScript watch mode
- `make test` — run the Jest test suite
- `make lint` / `make lintfix` — run ESLint with optional auto fix
- `make format` / `make format-ts` — run Prettier
- `make pack` — build and create a package tarball
- `make clean` — remove build artifacts

Docker targets:

- `make docker-build` — build the development Docker image
- `make docker-up` — start the Docker Compose stack
- `make dev-bind` — run a bind mounted dev compose (local edits are reflected immediately)
- `make dev-plugin` — run the plugin compose (requires a built tarball)

```bash
make help

make install
make test

make dev
```

Makefile targets forward to the `pnpm` scripts defined in `package.json`, so you can run those directly as well. To override the package manager at invocation time:

```bash
PNPM=yarn make install
```

### TypeScript Configuration

`tsconfig.json` uses `typeRoots: ["./node_modules/@types"]` for standard third-party type definitions. Custom shims in `./types/` are loaded via the `include` array, not via `typeRoots`:

- **`types/n8n-workflow-shim.d.ts`**: Ambient module shim for editor-only use when devDependencies are not installed.
- **`types/trigger-types.d.ts`**: Minimal local declarations for `ITriggerFunctions` and `ITriggerResponse`, which are not exported from the public `n8n-workflow` index.
- **`types/jest.d.ts`**, **`types/node-globals.d.ts`**: Lightweight editor shims for Jest and Node globals.

When adding dependencies, make sure the package either includes its own types, has a corresponding `@types/*` package in devDependencies, or has a minimal shim in `./types/`.

---

## License

MIT. See [LICENSE.md](LICENSE.md) for details.

---

## References

- Bluesky API Docs: <https://docs.bsky.app/>
- AT Protocol Docs: <https://atproto.com/>
- n8n Community Nodes Docs: <https://docs.n8n.io/integrations/community-nodes/>
