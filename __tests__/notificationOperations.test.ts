/**
 * Tests for notificationOperations.ts
 * Covers: listNotificationsOperation, getUnreadCountOperation, markAsSeenOperation
 */
import {
	getUnreadCountOperation,
	listNotificationsOperation,
	markAsSeenOperation,
} from '../nodes/Bluesky/V2/notificationOperations';

function createMockAgent(): any {
	return {
		app: {
			bsky: {
				notification: {
					listNotifications: jest.fn().mockResolvedValue({
						data: {
							notifications: [
								{
									uri: 'at://n1',
									isRead: false,
									indexedAt: '2025-01-01T00:00:00Z',
									reason: 'like',
									reasonSubject: 'at://post1',
								},
								{
									uri: 'at://n2',
									isRead: true,
									indexedAt: '2025-01-01T01:00:00Z',
									reason: 'follow',
									reasonSubject: undefined,
								},
							],
							cursor: undefined, // No cursor means no more pages
						},
					}),
					getUnreadCount: jest.fn().mockResolvedValue({ data: { count: 5 } }),
					updateSeen: jest.fn().mockResolvedValue(undefined),
				},
			},
		},
	};
}

describe('Notification Operations', () => {
	let agent: any;
	beforeEach(() => {
		agent = createMockAgent();
	});

	describe('getUnreadCountOperation', () => {
		it('should return the unread notification count', async () => {
			const result = await getUnreadCountOperation(agent);
			expect(agent.app.bsky.notification.getUnreadCount).toHaveBeenCalled();
			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual({ count: 5 });
		});

		it('should throw on API error', async () => {
			agent.app.bsky.notification.getUnreadCount.mockRejectedValue(new Error('Server error'));
			await expect(getUnreadCountOperation(agent)).rejects.toThrow('Failed to get unread count');
		});
	});

	describe('markAsSeenOperation', () => {
		it('should mark notifications as seen at given timestamp', async () => {
			const result = await markAsSeenOperation(agent, '2025-01-15T12:00:00Z');
			expect(agent.app.bsky.notification.updateSeen).toHaveBeenCalledWith({
				seenAt: '2025-01-15T12:00:00Z',
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('success', true);
			expect(result[0].json).toHaveProperty('seenAt', '2025-01-15T12:00:00Z');
		});

		it('should throw on API error', async () => {
			agent.app.bsky.notification.updateSeen.mockRejectedValue(new Error('Fail'));
			await expect(markAsSeenOperation(agent, '2025-01-01')).rejects.toThrow(
				'Failed to mark notifications as seen',
			);
		});
	});

	describe('listNotificationsOperation', () => {
		it('should return all notifications when unreadOnly is false', async () => {
			const result = await listNotificationsOperation(agent, 50, false, false);
			expect(agent.app.bsky.notification.listNotifications).toHaveBeenCalled();
			expect(result).toHaveLength(2); // both read and unread
		});

		it('should filter to unread only when unreadOnly is true', async () => {
			const result = await listNotificationsOperation(agent, 50, true, false);
			// Only the first notification (isRead: false) should be returned
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('uri', 'at://n1');
		});

		it('should mark as read when markRetrievedAsRead is true and unreadOnly', async () => {
			await listNotificationsOperation(agent, 50, true, true);
			expect(agent.app.bsky.notification.updateSeen).toHaveBeenCalledWith({
				seenAt: '2025-01-01T00:00:00Z',
			});
		});

		it('should mark as read when markRetrievedAsRead is true and not unreadOnly', async () => {
			await listNotificationsOperation(agent, 50, false, true);
			expect(agent.app.bsky.notification.updateSeen).toHaveBeenCalled();
		});

		it('should not mark as read when markRetrievedAsRead is false', async () => {
			await listNotificationsOperation(agent, 50, false, false);
			expect(agent.app.bsky.notification.updateSeen).not.toHaveBeenCalled();
		});

		it('should respect the limit parameter', async () => {
			const result = await listNotificationsOperation(agent, 1, false, false);
			expect(result).toHaveLength(1);
		});

		it('should include reasonSubjectUri in output', async () => {
			const result = await listNotificationsOperation(agent, 50, true, false);
			expect(result[0].json).toHaveProperty('reasonSubjectUri', 'at://post1');
		});
	});
});
