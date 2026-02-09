/**
 * Tests for moderationOperations.ts
 * Covers: createReportOperation
 */
import { createReportOperation } from '../nodes/Bluesky/V2/moderationOperations';

function createMockAgent(): any {
	return {
		api: {
			com: {
				atproto: {
					moderation: {
						createReport: jest.fn().mockResolvedValue({
							data: {
								id: 123,
								reasonType: 'com.atproto.moderation.defs#reasonSpam',
								subject: { uri: 'at://post1', cid: 'bafycid' },
								reportedBy: 'did:plc:reporter',
								createdAt: '2025-01-01T00:00:00Z',
							},
						}),
					},
				},
			},
		},
	};
}

describe('Moderation Operations', () => {
	let agent: any;
	beforeEach(() => {
		agent = createMockAgent();
	});

	describe('createReportOperation', () => {
		it('should report a record (post) with subject type record', async () => {
			const result = await createReportOperation(
				agent,
				'record',
				'at://did:plc:user/app.bsky.feed.post/abc',
				'bafycid123',
				'com.atproto.moderation.defs#reasonSpam',
				'This is spam',
			);
			const callArgs = agent.api.com.atproto.moderation.createReport.mock.calls[0][0];
			expect(callArgs.subject.$type).toBe('com.atproto.repo.strongRef');
			expect(callArgs.subject.uri).toBe('at://did:plc:user/app.bsky.feed.post/abc');
			expect(callArgs.subject.cid).toBe('bafycid123');
			expect(callArgs.reasonType).toBe('com.atproto.moderation.defs#reasonSpam');
			expect(callArgs.reason).toBe('This is spam');
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('id', 123);
		});

		it('should report an account with subject type repo', async () => {
			const result = await createReportOperation(
				agent,
				'repo',
				'did:plc:baduser',
				undefined,
				'com.atproto.moderation.defs#reasonSpam',
			);
			const callArgs = agent.api.com.atproto.moderation.createReport.mock.calls[0][0];
			expect(callArgs.subject.$type).toBe('com.atproto.admin.defs#repoRef');
			expect(callArgs.subject.did).toBe('did:plc:baduser');
			expect(result).toHaveLength(1);
		});

		it('should not include reason when not provided', async () => {
			await createReportOperation(
				agent,
				'repo',
				'did:plc:x',
				undefined,
				'com.atproto.moderation.defs#reasonSpam',
			);
			const callArgs = agent.api.com.atproto.moderation.createReport.mock.calls[0][0];
			expect(callArgs).not.toHaveProperty('reason');
		});
	});
});
