/**
 * Tests for labelOperations.ts
 * Covers: queryLabelsOperation
 */
import { applyLabelsOperation, queryLabelsOperation } from '../nodes/Bluesky/V2/labelOperations';

function createMockAgent(): any {
	return {
		com: {
			atproto: {
				label: {
					queryLabels: jest.fn().mockResolvedValue({
						data: {
							labels: [
								{
									src: 'did:plc:labeler',
									uri: 'at://did:plc:user/post/1',
									val: 'spam',
									cts: '2025-01-01',
								},
								{
									src: 'did:plc:labeler',
									uri: 'at://did:plc:user/post/2',
									val: 'nsfw',
									cts: '2025-01-02',
								},
							],
							cursor: 'lcur',
						},
					}),
				},
			},
		},
		call: jest.fn().mockResolvedValue({
			data: { success: true },
		}),
	};
}

describe('Label Operations', () => {
	let agent: any;
	beforeEach(() => {
		agent = createMockAgent();
	});

	describe('queryLabelsOperation', () => {
		it('should query labels with URI patterns', async () => {
			const result = await queryLabelsOperation(agent, ['at://did:plc:user/*'], 50);
			expect(agent.com.atproto.label.queryLabels).toHaveBeenCalledWith({
				uriPatterns: ['at://did:plc:user/*'],
				limit: 50,
			});
			expect(result.length).toBe(3); // 2 labels + 1 cursor
		});

		it('should pass optional sources filter', async () => {
			await queryLabelsOperation(agent, ['at://pattern'], 10, ['did:plc:labeler1']);
			expect(agent.com.atproto.label.queryLabels).toHaveBeenCalledWith({
				uriPatterns: ['at://pattern'],
				limit: 10,
				sources: ['did:plc:labeler1'],
			});
		});

		it('should pass optional cursor', async () => {
			await queryLabelsOperation(agent, ['at://pattern'], 10, undefined, 'page2');
			expect(agent.com.atproto.label.queryLabels).toHaveBeenCalledWith({
				uriPatterns: ['at://pattern'],
				limit: 10,
				cursor: 'page2',
			});
		});

		it('should include pagination cursor in results', async () => {
			const result = await queryLabelsOperation(agent, ['at://x'], 50);
			const paginationItem = result.find((r: any) => r.json._pagination);
			expect(paginationItem).toBeDefined();
			expect(paginationItem!.json).toHaveProperty('cursor', 'lcur');
		});

		it('should not include cursor when not present', async () => {
			agent.com.atproto.label.queryLabels.mockResolvedValue({
				data: { labels: [{ val: 'test' }], cursor: undefined },
			});
			const result = await queryLabelsOperation(agent, ['at://x'], 50);
			expect(result).toHaveLength(1);
		});
	});

	describe('applyLabelsOperation', () => {
		it('should call applyLabels with raw JSON payload', async () => {
			const payload = { labels: [{ src: 'did:plc:labeler', val: 'spam' }] };
			const result = await applyLabelsOperation(agent, JSON.stringify(payload));
			expect(agent.call).toHaveBeenCalledWith('com.atproto.label.applyLabels', undefined, payload);
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('success', true);
		});
	});
});
