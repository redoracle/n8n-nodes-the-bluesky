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
- **Feeds**: Author feeds, timelines, thread contexts, list feeds, suggested feeds, and pagination support.
- **Search**: Search users and posts with filtering.
- **Lists**: Create and manage lists, add/remove users, list feeds.
- **Notifications**: Fetch notifications, unread counts, mark as seen.
- **Authentication**: Session management (create, refresh, delete) and app password creation.
- **User Management**: Profile operations (get, update), follow/unfollow, block/unblock, mute/unmute.
- **Chat**: Full conversation and message management (list, get, send, delete, mute).
- **Repository**: Direct record operations (create, update, delete, list) and blob management.
- **Moderation**: Create reports for content or accounts.
- **Identity**: Resolve handles and DIDs.
- **Preferences**: Get and update user preferences.
- **Sync**: Repository synchronization and crawling operations.
- **Labels**: Query content labels.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v14 or higher
- [npm](https://www.npmjs.com/) v6 or higher
- An [n8n](https://n8n.io/) instance (self-hosted)

---

## Installation

```bash
# From your n8n project root:
npm install n8n-nodes-the-bluesky
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

---

## Available Resources & Operations

| Resource      | Operations                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| **Auth**      | createSession, refreshSession, deleteSession, createAppPassword                                                 |
| **Post**      | create, delete, reply, quote, repost, like, unlike, get                                                         |
| **Feed**      | getAuthorFeed, getTimeline, getPostThread, getPosts, getLikes, getRepostedBy, getSuggestedFeeds, getFeedGenerators, getFeed, describeFeedGenerator |
| **User**      | getProfile, getProfiles, updateProfile, follow, unfollow, block, unblock, mute, unmute, listFollowers, listFollows, getSuggestions |
| **Search**    | searchUsers, searchPosts                                                                                        |
| **List**      | create, update, delete, addUser, removeUser, get, getList, getListFeed                                          |
| **Notification** | listNotifications, getUnreadCount, updateSeen                                                                 |
| **Chat**      | listConvos, getConvo, getConvoForMembers, leaveConvo, muteConvo, unmuteConvo, getMessages, sendMessage, deleteMessage, getLog |
| **Graph**     | muteThread, unmuteThread, getBlocks, getMutes                                                                   |
| **Repo**      | createRecord, putRecord, deleteRecord, getRecord, listRecords, applyWrites, uploadBlob                          |
| **Moderation** | createReport                                                                                                   |
| **Label**     | queryLabels                                                                                                     |
| **Identity**  | resolveHandle, resolveDid, resolveIdentity                                                                      |
| **Preferences** | getPreferences, putPreferences                                                                                |
| **Sync**      | getRepo, getRecord, getLatestCommit, getBlob, listBlobs, listRepos, notifyOfUpdate, requestCrawl               |

### Comprehensive API Coverage

This node provides extensive coverage of the AT Protocol API, including:

- **Social Operations**: Full post lifecycle, user relationships (follow/block/mute), conversations
- **Content Discovery**: Multiple feed types with pagination, search, suggested content
- **Data Access**: Direct repository operations for advanced use cases
- **Administration**: Session management, app passwords, moderation tools
- **Advanced Features**: Identity resolution, label queries, repository synchronization

For detailed field descriptions and parameter options, refer to the code under `nodes/Bluesky/*`.

---

## Testing

Automated tests are provided using [Jest](https://jestjs.io/).

```bash
# Install dev dependencies
npm install

# Run tests
npm test
```

Test files are located in the `__tests__` directory.

---

## Development & Contributing

Contributions are welcome! Please abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

1. Fork the repository & clone locally.
2. Create a feature branch: `git checkout -b feature-name`.
3. Install dependencies: `npm install`.
4. Build & lint: `npm run build && npm run lint`.
5. Run tests: `npm test`.
6. Commit & push your changes, then open a Pull Request.

**Code style**: ESLint and Prettier are configured. Run:

```bash
npm run lint
npm run format
```

### TypeScript Configuration

This project uses a dual-typeRoots approach in `tsconfig.json`:

- **`./types`**: Custom type shims providing minimal declarations for editor-only type checking (e.g., `n8n-workflow-shim.d.ts`, `jest.d.ts`, `node-globals.d.ts`)
- **`./node_modules/@types`**: Standard third-party type definitions from npm

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
