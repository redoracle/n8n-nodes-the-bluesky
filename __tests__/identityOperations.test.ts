/**
 * Tests for identityOperations.ts
 * Covers: resolveHandleOperation, resolveDidOperation, resolveIdentityOperation
 */
import {
	resolveDidOperation,
	resolveHandleOperation,
	resolveIdentityOperation,
} from '../nodes/Bluesky/V2/identityOperations';

function createMockAgent(): any {
	return {
		com: {
			atproto: {
				identity: {
					resolveHandle: jest.fn().mockResolvedValue({
						data: { did: 'did:plc:alice123' },
					}),
					resolveDid: jest.fn().mockResolvedValue({
						data: {
							id: 'did:plc:alice123',
							alsoKnownAs: ['at://alice.bsky.social'],
							verificationMethods: {},
							services: {},
						},
					}),
					resolveIdentity: jest.fn().mockResolvedValue({
						data: {
							did: 'did:plc:alice123',
							handle: 'alice.bsky.social',
						},
					}),
				},
			},
		},
	};
}

describe('Identity Operations', () => {
	let agent: any;
	beforeEach(() => {
		agent = createMockAgent();
	});

	describe('resolveHandleOperation', () => {
		it('should resolve a handle to a DID', async () => {
			const result = await resolveHandleOperation(agent, 'alice.bsky.social');
			expect(agent.com.atproto.identity.resolveHandle).toHaveBeenCalledWith({
				handle: 'alice.bsky.social',
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('did', 'did:plc:alice123');
		});
	});

	describe('resolveDidOperation', () => {
		it('should resolve a DID to a DID document', async () => {
			const result = await resolveDidOperation(agent, 'did:plc:alice123');
			expect(agent.com.atproto.identity.resolveDid).toHaveBeenCalledWith({
				did: 'did:plc:alice123',
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('id', 'did:plc:alice123');
			expect(result[0].json).toHaveProperty('alsoKnownAs');
		});
	});

	describe('resolveIdentityOperation', () => {
		it('should resolve an identifier (handle or DID) to identity details', async () => {
			const result = await resolveIdentityOperation(agent, 'alice.bsky.social');
			expect(agent.com.atproto.identity.resolveIdentity).toHaveBeenCalledWith({
				identifier: 'alice.bsky.social',
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('did');
			expect(result[0].json).toHaveProperty('handle');
		});

		it('should also work with a DID as input', async () => {
			await resolveIdentityOperation(agent, 'did:plc:alice123');
			expect(agent.com.atproto.identity.resolveIdentity).toHaveBeenCalledWith({
				identifier: 'did:plc:alice123',
			});
		});
	});
});
