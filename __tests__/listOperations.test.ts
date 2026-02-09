/**
 * Tests for listOperations.ts
 * Covers: createListOperation, updateListOperation, deleteListOperation,
 *         getListsOperation, getListFeedOperation, addUserToListOperation,
 *         removeUserFromListOperation
 *
 * Note: The existing list.test.ts only tests listProperties definitions.
 *       This file tests the actual operation functions.
 */
import {
	addUserToListOperation,
	createListOperation,
	deleteListOperation,
	getListFeedOperation,
	getListsOperation,
	removeUserFromListOperation,
	updateListOperation,
} from '../nodes/Bluesky/V2/listOperations';

function createMockAgent(): any {
	return {
		session: { did: 'did:plc:me' },
		com: {
			atproto: {
				repo: {
					createRecord: jest.fn().mockImplementation((params: any) => {
						const collection = params?.collection ?? 'unknown';
						const repo = params?.repo ?? 'did:plc:me';
						const tid = 'tid1';
						return Promise.resolve({
							data: { uri: `at://${repo}/${collection}/${tid}`, cid: `bafycreated-${collection}` },
						});
					}),
					getRecord: jest.fn().mockResolvedValue({
						data: {
							value: {
								$type: 'app.bsky.graph.list',
								name: 'Old Name',
								purpose: 'app.bsky.graph.defs#curatelist',
								description: 'old desc',
								createdAt: '2025-01-01T00:00:00Z',
							},
						},
					}),
					putRecord: jest.fn().mockResolvedValue({
						data: { cid: 'bafyupdated' },
					}),
					deleteRecord: jest.fn().mockResolvedValue(undefined),
				},
			},
		},
		app: {
			bsky: {
				graph: {
					getLists: jest.fn().mockResolvedValue({
						data: {
							lists: [
								{ uri: 'at://list1', name: 'My List', purpose: 'app.bsky.graph.defs#curatelist' },
								{ uri: 'at://list2', name: 'Mod List', purpose: 'app.bsky.graph.defs#modlist' },
							],
							cursor: 'listcur',
						},
					}),
				},
				feed: {
					getListFeed: jest.fn().mockResolvedValue({
						data: {
							feed: [
								{ post: { uri: 'at://post1', text: 'hello' } },
								{ post: { uri: 'at://post2', text: 'world' } },
							],
							cursor: 'feedcur',
						},
					}),
				},
			},
		},
	};
}

describe('List Operations', () => {
	let agent: any;
	beforeEach(() => {
		agent = createMockAgent();
	});

	describe('createListOperation', () => {
		it('should create a new curate list', async () => {
			const result = await createListOperation(
				agent,
				'My List',
				'app.bsky.graph.defs#curatelist',
				'A test list',
			);
			expect(agent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
				expect.objectContaining({
					repo: 'did:plc:me',
					collection: 'app.bsky.graph.list',
					record: expect.objectContaining({
						$type: 'app.bsky.graph.list',
						name: 'My List',
						purpose: 'app.bsky.graph.defs#curatelist',
						description: 'A test list',
					}),
				}),
			);
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('uri');
			expect(result[0].json).toHaveProperty('cid');
			expect(result[0].json).toHaveProperty('name', 'My List');
		});

		it('should use empty description when not provided', async () => {
			await createListOperation(agent, 'No Desc', 'app.bsky.graph.defs#modlist');
			expect(agent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
				expect.objectContaining({
					record: expect.objectContaining({ description: '' }),
				}),
			);
		});
	});

	describe('updateListOperation', () => {
		it('should update an existing list preserving createdAt', async () => {
			const listUri = 'at://did:plc:me/app.bsky.graph.list/rkey1';
			const result = await updateListOperation(
				agent,
				listUri,
				'New Name',
				'app.bsky.graph.defs#curatelist',
				'new desc',
			);
			// Should first get current record
			expect(agent.com.atproto.repo.getRecord).toHaveBeenCalledWith(
				expect.objectContaining({
					repo: 'did:plc:me',
					collection: 'app.bsky.graph.list',
					rkey: 'rkey1',
				}),
			);
			// Then put updated record with preserved createdAt
			expect(agent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
				expect.objectContaining({
					record: expect.objectContaining({
						name: 'New Name',
						createdAt: '2025-01-01T00:00:00Z',
					}),
				}),
			);
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('name', 'New Name');
		});
	});

	describe('deleteListOperation', () => {
		it('should delete a list and return confirmation', async () => {
			const listUri = 'at://did:plc:me/app.bsky.graph.list/rkey1';
			const result = await deleteListOperation(agent, listUri);
			expect(agent.com.atproto.repo.deleteRecord).toHaveBeenCalledWith(
				expect.objectContaining({
					repo: 'did:plc:me',
					collection: 'app.bsky.graph.list',
					rkey: 'rkey1',
				}),
			);
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('deleted', true);
		});
	});

	describe('getListsOperation', () => {
		it('should get all lists for a user', async () => {
			const result = await getListsOperation(agent, 'alice.bsky.social', 50);
			expect(agent.app.bsky.graph.getLists).toHaveBeenCalledWith(
				expect.objectContaining({ actor: 'alice.bsky.social', limit: 50 }),
			);
			expect(result.length).toBe(3); // 2 lists + 1 cursor
			expect(result[0].json).toHaveProperty('name', 'My List');
			expect(result[2].json).toHaveProperty('cursor', 'listcur');
		});

		it('should pass cursor for pagination', async () => {
			await getListsOperation(agent, 'alice.bsky.social', 50, 'page2');
			expect(agent.app.bsky.graph.getLists).toHaveBeenCalledWith(
				expect.objectContaining({ cursor: 'page2' }),
			);
		});

		it('should return empty array when no lists exist', async () => {
			agent.app.bsky.graph.getLists.mockResolvedValueOnce({
				data: { lists: [] },
			});
			const result = await getListsOperation(agent, 'empty.bsky');
			expect(result).toHaveLength(0);
		});
	});

	describe('getListFeedOperation', () => {
		it('should get posts from a list feed', async () => {
			const result = await getListFeedOperation(agent, 'at://list/uri', 50);
			expect(agent.app.bsky.feed.getListFeed).toHaveBeenCalledWith(
				expect.objectContaining({ list: 'at://list/uri', limit: 50 }),
			);
			expect(result.length).toBe(3); // 2 feed items + 1 cursor
		});

		it('should pass cursor for pagination', async () => {
			await getListFeedOperation(agent, 'at://list', 25, 'fc2');
			expect(agent.app.bsky.feed.getListFeed).toHaveBeenCalledWith(
				expect.objectContaining({ cursor: 'fc2' }),
			);
		});

		it('should return empty array when feed has no posts', async () => {
			agent.app.bsky.feed.getListFeed.mockResolvedValueOnce({ data: { feed: [] } });
			const result = await getListFeedOperation(agent, 'at://empty/list');
			expect(agent.app.bsky.feed.getListFeed).toHaveBeenCalledWith(
				expect.objectContaining({ list: 'at://empty/list' }),
			);
			expect(result).toHaveLength(0);
		});
	});

	describe('addUserToListOperation', () => {
		it('should add a user to a list', async () => {
			const result = await addUserToListOperation(agent, 'at://listUri', 'did:plc:newuser');
			expect(agent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
				expect.objectContaining({
					repo: 'did:plc:me',
					collection: 'app.bsky.graph.listitem',
					record: expect.objectContaining({
						$type: 'app.bsky.graph.listitem',
						subject: 'did:plc:newuser',
						list: 'at://listUri',
					}),
				}),
			);
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('uri');
		});
	});

	describe('removeUserFromListOperation', () => {
		it('should remove a user from a list via list item URI', async () => {
			const itemUri = 'at://did:plc:me/app.bsky.graph.listitem/itemrkey';
			const result = await removeUserFromListOperation(agent, itemUri);
			expect(agent.com.atproto.repo.deleteRecord).toHaveBeenCalledWith(
				expect.objectContaining({
					repo: 'did:plc:me',
					collection: 'app.bsky.graph.listitem',
					rkey: 'itemrkey',
				}),
			);
			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual({ uri: itemUri, deleted: true });
		});
	});
});
