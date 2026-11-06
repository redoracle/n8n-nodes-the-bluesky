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
			expect(result.canUpload).toBe(false);
			expect(result.message).toContain('not verified');
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
			expect(result.canUpload).toBe(false);
			expect(result.message).toBeDefined();
			expect(result.message).toContain('not verified');
		});

		it('should handle agent with no video namespace at all', async () => {
			const mockAgent: any = { api: {} };
			const result = await getVideoUploadLimits(mockAgent);
			expect(result.canUpload).toBe(false);
		});
	});
});

describe('Safe video upload', () => {
	const processedBlob = {
		ref: { $link: 'bafyvideo' },
		mimeType: 'video/mp4',
		size: 123,
	};
	const makeContext = (items: any[]) =>
		({
			getNode: () => ({
				name: 'Bluesky',
				type: 'n8n-nodes-the-bluesky.bluesky',
				typeVersion: 2,
				position: [0, 0],
				parameters: {},
			}),
			getInputData: () => items,
			helpers: { getBinaryDataBuffer: jest.fn().mockResolvedValue(Buffer.from('video-data')) },
		}) as any;
	const makeItems = () => [
		{ json: {}, binary: { video: { mimeType: 'video/mp4' } } },
		{ json: {}, binary: { video: { mimeType: 'video/mp4' } } },
	];
	const makeAgent = (video: unknown): any => ({ api: { app: { bsky: { video } } } });

	it('only returns the genuine completed video blob and uses the correct input item', async () => {
		const { uploadVideo } = await import('../nodes/Bluesky/V2/videoOperations');
		const upload = jest.fn().mockResolvedValue({
			success: true,
			data: { jobStatus: { jobId: 'job1', state: 'JOB_STATE_COMPLETED', blob: processedBlob } },
		});
		const agent: any = { api: { app: { bsky: { video: { uploadVideo: upload } } } } };
		const ctx = makeContext(makeItems());
		const result = await uploadVideo.call(ctx, agent, 'video', 'clip', 1);
		expect(result).toEqual({ blob: processedBlob, altText: 'clip' });
		expect(ctx.helpers.getBinaryDataBuffer).toHaveBeenCalledWith(1, 'video');
		expect(upload).toHaveBeenCalledTimes(1);
		expect(agent.api.com).toBeUndefined();
	});

	it('fails closed if the SDK lacks the video service', async () => {
		const { uploadVideo } = await import('../nodes/Bluesky/V2/videoOperations');
		const agent: any = { api: { app: { bsky: {} }, com: { atproto: { repo: { uploadBlob: jest.fn() } } } } };
		await expect(uploadVideo.call(makeContext(makeItems()), agent, 'video')).rejects.toThrow(/does not expose app.bsky.video.uploadVideo/);
		expect(agent.api.com.atproto.repo.uploadBlob).not.toHaveBeenCalled();
	});

	it('fails closed on a processing failure instead of uploading a generic blob', async () => {
		const { uploadVideo } = await import('../nodes/Bluesky/V2/videoOperations');
		const agent = makeAgent({
			uploadVideo: jest.fn().mockResolvedValue({
				success: true,
				data: { jobStatus: { jobId: 'fail', state: 'JOB_STATE_FAILED', error: 'encoding failure' } },
			}),
		});
		agent.api.com = { atproto: { repo: { uploadBlob: jest.fn() } } };
		await expect(uploadVideo.call(makeContext(makeItems()), agent, 'video')).rejects.toThrow(/encoding failure/);
		expect(agent.api.com.atproto.repo.uploadBlob).not.toHaveBeenCalled();
	});

	it('rejects an incomplete job when the SDK cannot poll it', async () => {
		const { uploadVideo } = await import('../nodes/Bluesky/V2/videoOperations');
		const agent = makeAgent({
			uploadVideo: jest.fn().mockResolvedValue({
				success: true,
				data: { jobStatus: { jobId: 'pending', state: 'JOB_STATE_ENCODING' } },
			}),
		});
		await expect(uploadVideo.call(makeContext(makeItems()), agent, 'video')).rejects.toThrow(/cannot be polled/);
	});

	it('rejects completed status without a real blob', async () => {
		const { uploadVideo } = await import('../nodes/Bluesky/V2/videoOperations');
		const agent = makeAgent({
			uploadVideo: jest.fn().mockResolvedValue({
				success: true,
				data: { jobStatus: { jobId: 'done', state: 'JOB_STATE_COMPLETED' } },
			}),
		});
		await expect(uploadVideo.call(makeContext(makeItems()), agent, 'video')).rejects.toThrow(/valid processed blob/);
	});

	it('requires MP4 rather than mislabeling unsupported video encoding', async () => {
		const { uploadVideo } = await import('../nodes/Bluesky/V2/videoOperations');
		const items = makeItems();
		items[0].binary.video.mimeType = 'video/webm';
		await expect(uploadVideo.call(makeContext(items), { api: {} } as any, 'video')).rejects.toThrow(/requires video\/mp4/);
	});
});
