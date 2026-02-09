/**
 * Tests for postOperations.ts
 * Covers: deletePostOperation, likeOperation, deleteLikeOperation,
 *         repostOperation, deleteRepostOperation, quoteOperation
 * Note: postOperation and replyOperation require IExecuteFunctions context (this-bound)
 *       and are tested at integration level only.
 */
import {
	deleteLikeOperation,
	deletePostOperation,
	deleteRepostOperation,
	likeOperation,
	quoteOperation,
	repostOperation,
} from '../nodes/Bluesky/V2/postOperations';

// --- Mock agent factory ---
function createMockAgent(overrides: Record<string, any> = {}): any {
	return {
		post: jest
			.fn()
			.mockResolvedValue({ uri: 'at://did:plc:test/app.bsky.feed.post/abc', cid: 'bafyabc' }),
		deletePost: jest.fn().mockResolvedValue(undefined),
		like: jest
			.fn()
			.mockResolvedValue({ uri: 'at://did:plc:test/app.bsky.feed.like/abc', cid: 'bafylike' }),
		deleteLike: jest.fn().mockResolvedValue(undefined),
		repost: jest
			.fn()
			.mockResolvedValue({ uri: 'at://did:plc:test/app.bsky.feed.repost/abc', cid: 'bafyrepost' }),
		deleteRepost: jest.fn().mockResolvedValue(undefined),
		getPostThread: jest.fn().mockResolvedValue({
			data: {
				thread: {
					post: {
						record: {},
					},
				},
			},
		}),
		...overrides,
	};
}

describe('Post Operations', () => {
	describe('deletePostOperation', () => {
		it('should delete a post and return the uri', async () => {
			const agent = createMockAgent();
			const uri = 'at://did:plc:test/app.bsky.feed.post/abc';
			const result = await deletePostOperation(agent, uri);
			expect(agent.deletePost).toHaveBeenCalledWith(uri);
			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual({ uri });
		});
	});

	describe('likeOperation', () => {
		it('should like a post and return uri+cid', async () => {
			const agent = createMockAgent();
			const result = await likeOperation(agent, 'at://post/uri', 'bafycid');
			expect(agent.like).toHaveBeenCalledWith('at://post/uri', 'bafycid');
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('uri');
			expect(result[0].json).toHaveProperty('cid');
		});
	});

	describe('deleteLikeOperation', () => {
		it('should unlike a post and return the uri', async () => {
			const agent = createMockAgent();
			const uri = 'at://did:plc:test/app.bsky.feed.like/abc';
			const result = await deleteLikeOperation(agent, uri);
			expect(agent.deleteLike).toHaveBeenCalledWith(uri);
			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual({ uri });
		});
	});

	describe('repostOperation', () => {
		it('should repost and return uri+cid', async () => {
			const agent = createMockAgent();
			const result = await repostOperation(agent, 'at://post/uri', 'bafycid');
			expect(agent.repost).toHaveBeenCalledWith('at://post/uri', 'bafycid');
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('uri');
			expect(result[0].json).toHaveProperty('cid');
		});
	});

	describe('deleteRepostOperation', () => {
		it('should delete a repost and return the uri', async () => {
			const agent = createMockAgent();
			const uri = 'at://did:plc:test/app.bsky.feed.repost/abc';
			const result = await deleteRepostOperation(agent, uri);
			expect(agent.deleteRepost).toHaveBeenCalledWith(uri);
			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual({ uri });
		});
	});

	describe('quoteOperation', () => {
		it('should create a quote post with embed record', async () => {
			const agent = createMockAgent();
			const result = await quoteOperation(
				agent,
				'Check this out!',
				['en'],
				'at://did:plc:other/app.bsky.feed.post/xyz',
				'bafyquoted',
			);
			expect(agent.post).toHaveBeenCalledTimes(1);
			const postArg = agent.post.mock.calls[0][0];
			expect(postArg.text).toBe('Check this out!');
			expect(postArg.langs).toEqual(['en']);
			expect(postArg.embed.$type).toBe('app.bsky.embed.record');
			expect(postArg.embed.record.uri).toBe('at://did:plc:other/app.bsky.feed.post/xyz');
			expect(postArg.embed.record.cid).toBe('bafyquoted');
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('uri');
			expect(result[0].json).toHaveProperty('cid');
		});
	});
});
