import { resolveLexiconOperation } from '../nodes/Bluesky/V2/lexiconOperations';

describe('Lexicon Operations', () => {
	describe('resolveLexiconOperation', () => {
		it('should resolve lexicon using url param', async () => {
			const mockAgent: any = {
				call: jest.fn().mockResolvedValue({ data: { lexicon: { id: 'test' } } }),
			};

			const result = await resolveLexiconOperation(
				mockAgent,
				'https://bsky.social/xrpc/com.atproto.sync.getRepo',
			);

			expect(mockAgent.call).toHaveBeenCalledWith(
				'com.atproto.lexicon.resolveLexicon',
				{ url: 'https://bsky.social/xrpc/com.atproto.sync.getRepo' },
				undefined,
			);
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('lexicon');
		});

		it('should resolve lexicon using raw params', async () => {
			const mockAgent: any = {
				call: jest.fn().mockResolvedValue({ data: { lexicon: { id: 'test' } } }),
			};

			const params = { url: 'https://example.com/lexicon.json' };
			await resolveLexiconOperation(mockAgent, '', JSON.stringify(params));

			expect(mockAgent.call).toHaveBeenCalledWith(
				'com.atproto.lexicon.resolveLexicon',
				params,
				undefined,
			);
		});
	});
});
