/**
 * Tests for feedOperations.ts
 * Covers all 11 exported feed functions.
 */
import {
	describeFeedGeneratorOperation,
	getAuthorFeed,
	getFeedGeneratorsOperation,
	getFeedOperation,
	getFeedSkeletonOperation,
	getLikesOperation,
	getPostsOperation,
	getPostThread,
	getRepostedByOperation,
	getSuggestedFeedsOperation,
	getTimeline,
} from '../nodes/Bluesky/V2/feedOperations';

function createMockAgent(): any {
	return {
		getAuthorFeed: jest.fn().mockResolvedValue({
			data: {
				feed: [
					{ post: { uri: 'at://p1' }, reply: null, reason: null, feedContext: null },
					{ post: { uri: 'at://p2' }, reply: null, reason: null, feedContext: null },
				],
				cursor: 'cursor1',
			},
		}),
		getPostThread: jest.fn().mockResolvedValue({
			data: {
				thread: { $type: 'app.bsky.feed.defs#threadViewPost', post: { uri: 'at://p1' } },
			},
		}),
		getTimeline: jest.fn().mockResolvedValue({
			data: {
				feed: [{ post: { uri: 'at://t1' }, reply: null, reason: null, feedContext: null }],
				cursor: 'tlcursor',
			},
		}),
		getPosts: jest.fn().mockResolvedValue({
			data: { posts: [{ uri: 'at://p1', text: 'hello' }] },
		}),
		getLikes: jest.fn().mockResolvedValue({
			data: {
				likes: [{ actor: { did: 'did:plc:liker' }, createdAt: '2025-01-01' }],
				cursor: 'lkcur',
			},
		}),
		getRepostedBy: jest.fn().mockResolvedValue({
			data: { repostedBy: [{ did: 'did:plc:reposter' }], cursor: 'rpcur' },
		}),
		app: {
			bsky: {
				feed: {
					getSuggestedFeeds: jest.fn().mockResolvedValue({
						data: { feeds: [{ uri: 'at://feed1' }], cursor: 'sfcur' },
					}),
					getFeedGenerators: jest.fn().mockResolvedValue({
						data: { feeds: [{ uri: 'at://gen1', displayName: 'Gen1' }] },
					}),
					getFeed: jest.fn().mockResolvedValue({
						data: { feed: [{ post: { uri: 'at://fp1' } }], cursor: 'fcur' },
					}),
					getFeedSkeleton: jest.fn().mockResolvedValue({
						data: {
							feed: [{ post: { uri: 'at://sk1', cid: 'cid1' } }],
							cursor: 'skcur',
						},
					}),
					describeFeedGenerator: jest.fn().mockResolvedValue({
						data: { did: 'did:plc:gen', feeds: [] },
					}),
				},
			},
		},
	};
}

describe('Feed Operations', () => {
	let agent: any;
	beforeEach(() => {
		agent = createMockAgent();
	});

	describe('getAuthorFeed', () => {
		it('should return feed posts and pagination cursor', async () => {
			const result = await getAuthorFeed(agent, 'did:plc:test', 50, 'posts_with_replies');
			expect(agent.getAuthorFeed).toHaveBeenCalledWith({
				actor: 'did:plc:test',
				limit: 50,
				filter: 'posts_with_replies',
				cursor: undefined,
			});
			expect(result.length).toBe(3); // 2 posts + 1 cursor
			expect(result[2].json).toEqual({ cursor: 'cursor1', _pagination: true });
		});

		it('should pass cursor for pagination', async () => {
			await getAuthorFeed(agent, 'did:plc:test', 10, undefined, 'page2');
			expect(agent.getAuthorFeed).toHaveBeenCalledWith(
				expect.objectContaining({ cursor: 'page2' }),
			);
		});
	});

	describe('getPostThread', () => {
		it('should return thread data', async () => {
			const result = await getPostThread(agent, 'at://p1', 6, 80);
			expect(agent.getPostThread).toHaveBeenCalledWith({
				uri: 'at://p1',
				depth: 6,
				parentHeight: 80,
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('post');
		});

		it('should return empty array when thread is null', async () => {
			agent.getPostThread.mockResolvedValue({ data: { thread: null } });
			const result = await getPostThread(agent, 'at://p1');
			expect(result).toEqual([]);
		});
	});

	describe('getTimeline', () => {
		it('should return timeline posts and cursor', async () => {
			const result = await getTimeline(agent, 25);
			expect(agent.getTimeline).toHaveBeenCalledWith({ limit: 25, cursor: undefined });
			expect(result.length).toBe(2); // 1 post + 1 cursor
			expect(result[1].json).toEqual({ cursor: 'tlcursor', _pagination: true });
		});
	});

	describe('getPostsOperation', () => {
		it('should fetch posts by URI', async () => {
			const result = await getPostsOperation(agent, ['at://p1']);
			expect(agent.getPosts).toHaveBeenCalledWith({ uris: ['at://p1'] });
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('uri', 'at://p1');
		});
	});

	describe('getLikesOperation', () => {
		it('should return likes and cursor', async () => {
			const result = await getLikesOperation(agent, 'at://p1', 50);
			expect(agent.getLikes).toHaveBeenCalledWith({ uri: 'at://p1', limit: 50, cursor: undefined });
			expect(result.length).toBe(2); // 1 like + cursor
		});
	});

	describe('getRepostedByOperation', () => {
		it('should return reposters and cursor', async () => {
			const result = await getRepostedByOperation(agent, 'at://p1', 50);
			expect(agent.getRepostedBy).toHaveBeenCalledWith({
				uri: 'at://p1',
				limit: 50,
				cursor: undefined,
			});
			expect(result.length).toBe(2); // 1 reposter + cursor
		});
	});

	describe('getSuggestedFeedsOperation', () => {
		it('should return suggested feeds', async () => {
			const result = await getSuggestedFeedsOperation(agent, 10);
			expect(agent.app.bsky.feed.getSuggestedFeeds).toHaveBeenCalledWith({
				limit: 10,
				cursor: undefined,
			});
			expect(result.length).toBe(2); // 1 feed + cursor
		});
	});

	describe('getFeedGeneratorsOperation', () => {
		it('should return feed generator metadata', async () => {
			const result = await getFeedGeneratorsOperation(agent, ['at://gen1']);
			expect(agent.app.bsky.feed.getFeedGenerators).toHaveBeenCalledWith({ feeds: ['at://gen1'] });
			expect(result).toHaveLength(1);
		});
	});

	describe('getFeedOperation', () => {
		it('should return custom feed posts and cursor', async () => {
			const result = await getFeedOperation(agent, 'at://custom-feed', 25);
			expect(agent.app.bsky.feed.getFeed).toHaveBeenCalledWith({
				feed: 'at://custom-feed',
				limit: 25,
				cursor: undefined,
			});
			expect(result.length).toBe(2); // 1 post + cursor
		});
	});

	describe('getFeedSkeletonOperation', () => {
		it('should return skeleton items and cursor', async () => {
			const result = await getFeedSkeletonOperation(agent, 'at://custom-feed', 25);
			expect(agent.app.bsky.feed.getFeedSkeleton).toHaveBeenCalledWith({
				feed: 'at://custom-feed',
				limit: 25,
				cursor: undefined,
			});
			expect(result.length).toBe(2); // 1 skeleton + cursor
		});

		it('should pass cursor for pagination', async () => {
			await getFeedSkeletonOperation(agent, 'at://custom-feed', 25, 'cursor123');
			expect(agent.app.bsky.feed.getFeedSkeleton).toHaveBeenCalledWith(
				expect.objectContaining({ feed: 'at://custom-feed', limit: 25, cursor: 'cursor123' }),
			);
		});
	});

	describe('describeFeedGeneratorOperation', () => {
		it('should return feed generator description', async () => {
			const result = await describeFeedGeneratorOperation(agent);
			expect(agent.app.bsky.feed.describeFeedGenerator).toHaveBeenCalled();
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('did');
		});
	});
});
