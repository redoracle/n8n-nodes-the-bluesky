# n8n Community Node: Bluesky

[![npm version](https://img.shields.io/npm/v/n8n-nodes-the-bluesky.svg)](https://www.npmjs.com/package/n8n-nodes-the-bluesky)
[![Downloads](https://img.shields.io/npm/dm/n8n-nodes-the-bluesky.svg)](https://www.npmjs.com/package/n8n-nodes-the-bluesky)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md)

A community maintained n8n node pack for interacting with the Bluesky (AT Protocol) API. This package provides robust posting, feed, list, search, and analytics operations—integrated into your n8n workflows.

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration & Credentials](#configuration--credentials)
- [Usage Examples](#usage-examples)
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

- **Posting**: Create posts, replies, quotes, and reposts (with media or website cards). Full support for likes, unlikes, and post deletion.
- **Media**: Image uploads with auto aspect ratio; video upload support (feature availability depends on Bluesky).
- **Feeds**: Author feeds, timelines, thread contexts, list feeds, suggested feeds, feed skeletons, and pagination support.
- **Search**: Search users and posts with filtering.
- **Lists**: Create and manage lists, add/remove users, list feeds.
- **Notifications**: Fetch notifications, unread counts, mark as seen.
- **Analytics**: Post interactions and enhanced notification workflows.
- **Authentication**: Session management (create, refresh, delete), app password creation, invite codes, and signing key rotation.
- **Account**: Repository transfer requests (experimental).
- **User Management**: Profile operations (get, update), follow/unfollow, block/unblock, mute/unmute.
- **Chat**: Full conversation and message management (list, get, send, delete, mute).
- **Repository**: Direct record operations (create, update, delete, list) and blob management.
- **Moderation**: Create reports for content or accounts.
- **Labels**: Query and apply labels (labeler/admin).
- **Lexicon**: Resolve lexicon schemas by URL or NSID.
- **Identity**: Resolve handles and DIDs.
- **Preferences**: Get and update user preferences.
- **Sync**: Repository synchronization, crawling, and status checks.
- **🔥 Trigger Node (NEW)**: Real-time streaming support via WebSocket connections:
  - **Firehose**: Subscribe to the Bluesky repository events firehose (all public posts, likes, follows, etc.)
  - **Label Updates**: Subscribe to moderation label updates
  - **Filtering**: Filter events by collection type, DID, or operation
  - **Auto-reconnect**: Automatic reconnection on connection loss
  - **Event Limits**: Set maximum events to capture or run continuously

---

## Prerequisites

- [Node.js](https://nodejs.org/) v14 or higher
- [npm](https://www.npmjs.com/) v6 or higher
- An [n8n](https://n8n.io/) instance (self-hosted)

---

## Installation

```bash
# From your n8n project root:
pnpm install n8n-nodes-the-bluesky
```

### Building the image with or without the plugin

The Dockerfiles in this repository provide a safe multi-stage build that supports an optional plugin install.

Usage patterns:

- Build with plugin: provide the tarball via --build-arg and build the `final-plugin` target. The tarball must be present in the build context (e.g. the repository root) or specify a path relative to the build context.

```bash
docker build --target final-plugin --build-arg PLUGIN_TARBALL=n8n-nodes-the-bluesky-0.0.1.tgz -t n8n-with-plugin .
```

- For local development using the dev Dockerfile (no plugin):

```bash
docker build -f Dockerfile.dev -t n8n-dev:plain .
```

- For local development with plugin:

```bash
docker build -f Dockerfile.dev --target final-plugin --build-arg PLUGIN_TARBALL=n8n-nodes-the-bluesky-0.0.1.tgz -t n8n-dev:plugin .
```

Notes:

- The plugin tarball is only used when you explicitly build the `final-plugin` target. The default builds (no target) will not attempt to install a plugin.
- This approach works across common Docker installations and does not rely on BuildKit-specific optional mounts.

The node will automatically be detected by n8n after installation. Restart your n8n instance if it is running.

---

## Configuration & Credentials

Before using the Bluesky node, create a Bluesky App Password and configure credentials in n8n:

1. In Bluesky, create an App Password for your account.
2. In n8n UI:
   - Go to **Credentials** > **New** > **Bluesky API**.
   - Fill in:
     - **Identifier**: your handle (e.g. `yourname.bsky.social`) or DID
     - **App Password**: the app password you created
     - **Service URL**: `https://bsky.social` (or your custom service)
   - Save and **Connect**.

---

## Usage Examples

### Create a Post

1. Add a Bluesky node.
2. Resource: **Post**, Operation: **Create**.
3. Set **Text** and optionally include media or additional fields.

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

- Resource: **Feed**, Operation: **Get Author Feed**.
- Use **Additional Fields** to filter content types and paging.

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

- **Create List**:
  - Resource: **Lists**, Operation: **Create**; set `name` and optional `description`.
- **Add User**:
  - Resource: **Lists**, Operation: **Add User**; set `listUri` and `userDid`.

```yaml
- name: Create List
  type: n8n-nodes-community/n8n-nodes-the-bluesky:Bluesky
  parameters:
    resource: lists
    operation: create
    name: 'My Curated List'
- name: Add User
  type: n8n-nodes-community/n8n-nodes-the-bluesky:Bluesky
  parameters:
    resource: lists
    operation: addUser
    listUri: 'at://did:plc:.../app.bsky.graph.list/...'
    userDid: 'did:plc:...'
```

### Monitor Posts in Real-Time (Trigger Node)

The Bluesky Trigger node enables real-time monitoring of Bluesky events via WebSocket connections:

#### Example 1: Monitor All New Posts

```yaml
- name: Bluesky Firehose Trigger
  type: n8n-nodes-community/n8n-nodes-the-bluesky:BlueskyTrigger
  parameters:
    stream: subscribeRepos
    serviceEndpoint: 'wss://bsky.network'
    filterCollection: 'app.bsky.feed.post'
    maxEvents: 100 # Stop after 100 posts
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
    maxEvents: 0 # Run continuously
```

#### Example 3: Monitor Continuous Firehose

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

**Key Features:**

#### Bluesky Trigger — Endpoint, Auth & Limits

- **Default endpoint:** The examples use `wss://bsky.network` as a convenient public relay. Whether a relay requires Bluesky credentials or an app token depends on the relay/service — some relays permit unauthenticated read-only subscriptions, while others require a valid session or app password. If the endpoint rejects your connection, supply your Bluesky credentials (App Password / service URL) in the node and retry.
- **Rate / connection limits:** Public relays commonly enforce per-connection, per-IP, or per-account limits (events/sec, maximum concurrent connections, or message size quotas). These limits vary by relay and can change. Recommended practices:
  - Start with `autoReconnect: true` and `reconnectInterval` of ~5000 ms (5s).
  - Use exponential backoff for repeated reconnects (e.g., 5s → 10s → 20s, cap ~60s) to avoid hammering the relay.
  - Avoid opening many parallel trigger connections to the same relay from one host — prefer a single shared connection or dedicated relay per worker.
- **Continuous monitoring (cost & sizing):** Running the firehose continuously (`maxEvents=0`) can produce very high event volumes. Expect increased CPU, memory, network bandwidth, and downstream processing costs. Recommendations:
  - Use `maxEvents` for development and testing; only enable continuous mode in production when you have capacity planning in place.
  - Batch or debounce downstream processing and use queuing to smooth bursts.
  - Run trigger nodes on dedicated, scalable worker instances and set per-worker concurrency limits.

#### Troubleshooting

- **Connection refused / cannot connect:**
  - Confirm the WebSocket URL is correct and reachable from the host running n8n (test with `wscat` or equivalent).
  - Ensure the URL uses `wss://` for secure WebSocket when required by the relay.
- **Authentication errors (401/403 / immediate disconnect):**
  - If the relay requires authentication, make sure your Bluesky credentials (App Password) and `Service URL` are correct in n8n credentials.
  - Some relays accept an app token instead of an App Password; consult the relay documentation and provide the expected token if required.
- **Frequent disconnects or rate-limited responses:**
  - Increase `reconnectInterval`, enable `autoReconnect`, and add exponential backoff to reduce reconnect frequency.
  - Apply stricter filters (collection, DID, operation) to reduce event volume.
- **High downstream load or queue buildup:**
  - Throttle or batch events, add durable queues (Redis, RabbitMQ), and scale workers to handle processing load.
  - Consider sampling the feed (e.g., only specific collections or DIDs) to reduce throughput.

**Key Features:**

- **Stream Types**: Repository events (posts, likes, follows) or label updates
- **Filtering**: By collection type (`app.bsky.feed.post`, `app.bsky.feed.like`, etc.), DID, or operation
- **Event Limits**: Set maximum events or run continuously (0 = unlimited)
- **Auto-reconnect**: Automatically reconnect on connection loss

**Common Use Cases:**

- Real-time content moderation
- Custom notification systems
- Analytics and trending topic detection
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
| **Sync**         | getRepo, getRecord, getLatestCommit, getBlob, listBlobs, listRepos, notifyOfUpdate, requestCrawl                                                   |
| **Trigger**      | subscribeRepos, subscribeLabels (real-time WebSocket streaming)                                                                                    |
| **Preferences**  | getPreferences, putPreferences                                                                                                                     |
| **Sync**         | getRepo, getRecord, getRepoStatus, getLatestCommit, getBlob, listBlobs, listRepos, notifyOfUpdate, requestCrawl                                    |

### Comprehensive API Coverage

This node provides extensive coverage of the AT Protocol API, including:

- **Social Operations**: Full post lifecycle, user relationships (follow/block/mute), conversations
- **Content Discovery**: Multiple feed types with pagination, search, suggested content, feed skeletons
- **Data Access**: Direct repository operations and lexicon resolution for advanced use cases
- **Administration**: Sessions, app passwords, invite codes, signing key rotation, moderation tools
- **Advanced Features**: Identity resolution, label queries/apply, repository sync status, analytics

For detailed field descriptions and parameter options, refer to the code under `nodes/Bluesky/*`.

---

## Testing

Automated tests are provided using [Jest](https://jestjs.io/).

```bash
# Install dev dependencies
pnpm install

# Run tests
pnpm test
```

Test files are located in the `__tests__` directory.

---

## Development & Contributing

Contributions are welcome! Please abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

1. Fork the repository & clone locally.
2. Create a feature branch: `git checkout -b feature-name`.
3. Install dependencies: `pnpm install`.
4. Build & lint: `pnpm run build && pnpm run lint`.
5. Run tests: `pnpm test`.
6. Commit & push your changes, then open a Pull Request.

**Code style**: ESLint and Prettier are configured. Run:

```bash
pnpm run lint
pnpm run format
```

### Makefile (developer helper targets)

This repository includes a `Makefile` with convenient developer shortcuts. Run `make help` to list available targets and descriptions.

Common targets:

- `make install` — install dependencies (uses `pnpm install` by default)
- `make deps` — ensure build/test tooling is present (`npm run deps:ensure`)
- `make build` — build TypeScript and assets
- `make dev` — start TypeScript watch mode for iterative development
- `make test` — run the Jest test suite
- `make lint` / `make lintfix` — run ESLint (and apply fixes)
- `make format` / `make format-ts` — run Prettier formatting
- `make pack` — build and create an npm tarball (`npm pack`)
- `make clean` — remove build artifacts

Docker & dev helpers:

- `make docker-build` — build the development Docker image
- `make docker-up` — start the Docker compose stack for development
- `make dev-bind` — run a bind-mounted dev compose (local edits reflected)
- `make dev-plugin` — run the plugin compose (requires a built tarball)

Examples:

```bash
# show available Makefile targets
make help

# install deps and run tests
make install
make test

# run watch build during development
make dev
```

Notes:

- The Makefile forwards to `pnpm` / `npm` scripts defined in `package.json` so you can also run those scripts directly.
- You can override the command variables at invocation time, for example:

```bash
# use a different package manager command if needed
PNPM=yarn make install
```

### TypeScript Configuration

This project uses a dual-typeRoots approach in `tsconfig.json`:

- **`./types`**: Custom type shims providing minimal declarations for editor-only type checking (e.g., `n8n-workflow-shim.d.ts`, `jest.d.ts`, `node-globals.d.ts`)
- **`./node_modules/@types`**: Standard third-party type definitions from pnpm

This configuration allows the project to:

1. Use custom shims for packages that don't provide types or where peer dependencies would cause conflicts
2. Leverage full type definitions from `@types/*` packages for comprehensive type checking
3. Maintain type-safety without forcing all types through custom shims

When adding new dependencies, ensure either:

- The package includes its own types, or
- Add the corresponding `@types/*` package to devDependencies, or
- Create a minimal shim in `./types/` if needed

---

## License

This project is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.

---

## References

- Bluesky API Docs: <https://docs.bsky.app/>
- AT Protocol Docs: <https://atproto.com/>
- n8n Community Nodes Docs: <https://docs.n8n.io/integrations/community-nodes/>
