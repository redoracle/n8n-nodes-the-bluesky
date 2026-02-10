/**
 * Tests for syncOperations.ts
 * Covers: getLatestCommitOperation, getRepoStatusOperation, listBlobsOperation, listReposOperation,
 *         notifyOfUpdateOperation, requestCrawlOperation
 * Note: getRepoOperation, getRecordSyncOperation, getBlobOperation require
 *       IExecuteFunctions context (this-bound) and are skipped.
 */
import {
	getLatestCommitOperation,
	getRepoStatusOperation,
	listBlobsOperation,
	listReposOperation,
	notifyOfUpdateOperation,
	requestCrawlOperation,
} from '../nodes/Bluesky/V2/syncOperations';

function createMockAgent(): any {
	return {
		com: {
			atproto: {
				sync: {
					getLatestCommit: jest.fn().mockResolvedValue({
						data: { cid: 'bafycommit', rev: 'rev123' },
					}),
					listBlobs: jest.fn().mockResolvedValue({
						data: {
							cids: ['bafyblob1', 'bafyblob2', 'bafyblob3'],
							cursor: 'blobcur',
						},
					}),
					getRepoStatus: jest.fn().mockResolvedValue({
						data: {
							did: 'did:plc:user1',
							active: true,
							rev: 'rev123',
						},
					}),
					listRepos: jest.fn().mockResolvedValue({
						data: {
							repos: [
								{ did: 'did:plc:user1', head: 'bafyhead1' },
								{ did: 'did:plc:user2', head: 'bafyhead2' },
							],
							cursor: 'repocur',
						},
					}),
					notifyOfUpdate: jest.fn().mockResolvedValue(undefined),
					requestCrawl: jest.fn().mockResolvedValue(undefined),
				},
			},
		},
	};
}

describe('Sync Operations', () => {
	let agent: any;
	beforeEach(() => {
		agent = createMockAgent();
	});

	describe('getLatestCommitOperation', () => {
		it('should get latest commit CID for a repo', async () => {
			const result = await getLatestCommitOperation(agent, 'did:plc:user1');
			expect(agent.com.atproto.sync.getLatestCommit).toHaveBeenCalledWith({ did: 'did:plc:user1' });
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('cid', 'bafycommit');
			expect(result[0].json).toHaveProperty('rev', 'rev123');
		});
	});

	describe('getRepoStatusOperation', () => {
		it('should return repo status', async () => {
			const result = await getRepoStatusOperation(agent, 'did:plc:user1');
			expect(agent.com.atproto.sync.getRepoStatus).toHaveBeenCalledWith({
				did: 'did:plc:user1',
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('active', true);
			// Ensure returned repo metadata matches the mocked response
			expect(result[0].json).toHaveProperty('did', 'did:plc:user1');
			expect(result[0].json).toHaveProperty('rev', 'rev123');
		});
	});

	describe('listBlobsOperation', () => {
		it('should list blobs for a repo', async () => {
			const result = await listBlobsOperation(agent, 'did:plc:user1', 50);
			expect(agent.com.atproto.sync.listBlobs).toHaveBeenCalledWith({
				did: 'did:plc:user1',
				limit: 50,
				cursor: undefined,
			});
			expect(result.length).toBe(4); // 3 cids + 1 pagination
			expect(result[0].json).toHaveProperty('cid', 'bafyblob1');
			expect(result[3].json).toHaveProperty('cursor', 'blobcur');
			expect(result[3].json).toHaveProperty('_pagination', true);
		});

		it('should pass cursor for pagination', async () => {
			await listBlobsOperation(agent, 'did:plc:user1', 10, 'prev-cursor');
			expect(agent.com.atproto.sync.listBlobs).toHaveBeenCalledWith(
				expect.objectContaining({ cursor: 'prev-cursor' }),
			);
		});

		it('should omit cursor item when no cursor returned', async () => {
			agent.com.atproto.sync.listBlobs.mockResolvedValueOnce({
				data: { cids: ['c1'], cursor: undefined },
			});
			const result = await listBlobsOperation(agent, 'did:plc:me', 50);
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('cid', 'c1');
		});
	});

	describe('listReposOperation', () => {
		it('should list repos known to the service', async () => {
			const result = await listReposOperation(agent, 50);
			expect(agent.com.atproto.sync.listRepos).toHaveBeenCalledWith({
				limit: 50,
				cursor: undefined,
			});
			expect(result.length).toBe(3); // 2 repos + 1 cursor
			expect(result[0].json).toHaveProperty('did', 'did:plc:user1');
		});

		it('should handle cursor pagination', async () => {
			await listReposOperation(agent, 25, 'repopage2');
			expect(agent.com.atproto.sync.listRepos).toHaveBeenCalledWith(
				expect.objectContaining({ cursor: 'repopage2', limit: 25 }),
			);
		});
	});

	describe('notifyOfUpdateOperation', () => {
		it('should notify a service of an update', async () => {
			const result = await notifyOfUpdateOperation(agent, 'bgs.example.com');
			expect(agent.com.atproto.sync.notifyOfUpdate).toHaveBeenCalledWith({
				hostname: 'bgs.example.com',
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual({ success: true, hostname: 'bgs.example.com' });
		});
	});

	describe('requestCrawlOperation', () => {
		it('should request a crawl of a host', async () => {
			const result = await requestCrawlOperation(agent, 'relay.example.com');
			expect(agent.com.atproto.sync.requestCrawl).toHaveBeenCalledWith({
				hostname: 'relay.example.com',
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual({ success: true, hostname: 'relay.example.com' });
		});
	});
});
