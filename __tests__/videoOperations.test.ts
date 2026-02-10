/**
 * Tests for videoOperations.ts
 * Covers: getVideoUploadLimits
 * Note: uploadVideo requires IExecuteFunctions context (this-bound) and is skipped.
 */
import { getVideoUploadLimits } from '../nodes/Bluesky/V2/videoOperations';

describe('Video Operations', () => {
	describe('getVideoUploadLimits', () => {
		it('should return limits from API when available', async () => {
			const mockAgent: any = {
				api: {
					app: {
						bsky: {
							video: {
								getUploadLimits: jest.fn().mockResolvedValue({
									success: true,
									data: {
										canUpload: true,
										remainingDailyVideos: 10,
										remainingDailyBytes: 524288000,
									},
								}),
							},
						},
					},
				},
			};
			const result = await getVideoUploadLimits(mockAgent);
			expect(mockAgent.api.app.bsky.video.getUploadLimits).toHaveBeenCalled();
			expect(result.canUpload).toBe(true);
			expect(result.remainingDailyVideos).toBe(10);
			expect(result.remainingDailyBytes).toBe(524288000);
		});

		it('should honor API response when uploads are restricted', async () => {
			const mockAgent: any = {
				api: {
					app: {
						bsky: {
							video: {
								getUploadLimits: jest.fn().mockResolvedValue({
									success: true,
									data: {
										canUpload: false,
										remainingDailyVideos: 0,
										remainingDailyBytes: 0,
										message: 'Uploads temporarily disabled',
									},
								}),
							},
						},
					},
				},
			};
			const result = await getVideoUploadLimits(mockAgent);
			expect(mockAgent.api.app.bsky.video.getUploadLimits).toHaveBeenCalled();
			expect(result.canUpload).toBe(false);
			expect(result.remainingDailyVideos).toBe(0);
			expect(result.remainingDailyBytes).toBe(0);
			expect(result.message).toContain('Uploads temporarily disabled');
		});

		it('should return default limits when API is not available', async () => {
			const mockAgent: any = {
				api: {
					app: {
						bsky: {
							video: {
								// No getUploadLimits function
							},
						},
					},
				},
			};
			const result = await getVideoUploadLimits(mockAgent);
			expect(result.canUpload).toBe(true);
			expect(result.message).toContain('blob upload');
			expect(result.remainingDailyVideos).toBeUndefined();
			expect(result.remainingDailyBytes).toBeUndefined();
		});

		it('should fallback to defaults when API throws an error', async () => {
			const mockAgent: any = {
				api: {
					app: {
						bsky: {
							video: {
								getUploadLimits: jest.fn().mockRejectedValue(new Error('XRPCNotSupported')),
							},
						},
					},
				},
			};
			const result = await getVideoUploadLimits(mockAgent);
			expect(result.canUpload).toBe(true);
			expect(result.message).toBeDefined();
			expect(result.message).toContain('blob upload');
		});

		it('should handle agent with no video namespace at all', async () => {
			const mockAgent: any = { api: {} };
			const result = await getVideoUploadLimits(mockAgent);
			expect(result.canUpload).toBe(true);
		});
	});
});
