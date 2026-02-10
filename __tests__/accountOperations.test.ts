import { requestTransferOperation } from '../nodes/Bluesky/V2/accountOperations';

describe('Account Operations', () => {
	describe('requestTransferOperation', () => {
		it('should call requestTransfer with parsed JSON body', async () => {
			const mockAgent: any = {
				call: jest.fn().mockResolvedValue({ data: { success: true } }),
			};

			const payload = { did: 'did:plc:example', target: 'did:plc:newhost' };
			const result = await requestTransferOperation(mockAgent, JSON.stringify(payload));

			expect(mockAgent.call).toHaveBeenCalledWith(
				'com.atproto.account.requestTransfer',
				undefined,
				payload,
			);
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('success', true);
		});
	});
});
