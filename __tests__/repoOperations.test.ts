/**
 * Tests for repoOperations.ts
 * Covers: createRecordOperation, putRecordOperation, deleteRecordOperation,
 *         getRecordOperation, listRecordsOperation, applyWritesOperation
 * Note: uploadBlobOperation requires IExecuteFunctions context (this-bound).
 */
import {
	applyWritesOperation,
	createRecordOperation,
	deleteRecordOperation,
	getRecordOperation,
	listRecordsOperation,
	putRecordOperation,
} from '../nodes/Bluesky/V2/repoOperations';

function createMockAgent(): any {
	return {
		com: {
			atproto: {
				repo: {
					createRecord: jest.fn().mockResolvedValue({
						data: { uri: 'at://did:plc:me/app.bsky.feed.post/tid123', cid: 'bafycreated' },
					}),
					putRecord: jest.fn().mockResolvedValue({
						data: { uri: 'at://did:plc:me/app.bsky.feed.post/rk1', cid: 'bafyput' },
					}),
					deleteRecord: jest.fn().mockResolvedValue(undefined),
					getRecord: jest.fn().mockResolvedValue({
						data: {
							uri: 'at://did:plc:me/app.bsky.feed.post/rk1',
							cid: 'bafyget',
							value: { text: 'hello' },
						},
					}),
					listRecords: jest.fn().mockResolvedValue({
						data: {
							records: [
								{ uri: 'at://rec1', cid: 'c1', value: {} },
								{ uri: 'at://rec2', cid: 'c2', value: {} },
							],
							cursor: 'reccur',
						},
					}),
					applyWrites: jest.fn().mockResolvedValue({
						data: { commit: { cid: 'bafycommit', rev: 'rev1' } },
					}),
				},
			},
		},
	};
}

describe('Repo Operations', () => {
	let agent: any;
	beforeEach(() => {
		agent = createMockAgent();
	});

	describe('createRecordOperation', () => {
		it('should create a record and return uri+cid', async () => {
			const recordJson = JSON.stringify({ $type: 'app.bsky.feed.post', text: 'test' });
			const result = await createRecordOperation(
				agent,
				'did:plc:me',
				'app.bsky.feed.post',
				recordJson,
			);
			expect(agent.com.atproto.repo.createRecord).toHaveBeenCalledWith({
				repo: 'did:plc:me',
				collection: 'app.bsky.feed.post',
				record: { $type: 'app.bsky.feed.post', text: 'test' },
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('uri');
			expect(result[0].json).toHaveProperty('cid');
			expect(result[0].json).toHaveProperty('record');
		});

		it('should pass optional rkey', async () => {
			const recordJson = JSON.stringify({ text: 'x' });
			await createRecordOperation(agent, 'did:plc:me', 'coll', recordJson, 'custom-rkey');
			expect(agent.com.atproto.repo.createRecord).toHaveBeenCalledWith(
				expect.objectContaining({ rkey: 'custom-rkey' }),
			);
		});
	});

	describe('putRecordOperation', () => {
		it('should put a record at a specific rkey', async () => {
			const recordJson = JSON.stringify({ text: 'updated' });
			const result = await putRecordOperation(
				agent,
				'did:plc:me',
				'app.bsky.feed.post',
				'rk1',
				recordJson,
			);
			expect(agent.com.atproto.repo.putRecord).toHaveBeenCalledWith({
				repo: 'did:plc:me',
				collection: 'app.bsky.feed.post',
				rkey: 'rk1',
				record: { text: 'updated' },
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('uri');
		});

		it('should pass swapCommit for optimistic concurrency', async () => {
			const recordJson = JSON.stringify({ text: 'x' });
			await putRecordOperation(agent, 'repo', 'coll', 'rk', recordJson, 'bafyswap');
			expect(agent.com.atproto.repo.putRecord).toHaveBeenCalledWith(
				expect.objectContaining({ swapCommit: 'bafyswap' }),
			);
		});
	});

	describe('deleteRecordOperation', () => {
		it('should delete a record and return confirmation', async () => {
			const result = await deleteRecordOperation(agent, 'did:plc:me', 'app.bsky.feed.post', 'rk1');
			expect(agent.com.atproto.repo.deleteRecord).toHaveBeenCalledWith({
				repo: 'did:plc:me',
				collection: 'app.bsky.feed.post',
				rkey: 'rk1',
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual({ deleted: true, rkey: 'rk1' });
		});

		it('should pass optional swapCommit', async () => {
			await deleteRecordOperation(agent, 'repo', 'coll', 'rk', 'bafyswap');
			expect(agent.com.atproto.repo.deleteRecord).toHaveBeenCalledWith(
				expect.objectContaining({ swapCommit: 'bafyswap' }),
			);
		});
	});

	describe('getRecordOperation', () => {
		it('should fetch a record by rkey', async () => {
			const result = await getRecordOperation(agent, 'did:plc:me', 'app.bsky.feed.post', 'rk1');
			expect(agent.com.atproto.repo.getRecord).toHaveBeenCalledWith({
				repo: 'did:plc:me',
				collection: 'app.bsky.feed.post',
				rkey: 'rk1',
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('value');
		});
	});

	describe('listRecordsOperation', () => {
		it('should list records with pagination', async () => {
			const result = await listRecordsOperation(agent, 'did:plc:me', 'app.bsky.feed.post', 50);
			expect(agent.com.atproto.repo.listRecords).toHaveBeenCalledWith({
				repo: 'did:plc:me',
				collection: 'app.bsky.feed.post',
				limit: 50,
			});
			expect(result.length).toBe(3); // 2 records + 1 cursor
		});

		it('should pass optional params: cursor, reverse, rkeyStart, rkeyEnd', async () => {
			await listRecordsOperation(agent, 'repo', 'coll', 10, 'cur1', true, 'start', 'end');
			expect(agent.com.atproto.repo.listRecords).toHaveBeenCalledWith({
				repo: 'repo',
				collection: 'coll',
				limit: 10,
				cursor: 'cur1',
				reverse: true,
				rkeyStart: 'start',
				rkeyEnd: 'end',
			});
		});
	});

	describe('applyWritesOperation', () => {
		it('should apply batch writes', async () => {
			const writes = JSON.stringify([
				{
					$type: 'com.atproto.repo.applyWrites#create',
					collection: 'app.bsky.feed.post',
					value: { text: 'test' },
				},
			]);
			const result = await applyWritesOperation(agent, 'did:plc:me', writes);
			expect(agent.com.atproto.repo.applyWrites).toHaveBeenCalledWith({
				repo: 'did:plc:me',
				writes: expect.any(Array),
			});
			expect(result).toHaveLength(1);
		});

		it('should pass optional swapCommit', async () => {
			await applyWritesOperation(agent, 'repo', '[]', 'bafyswap');
			expect(agent.com.atproto.repo.applyWrites).toHaveBeenCalledWith(
				expect.objectContaining({ swapCommit: 'bafyswap' }),
			);
		});
	});
});
