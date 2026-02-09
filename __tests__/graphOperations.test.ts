/**
 * Tests for graphOperations.ts
 * Covers: muteThreadOperation, getBlocksOperation, getMutesOperation
 */
import {
	getBlocksOperation,
	getMutesOperation,
	muteThreadOperation,
} from '../nodes/Bluesky/V2/graphOperations';

function createMockAgent(): any {
	return {
		app: {
			bsky: {
				graph: {
					muteThread: jest.fn().mockResolvedValue(undefined),
					getBlocks: jest.fn().mockResolvedValue({
						data: {
							blocks: [{ did: 'did:plc:blocked1' }, { did: 'did:plc:blocked2' }],
							cursor: 'blockcur',
						},
					}),
					getMutes: jest.fn().mockResolvedValue({
						data: {
							mutes: [{ did: 'did:plc:muted1' }],
							cursor: 'mutecur',
						},
					}),
				},
			},
		},
	};
}

describe('Graph Operations', () => {
	let agent: any;
	beforeEach(() => {
		agent = createMockAgent();
	});

	describe('muteThreadOperation', () => {
		it('should mute a thread by root URI', async () => {
			await muteThreadOperation(agent, 'at://did:plc:test/app.bsky.feed.post/thread1');
			expect(agent.app.bsky.graph.muteThread).toHaveBeenCalledWith({
				root: 'at://did:plc:test/app.bsky.feed.post/thread1',
			});
		});

		it('should return void', async () => {
			const result = await muteThreadOperation(agent, 'at://thread');
			expect(result).toBeUndefined();
		});
	});

	describe('getBlocksOperation', () => {
		it('should return blocked accounts list and cursor', async () => {
			const result = await getBlocksOperation(agent, 50);
			expect(agent.app.bsky.graph.getBlocks).toHaveBeenCalledWith({ limit: 50, cursor: undefined });
			expect(result.data).toHaveLength(2);
			expect(result.cursor).toBe('blockcur');
		});

		it('should pass pagination cursor', async () => {
			await getBlocksOperation(agent, 25, 'page2');
			expect(agent.app.bsky.graph.getBlocks).toHaveBeenCalledWith({ limit: 25, cursor: 'page2' });
		});

		it('should return empty array when no blocks exist', async () => {
			agent.app.bsky.graph.getBlocks.mockResolvedValue({
				data: { blocks: [], cursor: undefined },
			});
			const result = await getBlocksOperation(agent, 50);
			expect(result.data).toEqual([]);
			expect(result.cursor).toBeUndefined();
		});
	});

	describe('getMutesOperation', () => {
		it('should return muted accounts list and cursor', async () => {
			const result = await getMutesOperation(agent, 50);
			expect(agent.app.bsky.graph.getMutes).toHaveBeenCalledWith({ limit: 50, cursor: undefined });
			expect(result.data).toHaveLength(1);
			expect(result.cursor).toBe('mutecur');
		});

		it('should pass pagination cursor', async () => {
			await getMutesOperation(agent, 10, 'nextpage');
			expect(agent.app.bsky.graph.getMutes).toHaveBeenCalledWith({ limit: 10, cursor: 'nextpage' });
		});

		it('should return empty array when no mutes exist', async () => {
			agent.app.bsky.graph.getMutes.mockResolvedValue({
				data: { mutes: [], cursor: undefined },
			});
			const result = await getMutesOperation(agent, 50);
			expect(agent.app.bsky.graph.getMutes).toHaveBeenCalledWith({ limit: 50, cursor: undefined });
			expect(result.data).toEqual([]);
			expect(result.cursor).toBeUndefined();
		});
	});
});
