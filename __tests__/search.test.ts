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
