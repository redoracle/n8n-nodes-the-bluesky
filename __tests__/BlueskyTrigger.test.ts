import { BlueskyTrigger } from '../nodes/BlueskyTrigger/BlueskyTrigger.node';
import { matchesFilters, parseFirehoseMessage } from '../nodes/BlueskyTrigger/firehoseParser';

describe('BlueskyTrigger', () => {
	describe('Node Description', () => {
		it('should have correct basic properties', () => {
			const trigger = new BlueskyTrigger();

			expect(trigger.description.displayName).toBe('Bluesky Trigger');
			expect(trigger.description.name).toBe('blueskyTrigger');
			expect(trigger.description.group).toContain('trigger');
			expect(trigger.description.version).toBe(1);
		});

		it('should have correct credentials configuration', () => {
			const trigger = new BlueskyTrigger();
			const credentials = trigger.description.credentials || [];

			expect(credentials).toHaveLength(1);
			expect(credentials[0].name).toBe('blueskyApi');
			expect(credentials[0].required).toBe(false);
		});

		it('should have correct properties', () => {
			const trigger = new BlueskyTrigger();
			const properties = trigger.description.properties || [];

			const propertyNames = properties.map((p: any) => p.name);
			expect(propertyNames).toContain('stream');
			expect(propertyNames).toContain('serviceEndpoint');
			expect(propertyNames).toContain('maxEvents');
			expect(propertyNames).toContain('filterCollection');
			expect(propertyNames).toContain('filterDid');
			expect(propertyNames).toContain('filterOperation');
			expect(propertyNames).toContain('autoReconnect');
			expect(propertyNames).toContain('reconnectInterval');
		});

		it('should have correct stream options', () => {
			const trigger = new BlueskyTrigger();
			const properties = trigger.description.properties || [];

			const streamProperty = properties.find((p: any) => p.name === 'stream');
			expect(streamProperty).toBeDefined();
			expect(streamProperty?.type).toBe('options');

			// Explicitly assert that options property exists and is an array
			expect('options' in streamProperty!).toBe(true);
			expect(streamProperty!.options).toBeDefined();
			expect(Array.isArray(streamProperty!.options)).toBe(true);

			const optionValues = streamProperty!.options.map((o: any) => o.value);
			expect(optionValues).toContain('subscribeRepos');
			expect(optionValues).toContain('subscribeLabels');
		});
	});

	describe('Firehose Parser', () => {
		it('should parse valid firehose message', () => {
			const message = {
				$type: 'com.atproto.sync.subscribeRepos#commit',
				seq: 12345,
				rebase: false,
				tooBig: false,
				repo: 'did:plc:example123',
				commit: {
					cid: 'bafyexample',
					rev: 'rev1',
				},
				time: '2024-01-01T00:00:00.000Z',
				ops: [
					{
						op: 'create',
						path: 'app.bsky.feed.post/3k2j3h4',
						cid: 'bafypostcid',
						record: {
							text: 'Hello world!',
							createdAt: '2024-01-01T00:00:00.000Z',
						},
					},
				],
			};

			const buffer = Buffer.from(JSON.stringify(message));
			const parsed = parseFirehoseMessage(buffer);

			expect(parsed).not.toBeNull();
			expect(parsed?.type).toBe('com.atproto.sync.subscribeRepos#commit');
			expect(parsed?.seq).toBe(12345);
			expect(parsed?.repo).toBe('did:plc:example123');
			expect(parsed?.operations).toHaveLength(1);
			expect(parsed?.operations[0].action).toBe('create');
			expect(parsed?.operations[0].collection).toBe('app.bsky.feed.post');
			expect(parsed?.operations[0].rkey).toBe('3k2j3h4');
		});

		it('should return null for invalid message', () => {
			const buffer = Buffer.from('invalid json {');
			const parsed = parseFirehoseMessage(buffer);

			expect(parsed).toBeNull();
		});

		it('should parse message with multiple operations', () => {
			const message = {
				$type: 'com.atproto.sync.subscribeRepos#commit',
				seq: 12346,
				rebase: false,
				tooBig: false,
				repo: 'did:plc:example456',
				commit: {
					cid: 'bafymulti',
					rev: 'rev2',
				},
				time: '2024-01-01T00:01:00.000Z',
				ops: [
					{
						op: 'create',
						path: 'app.bsky.feed.post/post1',
						cid: 'cid1',
					},
					{
						op: 'create',
						path: 'app.bsky.feed.like/like1',
						cid: 'cid2',
					},
				],
			};

			const buffer = Buffer.from(JSON.stringify(message));
			const parsed = parseFirehoseMessage(buffer);

			expect(parsed?.operations).toHaveLength(2);
			expect(parsed?.operations[0].collection).toBe('app.bsky.feed.post');
			expect(parsed?.operations[1].collection).toBe('app.bsky.feed.like');
		});

		it('should handle valid JSON missing ops property (operations empty)', () => {
			const message = {
				$type: 'com.atproto.sync.subscribeRepos#commit',
				seq: 20000,
				rebase: false,
				tooBig: false,
				repo: 'did:plc:missingops',
				commit: { cid: 'cidx', rev: 'revx' },
				time: '2024-01-02T00:00:00.000Z',
				// note: no 'ops' property
			};

			const buffer = Buffer.from(JSON.stringify(message));
			const parsed = parseFirehoseMessage(buffer);

			expect(parsed).not.toBeNull();
			expect(parsed?.operations).toHaveLength(0);
		});

		it('should handle message with empty ops array (operations empty)', () => {
			const message = {
				$type: 'com.atproto.sync.subscribeRepos#commit',
				seq: 20001,
				rebase: false,
				tooBig: false,
				repo: 'did:plc:emptyops',
				commit: { cid: 'cidx2', rev: 'revx2' },
				time: '2024-01-02T00:01:00.000Z',
				ops: [],
			};

			const buffer = Buffer.from(JSON.stringify(message));
			const parsed = parseFirehoseMessage(buffer);

			expect(parsed).not.toBeNull();
			expect(parsed?.operations).toHaveLength(0);
		});

		it('should reject operations with malformed path values', () => {
			const message = {
				$type: 'com.atproto.sync.subscribeRepos#commit',
				seq: 20002,
				rebase: false,
				tooBig: false,
				repo: 'did:plc:badpath',
				commit: { cid: 'cidx3', rev: 'revx3' },
				time: '2024-01-02T00:02:00.000Z',
				ops: [
					{ op: 'create', path: 'invalidpathwithoutslash', cid: 'c1' },
					{ op: 'create', path: 'too/many/segments/extra', cid: 'c2' },
				],
			};

			const buffer = Buffer.from(JSON.stringify(message));
			const parsed = parseFirehoseMessage(buffer);

			expect(parsed).not.toBeNull();
			expect(parsed?.operations).toHaveLength(0);
		});
	});

	describe('Message Filtering', () => {
		const createTestMessage = (overrides: any = {}) => ({
			type: 'com.atproto.sync.subscribeRepos#commit',
			seq: 12345,
			repo: 'did:plc:test123',
			time: '2024-01-01T00:00:00.000Z',
			commit: { cid: 'test', rev: 'test' },
			operations: [
				{
					action: 'create',
					collection: 'app.bsky.feed.post',
					rkey: 'test',
				},
			],
			rebase: false,
			tooBig: false,
			...overrides,
		});

		it('should match message with no filters', () => {
			const message = createTestMessage();
			expect(matchesFilters(message, {})).toBe(true);
		});

		it('should filter by repo', () => {
			const message = createTestMessage();

			expect(matchesFilters(message, { repo: 'did:plc:test123' })).toBe(true);
			expect(matchesFilters(message, { repo: 'did:plc:other' })).toBe(false);
		});

		it('should filter by collection', () => {
			const message = createTestMessage();

			expect(matchesFilters(message, { collection: 'app.bsky.feed.post' })).toBe(true);
			expect(matchesFilters(message, { collection: 'post' })).toBe(true); // partial match
			expect(matchesFilters(message, { collection: 'like' })).toBe(false);
		});

		it('should filter by action', () => {
			const message = createTestMessage();

			expect(matchesFilters(message, { action: 'create' })).toBe(true);
			expect(matchesFilters(message, { action: 'delete' })).toBe(false);
		});

		it('should handle multiple operations with filters', () => {
			const message = createTestMessage({
				operations: [
					{ action: 'create', collection: 'app.bsky.feed.post', rkey: 'post1' },
					{ action: 'delete', collection: 'app.bsky.feed.like', rkey: 'like1' },
				],
			});

			expect(matchesFilters(message, { collection: 'post' })).toBe(true);
			expect(matchesFilters(message, { collection: 'like' })).toBe(true);
			expect(matchesFilters(message, { collection: 'follow' })).toBe(false);
			expect(matchesFilters(message, { action: 'create' })).toBe(true);
			expect(matchesFilters(message, { action: 'delete' })).toBe(true);
			expect(matchesFilters(message, { action: 'update' })).toBe(false);
		});

		it('should combine multiple filters', () => {
			const message = createTestMessage();

			expect(
				matchesFilters(message, {
					repo: 'did:plc:test123',
					collection: 'post',
					action: 'create',
				}),
			).toBe(true);

			expect(
				matchesFilters(message, {
					repo: 'did:plc:test123',
					collection: 'like',
				}),
			).toBe(false);

			expect(
				matchesFilters(message, {
					repo: 'did:plc:other',
					collection: 'post',
				}),
			).toBe(false);
		});
	});
});
