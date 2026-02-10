/**
 * Tests for userOperations.ts
 * Covers: muteOperation, unmuteOperation, getProfileOperation, getProfilesOperation,
 *         followOperation, unfollowOperation, blockOperation, unblockOperation,
 *         listAllFollowersOperation, listFollowersOperation, listAllFollowsOperation,
 *         listFollowsOperation
 * Note: updateProfileOperation requires IExecuteFunctions context (this-bound).
 */
import {
	blockOperation,
	followOperation,
	getProfileOperation,
	getProfilesOperation,
	listAllFollowersOperation,
	listAllFollowsOperation,
	listFollowersOperation,
	listFollowsOperation,
	muteOperation,
	unblockOperation,
	unfollowOperation,
	unmuteOperation,
} from '../nodes/Bluesky/V2/userOperations';

function createMockAgent(overrides: Record<string, any> = {}): any {
	return {
		mute: jest.fn().mockResolvedValue({}),
		unmute: jest.fn().mockResolvedValue({}),
		getProfile: jest.fn().mockResolvedValue({
			data: { did: 'did:plc:alice', handle: 'alice.bsky.social', displayName: 'Alice' },
		}),
		getProfiles: jest.fn().mockResolvedValue({
			data: {
				profiles: [
					{ did: 'did:plc:alice', handle: 'alice.bsky.social' },
					{ did: 'did:plc:bob', handle: 'bob.bsky.social' },
				],
			},
		}),
		follow: jest
			.fn()
			.mockResolvedValue({ uri: 'at://did:plc:me/app.bsky.graph.follow/abc', cid: 'bafyfollow' }),
		deleteFollow: jest.fn().mockResolvedValue(undefined),
		session: { did: 'did:plc:me' },
		app: {
			bsky: {
				graph: {
					block: {
						create: jest
							.fn()
							.mockResolvedValue({ uri: 'at://did:plc:me/app.bsky.graph.block/xyz' }),
						delete: jest.fn().mockResolvedValue(undefined),
					},
					getFollowers: jest.fn().mockResolvedValue({
						data: {
							followers: [{ did: 'did:plc:f1', handle: 'f1.bsky.social' }],
							cursor: 'fcur',
						},
					}),
					getFollows: jest.fn().mockResolvedValue({
						data: {
							follows: [{ did: 'did:plc:fw1', handle: 'fw1.bsky.social' }],
							cursor: 'fwcur',
						},
					}),
				},
			},
		},
		...overrides,
	};
}

describe('User Operations', () => {
	let agent: any;
	beforeEach(() => {
		agent = createMockAgent();
	});

	describe('muteOperation', () => {
		it('should mute a user by DID', async () => {
			const result = await muteOperation(agent, 'did:plc:target');
			expect(agent.mute).toHaveBeenCalledWith('did:plc:target');
			expect(result).toHaveLength(1);
		});
	});

	describe('unmuteOperation', () => {
		it('should unmute a user by DID', async () => {
			const result = await unmuteOperation(agent, 'did:plc:target');
			expect(agent.unmute).toHaveBeenCalledWith('did:plc:target');
			expect(result).toHaveLength(1);
		});
	});

	describe('getProfileOperation', () => {
		it('should return profile data for an actor', async () => {
			const result = await getProfileOperation(agent, 'alice.bsky.social');
			expect(agent.getProfile).toHaveBeenCalledWith({ actor: 'alice.bsky.social' });
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('did', 'did:plc:alice');
			expect(result[0].json).toHaveProperty('handle', 'alice.bsky.social');
		});
	});

	describe('getProfilesOperation', () => {
		it('should return multiple profiles', async () => {
			const result = await getProfilesOperation(agent, ['alice.bsky.social', 'bob.bsky.social']);
			expect(agent.getProfiles).toHaveBeenCalledWith({
				actors: ['alice.bsky.social', 'bob.bsky.social'],
			});
			expect(result).toHaveLength(2);
		});
	});

	describe('followOperation', () => {
		it('should follow a user and return uri+cid', async () => {
			const result = await followOperation(agent, 'did:plc:target');
			expect(agent.follow).toHaveBeenCalledWith('did:plc:target');
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('uri');
			expect(result[0].json).toHaveProperty('cid');
		});
	});

	describe('unfollowOperation', () => {
		it('should unfollow and return deleted status', async () => {
			const followUri = 'at://did:plc:me/app.bsky.graph.follow/abc';
			const result = await unfollowOperation(agent, followUri);
			expect(agent.deleteFollow).toHaveBeenCalledWith(followUri);
			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual({ deleted: true, uri: followUri });
		});
	});

	describe('blockOperation', () => {
		it('should block a user and return block URI', async () => {
			const result = await blockOperation(agent, 'did:plc:target');
			expect(agent.app.bsky.graph.block.create).toHaveBeenCalledWith(
				{ repo: 'did:plc:me' },
				expect.objectContaining({ subject: 'did:plc:target' }),
			);
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('uri');
		});
	});

	describe('unblockOperation', () => {
		it('should unblock a user by block record URI', async () => {
			const blockUri = 'at://did:plc:me/app.bsky.graph.block/testrkey';
			const result = await unblockOperation(agent, blockUri);
			expect(agent.app.bsky.graph.block.delete).toHaveBeenCalledWith({
				repo: 'did:plc:me',
				rkey: 'testrkey',
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual({ uri: blockUri });
		});
	});

	describe('listFollowersOperation', () => {
		it('should return followers with pagination', async () => {
			const result = await listFollowersOperation(agent, 'alice.bsky.social', 50);
			expect(agent.app.bsky.graph.getFollowers).toHaveBeenCalledWith({
				actor: 'alice.bsky.social',
				limit: 50,
				cursor: undefined,
			});
			expect(result.length).toBe(2); // 1 follower + 1 cursor
		});
	});

	describe('listFollowsOperation', () => {
		it('should return follows with pagination', async () => {
			const result = await listFollowsOperation(agent, 'alice.bsky.social', 50);
			expect(agent.app.bsky.graph.getFollows).toHaveBeenCalledWith({
				actor: 'alice.bsky.social',
				limit: 50,
				cursor: undefined,
			});
			expect(result.length).toBe(2); // 1 follow + 1 cursor
		});
	});

	describe('listAllFollowersOperation', () => {
		it('should paginate through all followers', async () => {
			// First page returns followers with cursor, second page no cursor
			agent.app.bsky.graph.getFollowers
				.mockResolvedValueOnce({
					data: {
						followers: [{ did: 'did:plc:f1' }, { did: 'did:plc:f2' }],
						cursor: 'page2',
					},
				})
				.mockResolvedValueOnce({
					data: { followers: [{ did: 'did:plc:f3' }], cursor: undefined },
				});

			const result = await listAllFollowersOperation(agent, 'alice.bsky.social', 1000, 100);
			expect(agent.app.bsky.graph.getFollowers).toHaveBeenCalledTimes(2);
			expect(result).toHaveLength(3);
		});

		it('should respect maxResults limit', async () => {
			agent.app.bsky.graph.getFollowers.mockResolvedValue({
				data: {
					followers: [{ did: 'did:plc:f1' }, { did: 'did:plc:f2' }],
					cursor: 'next',
				},
			});
			const result = await listAllFollowersOperation(agent, 'alice.bsky.social', 1);
			expect(result).toHaveLength(1);
		});
	});

	describe('listAllFollowsOperation', () => {
		it('should paginate through all follows', async () => {
			agent.app.bsky.graph.getFollows
				.mockResolvedValueOnce({
					data: { follows: [{ did: 'did:plc:fw1' }], cursor: 'next' },
				})
				.mockResolvedValueOnce({
					data: { follows: [{ did: 'did:plc:fw2' }], cursor: undefined },
				});

			const result = await listAllFollowsOperation(agent, 'alice.bsky.social', 1000, 100);
			expect(agent.app.bsky.graph.getFollows).toHaveBeenCalledTimes(2);
			expect(result).toHaveLength(2);
		});
	});
});
