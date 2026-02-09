/**
 * Tests for authOperations.ts
 * Covers: createSessionOperation, refreshSessionOperation,
 *         deleteSessionOperation, createAppPasswordOperation
 */
import {
	createAppPasswordOperation,
	createInviteCodeOperation,
	createSessionOperation,
	deleteSessionOperation,
	refreshSessionOperation,
	rotateSigningKeyOperation,
} from '../nodes/Bluesky/V2/authOperations';

function createMockAgent(): any {
	return {
		api: {
			com: {
				atproto: {
					server: {
						createSession: jest.fn().mockResolvedValue({
							data: {
								did: 'did:plc:alice',
								handle: 'alice.bsky.social',
								accessJwt: 'eyJ...',
								refreshJwt: 'eyR...',
							},
						}),
						refreshSession: jest.fn().mockResolvedValue({
							data: {
								did: 'did:plc:alice',
								handle: 'alice.bsky.social',
								accessJwt: 'eyJnew...',
								refreshJwt: 'eyRnew...',
							},
						}),
						deleteSession: jest.fn().mockResolvedValue(undefined),
						createAppPassword: jest.fn().mockResolvedValue({
							data: {
								name: 'my-app',
								password: 'xxxx-xxxx-xxxx-xxxx',
								createdAt: '2025-01-01T00:00:00Z',
							},
						}),
						createInviteCode: jest.fn().mockResolvedValue({
							data: {
								code: 'invite-123',
							},
						}),
					},
				},
			},
		},
		call: jest.fn().mockResolvedValue({
			data: { success: true },
		}),
	};
}

describe('Auth Operations', () => {
	let agent: any;
	beforeEach(() => {
		agent = createMockAgent();
	});

	describe('createSessionOperation', () => {
		it('should create a session and return tokens', async () => {
			const result = await createSessionOperation(agent, 'alice.bsky.social', 'app-password-123');
			expect(agent.api.com.atproto.server.createSession).toHaveBeenCalledWith({
				identifier: 'alice.bsky.social',
				password: 'app-password-123',
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('accessJwt');
			expect(result[0].json).toHaveProperty('refreshJwt');
			expect(result[0].json).toHaveProperty('did', 'did:plc:alice');
		});
	});

	describe('refreshSessionOperation', () => {
		it('should refresh the session tokens', async () => {
			const result = await refreshSessionOperation(agent);
			expect(agent.api.com.atproto.server.refreshSession).toHaveBeenCalled();
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('accessJwt', 'eyJnew...');
		});
	});

	describe('deleteSessionOperation', () => {
		it('should delete session and return success', async () => {
			const result = await deleteSessionOperation(agent);
			expect(agent.api.com.atproto.server.deleteSession).toHaveBeenCalled();
			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual({ success: true });
		});
	});

	describe('createAppPasswordOperation', () => {
		it('should create a new app password', async () => {
			const result = await createAppPasswordOperation(agent, 'my-app');
			expect(agent.api.com.atproto.server.createAppPassword).toHaveBeenCalledWith({
				name: 'my-app',
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('name', 'my-app');
			expect(result[0].json).toHaveProperty('password');
		});
	});

	describe('createInviteCodeOperation', () => {
		it('should create an invite code', async () => {
			const result = await createInviteCodeOperation(agent, 3, 'did:plc:target');
			expect(agent.api.com.atproto.server.createInviteCode).toHaveBeenCalledWith({
				useCount: 3,
				forAccount: 'did:plc:target',
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('code', 'invite-123');
		});

		it('should create an invite code without forAccount when omitted', async () => {
			const result = await createInviteCodeOperation(agent, 1);
			expect(agent.api.com.atproto.server.createInviteCode).toHaveBeenCalledWith({
				useCount: 1,
			});
			expect(result).toHaveLength(1);
		});
	});

	describe('rotateSigningKeyOperation', () => {
		it('should call rotateSigningKey with optional body', async () => {
			const body = { rotation: 'force' };
			const result = await rotateSigningKeyOperation(agent, JSON.stringify(body));
			expect(agent.call).toHaveBeenCalledWith(
				'com.atproto.server.rotateSigningKey',
				undefined,
				body,
			);
			expect(result).toHaveLength(1);
		});

		it('should call rotateSigningKey with undefined body when input is empty', async () => {
			const result = await rotateSigningKeyOperation(agent, '');
			expect(agent.call).toHaveBeenCalledWith(
				'com.atproto.server.rotateSigningKey',
				undefined,
				undefined,
			);
			expect(result).toHaveLength(1);
		});

		it('should reject when provided invalid JSON body', async () => {
			await expect(rotateSigningKeyOperation(agent, '{invalid')).rejects.toThrowError(
				/Invalid JSON for rotateSigningKey body/,
			);
		});
	});
});
