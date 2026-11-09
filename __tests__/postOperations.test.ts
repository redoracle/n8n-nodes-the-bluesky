/**
 * Tests for postOperations.ts
 * Covers: deletePostOperation, likeOperation, deleteLikeOperation,
 *         repostOperation, deleteRepostOperation, quoteOperation
 * Note: postOperation and replyOperation require IExecuteFunctions context (this-bound)
 *       and are tested at integration level only.
 */
import ogs from 'open-graph-scraper';
import {
	buildWebsiteCardEmbed,
	deleteLikeOperation,
	deletePostOperation,
	deleteRepostOperation,
	likeOperation,
	quoteOperation,
	repostOperation,
} from '../nodes/Bluesky/V2/postOperations';

jest.mock('open-graph-scraper');
const mockOgs = ogs as jest.MockedFunction<typeof ogs>;

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

	describe('buildWebsiteCardEmbed', () => {
		it('should return undefined if no uri is provided', async () => {
			const agent = createMockAgent();
			const context: any = { getNode: () => ({}) };
			const result = await buildWebsiteCardEmbed(context, agent, {});
			expect(result).toBeUndefined();
		});

		it('should construct external card with manual title and description without fetching OG tags', async () => {
			const agent = createMockAgent();
			const context: any = { getNode: () => ({}) };
			const result = await buildWebsiteCardEmbed(context, agent, {
				uri: 'https://example.com/article',
				title: 'Manual Title',
				description: 'Manual Description',
			});
			expect(result).toEqual({
				$type: 'app.bsky.embed.external',
				external: {
					uri: 'https://example.com/article',
					title: 'Manual Title',
					description: 'Manual Description',
					thumb: undefined,
				},
			});
		});

		it('should degrade gracefully when OG image download fails (e.g. 429)', async () => {
			const agent = createMockAgent();
			const warnMock = jest.fn();
			const context: any = {
				getNode: () => ({ name: 'Bluesky Node' }),
				logger: { warn: warnMock },
			};

			mockOgs.mockResolvedValueOnce({
				error: false,
				result: {
					ogTitle: 'Resilient Title',
					ogDescription: 'Resilient Description',
					ogImage: [{ url: 'https://8.8.8.8/og.png' }],
				},
				html: '',
				response: {} as any,
			});

			const originalFetch = global.fetch;
			global.fetch = jest.fn().mockImplementation((input: any) => {
				const url = typeof input === 'string' ? input : input.url;
				if (url.includes('og.png')) {
					return Promise.resolve(new Response('Rate Limited', { status: 429 }));
				}
				return Promise.resolve(new Response('', { status: 200 }));
			});

			try {
				const result = await buildWebsiteCardEmbed(context, agent, {
					uri: 'https://8.8.8.8/article',
					fetchOpenGraphTags: true,
				});
				expect(result).toBeDefined();
				expect(result?.$type).toBe('app.bsky.embed.external');
				expect(result?.external?.title).toBe('Resilient Title');
				expect(result?.external?.description).toBe('Resilient Description');
				expect(result?.external?.thumb).toBeUndefined();
				expect(warnMock).toHaveBeenCalledTimes(1);
				expect(warnMock.mock.calls[0][0]).toContain('HTTP 429');
			} finally {
				global.fetch = originalFetch;
			}
		});

		it('should reject with descriptive NodeOperationError if url is private or invalid', async () => {
			const agent = createMockAgent();
			const context: any = { getNode: () => ({ name: 'Bluesky Node' }) };
			await expect(
				buildWebsiteCardEmbed(context, agent, {
					uri: 'http://127.0.0.1/private',
					fetchOpenGraphTags: true,
				}),
			).rejects.toThrow('Failed to process Open Graph data for website card');
		});
	});
});
