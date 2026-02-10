/**
 * Tests for analyticsOperations.ts
 * Covers: getUnreadCountOperation, updateSeenNotificationsOperation, getPostInteractionsOperation
 * Note: listNotificationsOperation is re-exported from notificationOperations and tested there.
 */
import {
	getPostInteractionsOperation,
	getUnreadCountOperation,
	updateSeenNotificationsOperation,
} from '../nodes/Bluesky/V2/analyticsOperations';

function createMockAgent(): any {
	return {
		app: {
			bsky: {
				notification: {
					getUnreadCount: jest.fn().mockResolvedValue({
						data: { count: 7 },
					}),
					updateSeen: jest.fn().mockResolvedValue(undefined),
				},
			},
		},
		getLikes: jest.fn().mockResolvedValue({
			data: {
				likes: [
					{
						actor: { displayName: 'Alice' },
						createdAt: '2025-01-01T00:00:00Z',
						indexedAt: '2025-01-01T00:00:01Z',
					},
					{
						actor: { displayName: 'Bob' },
						createdAt: '2025-01-02T00:00:00Z',
						indexedAt: '2025-01-02T00:00:01Z',
					},
				],
			},
		}),
		getRepostedBy: jest.fn().mockResolvedValue({
			data: {
				repostedBy: [{ did: 'did:plc:reposter1' }],
			},
		}),
		getPostThread: jest.fn().mockResolvedValue({
			data: {
				thread: {
					replies: [
						{
							$type: 'app.bsky.feed.defs#threadViewPost',
							post: { author: { handle: 'replier.bsky.social' }, text: 'reply' },
						},
						{
							$type: 'app.bsky.feed.defs#notFoundPost',
							uri: 'at://notfound',
						},
					],
				},
			},
		}),
	};
}

describe('Analytics Operations', () => {
	let agent: any;
	beforeEach(() => {
		agent = createMockAgent();
	});

	describe('getUnreadCountOperation', () => {
		it('should return unread notification count', async () => {
			const result = await getUnreadCountOperation(agent);
			expect(agent.app.bsky.notification.getUnreadCount).toHaveBeenCalled();
			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual({ count: 7 });
		});
	});

	describe('updateSeenNotificationsOperation', () => {
		it('should mark notifications as seen with provided timestamp', async () => {
			const seenAt = '2025-06-01T12:00:00Z';
			const result = await updateSeenNotificationsOperation(agent, seenAt);
			expect(agent.app.bsky.notification.updateSeen).toHaveBeenCalledWith({ seenAt });
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('success', true);
			expect(result[0].json).toHaveProperty('seenAt', seenAt);
		});

		it('should use current time when seenAt is not provided', async () => {
			const before = Date.now();
			const result = await updateSeenNotificationsOperation(agent);
			const after = Date.now();
			expect(agent.app.bsky.notification.updateSeen).toHaveBeenCalledWith(
				expect.objectContaining({ seenAt: expect.any(String) }),
			);
			expect(result[0].json).toHaveProperty('success', true);

			// Verify the auto-generated seenAt is within expected time range
			const mockCallArgs = (agent.app.bsky.notification.updateSeen as jest.Mock).mock.calls[0][0];
			const seenAtTimestamp = new Date(mockCallArgs.seenAt).getTime();
			expect(seenAtTimestamp).toBeGreaterThanOrEqual(before);
			expect(seenAtTimestamp).toBeLessThanOrEqual(after);
		});
	});

	describe('getPostInteractionsOperation', () => {
		it('should retrieve all interaction types (likes, reposts, replies)', async () => {
			const result = await getPostInteractionsOperation(
				agent,
				'at://did:plc:me/app.bsky.feed.post/tid1',
				['likes', 'reposts', 'replies'],
				50,
			);
			expect(agent.getLikes).toHaveBeenCalledWith({
				uri: 'at://did:plc:me/app.bsky.feed.post/tid1',
				limit: 50,
			});
			expect(agent.getRepostedBy).toHaveBeenCalledWith({
				uri: 'at://did:plc:me/app.bsky.feed.post/tid1',
				limit: 50,
			});
			expect(agent.getPostThread).toHaveBeenCalledWith({
				uri: 'at://did:plc:me/app.bsky.feed.post/tid1',
				depth: 1,
			});

			const data = result[0].json;
			expect(data.likes).toHaveLength(2);
			expect(data.reposts).toHaveLength(1);
			// Only threadViewPost replies are included, not notFoundPost
			expect(data.replies).toHaveLength(1);
			expect(data.analytics).toEqual({
				likeCount: 2,
				repostCount: 1,
				replyCount: 1,
			});
		});

		it('should retrieve only likes when specified', async () => {
			const result = await getPostInteractionsOperation(agent, 'at://post', ['likes'], 10);
			expect(agent.getLikes).toHaveBeenCalled();
			expect(agent.getRepostedBy).not.toHaveBeenCalled();
			expect(agent.getPostThread).not.toHaveBeenCalled();

			const data = result[0].json;
			expect(data.likes).toBeDefined();
			expect(data.reposts).toBeUndefined();
			expect(data.replies).toBeUndefined();
		});

		it('should return empty replies when thread has no replies array', async () => {
			agent.getPostThread.mockResolvedValueOnce({
				data: { thread: { post: {} /* no replies key */ } },
			});
			const result = await getPostInteractionsOperation(agent, 'at://post', ['replies'], 50);
			expect(result[0].json.replies).toEqual([]);
		});
	});
});
