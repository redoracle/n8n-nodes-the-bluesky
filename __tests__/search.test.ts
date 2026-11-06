import { INodeProperties, INodeTypeBaseDescription } from 'n8n-workflow';
import { BlueskyV2 } from '../nodes/Bluesky/V2/BlueskyV2.class';
import { searchPostsOperation, searchUsersOperation } from '../nodes/Bluesky/V2/searchOperations';

describe('Bluesky V2 - Search Properties', () => {
	const baseDescription = {
		displayName: 'Bluesky',
		name: 'bluesky',
		icon: 'file:bluesky.svg',
		group: ['transform'],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Bluesky social platform',
		defaultVersion: 2,
	} as unknown as INodeTypeBaseDescription;

	test('should define search operations and query fields', () => {
		const node = new BlueskyV2(baseDescription);
		const props = node.description.properties as INodeProperties[];

		const opProp = props.find(
			(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('search'),
		);
		expect(opProp).toBeDefined();

		const options = (opProp?.options as Array<{ value?: string }>) || [];
		const values = options.map((o) => o.value);
		expect(values).toContain('searchUsers');
		expect(values).toContain('searchPosts');

		const qProp = props.find((p) => p.name === 'q');
		expect(qProp).toBeDefined();
		expect(qProp?.required).toBe(true);
	});
});

describe('Bluesky V2 - Search Operations', () => {
	it('searchUsersOperation should map results to output items', async () => {
		const agent = {
			app: {
				bsky: {
					actor: {
						searchActors: jest.fn().mockResolvedValue({
							data: { actors: [{ did: 'did:plc:123', handle: 'a.bsky.social' }] },
						}),
					},
				},
			},
		} as unknown as Parameters<typeof searchUsersOperation>[0];

		const results = await searchUsersOperation(agent, 'a', 10);
		expect(results).toHaveLength(1);
		expect(results[0].json).toEqual({ did: 'did:plc:123', handle: 'a.bsky.social' });
	});

	it('searchPostsOperation should map results to output items', async () => {
		const agent = {
			app: {
				bsky: {
					feed: {
						searchPosts: jest.fn().mockResolvedValue({
							data: { posts: [{ uri: 'at://post/1', text: 'hello' }] },
						}),
					},
				},
			},
		} as unknown as Parameters<typeof searchPostsOperation>[0];

		const results = await searchPostsOperation(agent, 'hello', 5);
		expect(results).toHaveLength(1);
		expect(results[0].json).toEqual({ uri: 'at://post/1', text: 'hello' });
	});
});

// Contract checks: verify arguments, results, and failures rather than only call counts.
describe('Search operation failure boundaries', () => {
	it('passes the author filter and returns exact post views', async () => {
		const searchPosts = jest.fn().mockResolvedValue({
			data: { posts: [{ uri: 'at://did:plc:author/app.bsky.feed.post/1', cid: 'bafycid', author: { did: 'did:plc:author' } }] },
		});
		const agent = { app: { bsky: { feed: { searchPosts } } } } as unknown as Parameters<typeof searchPostsOperation>[0];

		const items = await searchPostsOperation(agent, 'release', 15, 'did:plc:author');
		expect(searchPosts).toHaveBeenCalledTimes(1);
		expect(searchPosts).toHaveBeenCalledWith({
			q: 'release',
			limit: 15,
			author: 'did:plc:author',
		});
		expect(items.map((item) => item.json)).toEqual([
			{ uri: 'at://did:plc:author/app.bsky.feed.post/1', cid: 'bafycid', author: { did: 'did:plc:author' } },
		]);
	});

	it('propagates search API rate limits instead of returning empty results', async () => {
		const searchPosts = jest.fn().mockRejectedValue(new Error('RateLimitExceeded (429)'));
		const agent = { app: { bsky: { feed: { searchPosts } } } } as unknown as Parameters<typeof searchPostsOperation>[0];
		await expect(searchPostsOperation(agent, 'news', 10))
			.rejects.toThrow('Error searching posts: Error: RateLimitExceeded (429)');
		expect(searchPosts).toHaveBeenCalledTimes(1);
	});

	it('returns no user entries when the service has no matches', async () => {
		const searchActors = jest.fn().mockResolvedValue({ data: { actors: [] } });
		const agent = { app: { bsky: { actor: { searchActors } } } } as unknown as Parameters<typeof searchUsersOperation>[0];
		const items = await searchUsersOperation(agent, 'unmatched-query', 10);
		expect(items).toEqual([]);
		expect(searchActors).toHaveBeenCalledWith({ q: 'unmatched-query', limit: 10 });
	});

	it('does not misreport an authentication failure as an empty user search', async () => {
		const searchActors = jest.fn().mockRejectedValue(new Error('AuthenticationRequired (401)'));
		const agent = { app: { bsky: { actor: { searchActors } } } } as unknown as Parameters<typeof searchUsersOperation>[0];
		await expect(searchUsersOperation(agent, 'private-account', 25))
			.rejects.toThrow('Error searching users: Error: AuthenticationRequired (401)');
		expect(searchActors).toHaveBeenCalledTimes(1);
	});
});
