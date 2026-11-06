/**
 * Upload a Bluesky video, waiting for the video service to return a processed blob.
 * Never fabricate a blob reference or substitute an unprocessed PDS blob.
 */
import { BskyAgent, ComAtprotoRepoUploadBlob } from '@atproto/api';
import { IExecuteFunctions, LoggerProxy, NodeOperationError } from 'n8n-workflow';

type VideoBlob = ComAtprotoRepoUploadBlob.OutputSchema['blob'];
type VideoJobStatus = {
	jobId: string;
	state: string;
	blob?: VideoBlob;
	error?: string;
	message?: string;
	failureCode?: string;
};
type VideoJobResponse = { success: boolean; data?: { jobStatus?: VideoJobStatus } };
type VideoApi = {
	uploadVideo?: (bytes: Uint8Array, options: { encoding: 'video/mp4' }) => Promise<VideoJobResponse>;
	getJobStatus?: (params: { jobId: string }) => Promise<VideoJobResponse>;
	getUploadLimits?: () => Promise<{
		success: boolean;
		data: {
			canUpload: boolean;
			remainingDailyVideos?: number;
			remainingDailyBytes?: number;
			message?: string;
		};
	}>;
};

// Two minutes of bounded polling. No post is created while the job is incomplete.
const VIDEO_POLL_INTERVAL_MS = 2_000;
const MAX_VIDEO_POLLS = 60;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export async function uploadVideo(
	this: IExecuteFunctions,
	agent: BskyAgent,
	binaryPropertyName: string,
	altText?: string,
	itemIndex: number = 0,
): Promise<{ blob: VideoBlob; altText: string; aspectRatio?: { width: number; height: number } }> {
	const node = this.getNode();
	try {
		const item = this.getInputData()[itemIndex];
		if (!item) throw new Error('Input item at index ' + itemIndex + ' does not exist');
		if (!item.binary?.[binaryPropertyName]) {
			throw new Error('Binary property ' + binaryPropertyName + ' not found on input item ' + itemIndex);
		}

		const metadata = item.binary[binaryPropertyName];
		// The official app.bsky.video.uploadVideo lexicon currently accepts video/mp4.
		if (metadata.mimeType !== 'video/mp4') {
			throw new Error('Bluesky video upload requires video/mp4; received ' + (metadata.mimeType || 'unknown'));
		}
		const bytes = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
		if (!bytes || bytes.length === 0 || bytes.length > MAX_VIDEO_BYTES) {
			throw new Error('Video must be non-empty and at most 100 MiB');
		}

		// Use the SDK's video service routing. Do not call repo.uploadBlob for videos.
		const api = agent.api?.app?.bsky?.video as unknown as VideoApi | undefined;
		if (typeof api?.uploadVideo !== 'function') {
			throw new Error('The installed AT Protocol SDK does not expose app.bsky.video.uploadVideo');
		}

		const uploaded = await api.uploadVideo(bytes, { encoding: 'video/mp4' });
		let status = uploaded.data?.jobStatus;
		if (!uploaded.success || !status) throw new Error('Video service returned no processing job');

		for (let poll = 0; poll <= MAX_VIDEO_POLLS; poll++) {
			if (status.state === 'JOB_STATE_FAILED') {
				throw new Error('Video processing failed: ' + (status.failureCode || status.error || status.message || 'unknown error'));
			}
			if (status.state === 'JOB_STATE_COMPLETED') {
				if (!status.blob?.ref || !status.blob.mimeType || typeof status.blob.size !== 'number') {
					throw new Error('Video service reported completion without a valid processed blob');
				}
				return { blob: status.blob, altText: altText || '' };
			}
			if (!status.jobId || typeof api.getJobStatus !== 'function') {
				throw new Error('Video is still processing, but its job cannot be polled with the installed SDK');
			}
			if (poll === MAX_VIDEO_POLLS) break;
			await new Promise<void>((resolve) => setTimeout(resolve, VIDEO_POLL_INTERVAL_MS));
			const current = await api.getJobStatus({ jobId: status.jobId });
			if (!current.success || !current.data?.jobStatus) {
				throw new Error('Unable to retrieve Bluesky video processing job status');
			}
			status = current.data.jobStatus;
		}

		throw new Error('Video processing did not complete within the two-minute polling limit; no post was created');
	} catch (error) {
		LoggerProxy.error('Bluesky video upload failed', {
			error: error instanceof Error ? error.message : String(error),
		});
		throw new NodeOperationError(node, error, {
			message: 'Failed to upload processed video from binary property ' + binaryPropertyName +
				': ' + (error instanceof Error ? error.message : String(error)),
			itemIndex,
		});
	}
}

/**
 * Unknown upload availability is not equivalent to permission to upload.
 */
export async function getVideoUploadLimits(agent: BskyAgent): Promise<{
	canUpload: boolean;
	remainingDailyVideos?: number;
	remainingDailyBytes?: number;
	message?: string;
	error?: string;
}> {
	try {
		const api = agent.api?.app?.bsky?.video as unknown as VideoApi | undefined;
		if (typeof api?.getUploadLimits === 'function') {
			const response = await api.getUploadLimits();
			if (response.success) return response.data;
		}
	} catch (error) {
		LoggerProxy.warn('Unable to verify video upload limits', {
			error: error instanceof Error ? error.message : String(error),
		});
	}
	return {
		canUpload: false,
		message: 'Video upload availability not verified. A compatible video service and SDK are required.',
	};
}
