/**
 * Tests for chatOperations.ts
 * Covers all 11 exported chat functions.
 */
import {
	acceptConversationOperation,
	deleteMessageOperation,
	getConversationOperation,
	getConvoForMembersOperation,
	getMessagesOperation,
	leaveConversationOperation,
	listConversationsOperation,
	muteConversationOperation,
	sendMessageOperation,
	unmuteConversationOperation,
	updateReadStatusOperation,
} from '../nodes/Bluesky/V2/chatOperations';

function createMockAgent(): any {
	return {
		api: {
			chat: {
				bsky: {
					convo: {
						listConvos: jest.fn().mockResolvedValue({
							data: {
								convos: [{ id: 'convo1', members: [] }],
								cursor: 'ccur',
							},
						}),
						getConvo: jest.fn().mockResolvedValue({
							data: { convo: { id: 'convo1', members: [] } },
						}),
						getMessages: jest.fn().mockResolvedValue({
							data: {
								messages: [{ id: 'msg1', text: 'hello' }],
								cursor: 'mcur',
							},
						}),
						sendMessage: jest.fn().mockResolvedValue({
							data: { id: 'msg2', text: 'hi' },
						}),
						getConvoForMembers: jest.fn().mockResolvedValue({
							data: { convo: { id: 'convo2', members: ['did:a', 'did:b'] } },
						}),
						acceptConvo: jest.fn().mockResolvedValue({
							data: { rev: 'rev1' },
						}),
						leaveConvo: jest.fn().mockResolvedValue({
							data: { rev: 'rev2' },
						}),
						muteConvo: jest.fn().mockResolvedValue({
							data: { convo: { id: 'convo1', muted: true } },
						}),
						unmuteConvo: jest.fn().mockResolvedValue({
							data: { convo: { id: 'convo1', muted: false } },
						}),
						updateRead: jest.fn().mockResolvedValue({
							data: { convo: { id: 'convo1' } },
						}),
						deleteMessageForSelf: jest.fn().mockResolvedValue({
							data: { id: 'msg1', deleted: true },
						}),
					},
				},
			},
		},
	};
}

describe('Chat Operations', () => {
	let agent: any;
	beforeEach(() => {
		agent = createMockAgent();
	});

	describe('listConversationsOperation', () => {
		it('should list conversations with pagination', async () => {
			const result = await listConversationsOperation(agent, 50);
			expect(agent.api.chat.bsky.convo.listConvos).toHaveBeenCalledWith({ limit: 50 });
			expect(result.length).toBe(2); // 1 convo + 1 cursor
			expect(result[1].json).toHaveProperty('_pagination', true);
		});

		it('should pass optional filters', async () => {
			await listConversationsOperation(agent, 10, 'cursor1', 'unread', 'accepted');
			expect(agent.api.chat.bsky.convo.listConvos).toHaveBeenCalledWith({
				limit: 10,
				cursor: 'cursor1',
				readState: 'unread',
				status: 'accepted',
			});
		});
	});

	describe('getConversationOperation', () => {
		it('should get a single conversation', async () => {
			const result = await getConversationOperation(agent, 'convo1');
			expect(agent.api.chat.bsky.convo.getConvo).toHaveBeenCalledWith({ convoId: 'convo1' });
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('id', 'convo1');
		});
	});

	describe('getMessagesOperation', () => {
		it('should get messages from a conversation', async () => {
			const result = await getMessagesOperation(agent, 'convo1', 50);
			expect(agent.api.chat.bsky.convo.getMessages).toHaveBeenCalledWith({
				convoId: 'convo1',
				limit: 50,
			});
			expect(result.length).toBe(2); // 1 message + 1 cursor
		});

		it('should pass cursor for pagination', async () => {
			await getMessagesOperation(agent, 'convo1', 25, 'msgcur');
			expect(agent.api.chat.bsky.convo.getMessages).toHaveBeenCalledWith({
				convoId: 'convo1',
				limit: 25,
				cursor: 'msgcur',
			});
		});
	});

	describe('sendMessageOperation', () => {
		it('should send a message to a conversation', async () => {
			const result = await sendMessageOperation(agent, 'convo1', 'Hello!');
			expect(agent.api.chat.bsky.convo.sendMessage).toHaveBeenCalledWith({
				convoId: 'convo1',
				message: { text: 'Hello!' },
			});
			expect(result).toHaveLength(1);
		});
	});

	describe('getConvoForMembersOperation', () => {
		it('should get or create conversation for members', async () => {
			const result = await getConvoForMembersOperation(agent, ['did:a', 'did:b']);
			expect(agent.api.chat.bsky.convo.getConvoForMembers).toHaveBeenCalledWith({
				members: ['did:a', 'did:b'],
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('id', 'convo2');
		});
	});

	describe('acceptConversationOperation', () => {
		it('should accept a conversation request', async () => {
			const result = await acceptConversationOperation(agent, 'convo1');
			expect(agent.api.chat.bsky.convo.acceptConvo).toHaveBeenCalledWith({ convoId: 'convo1' });
			expect(result).toHaveLength(1);
		});
	});

	describe('leaveConversationOperation', () => {
		it('should leave a conversation', async () => {
			const result = await leaveConversationOperation(agent, 'convo1');
			expect(agent.api.chat.bsky.convo.leaveConvo).toHaveBeenCalledWith({ convoId: 'convo1' });
			expect(result).toHaveLength(1);
		});
	});

	describe('muteConversationOperation', () => {
		it('should mute a conversation', async () => {
			const result = await muteConversationOperation(agent, 'convo1');
			expect(agent.api.chat.bsky.convo.muteConvo).toHaveBeenCalledWith({ convoId: 'convo1' });
			expect(result).toHaveLength(1);
		});
	});

	describe('unmuteConversationOperation', () => {
		it('should unmute a conversation', async () => {
			const result = await unmuteConversationOperation(agent, 'convo1');
			expect(agent.api.chat.bsky.convo.unmuteConvo).toHaveBeenCalledWith({ convoId: 'convo1' });
			expect(result).toHaveLength(1);
		});
	});

	describe('updateReadStatusOperation', () => {
		it('should update read status without messageId', async () => {
			const result = await updateReadStatusOperation(agent, 'convo1');
			expect(agent.api.chat.bsky.convo.updateRead).toHaveBeenCalledWith({ convoId: 'convo1' });
			expect(result).toHaveLength(1);
		});

		it('should update read status with messageId', async () => {
			await updateReadStatusOperation(agent, 'convo1', 'msg5');
			expect(agent.api.chat.bsky.convo.updateRead).toHaveBeenCalledWith({
				convoId: 'convo1',
				messageId: 'msg5',
			});
		});
	});

	describe('deleteMessageOperation', () => {
		it('should delete a message for self', async () => {
			const result = await deleteMessageOperation(agent, 'convo1', 'msg1');
			expect(agent.api.chat.bsky.convo.deleteMessageForSelf).toHaveBeenCalledWith({
				convoId: 'convo1',
				messageId: 'msg1',
			});
			expect(result).toHaveLength(1);
		});
	});

	describe('error handling', () => {
		it('should wrap XRPCNotSupported errors with helpful message', async () => {
			agent.api.chat.bsky.convo.listConvos.mockRejectedValue({
				error: 'XRPCNotSupported',
				message: 'Not supported',
			});
			await expect(listConversationsOperation(agent, 50)).rejects.toThrow('experimental');
		});

		it('should wrap generic errors', async () => {
			agent.api.chat.bsky.convo.sendMessage.mockRejectedValue(new Error('Network error'));
			await expect(sendMessageOperation(agent, 'c1', 'test')).rejects.toThrow('sending message');
		});
	});
});
