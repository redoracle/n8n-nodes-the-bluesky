/**
 * Video upload operations for Bluesky AT Protocol
 * Handles video uploads, processing status checks, and embedding
 *
 * Status Update (May 2025):
 * - Video infrastructure is being actively developed by Bluesky
 * - Database migrations and video processing pipeline exist in the codebase
 * - Video APIs exist in client but server implementation NOT YET DEPLOYED (confirmed via testing)
 * - All video APIs return XRPCNotSupported (404) as of May 25, 2025
 * - Current approach uses blob upload but videos show "Video not found" on Bluesky platform
 */

import { BskyAgent } from '@atproto/api';
import { IExecuteFunctions, LoggerProxy, NodeOperationError } from 'n8n-workflow';

// URL documenting current Bluesky video processing status and recommended workarounds.
// Update this constant as server-side support evolves.
const VIDEO_STATUS_DOC_URL = 'https://github.com/bluesky-social/docs/blob/main/video-processing.md';

/**
 * Upload a video to Bluesky using the current available infrastructure
 *
 * This implementation follows the patterns observed in Bluesky's codebase:
 * - Uses blob upload as the foundation (working)
 * - Structures video embeds according to app.bsky.embed.video schema
 * - Prepares for video processing pipeline integration when available
 */
export async function uploadVideo(
	this: IExecuteFunctions,
	agent: BskyAgent,
	binaryPropertyName: string,
	altText?: string,
	itemIndex: number = 0,
): Promise<{
	blob: any;
	altText: string;
	aspectRatio?: { width: number; height: number };
}> {
	const node = this.getNode();

	try {
		// Get video binary data
		const items = this.getInputData();
		if (!items[itemIndex]) {
			throw new NodeOperationError(node, `Item at index ${itemIndex} does not exist`);
		}

		const item = items[itemIndex];
		if (!item.binary || !item.binary[binaryPropertyName]) {
			throw new NodeOperationError(
				node,
				`Binary property '${binaryPropertyName}' not found in input item at index ${itemIndex}. ` +
					`Available binary properties: ${Object.keys(item.binary || {}).join(', ') || 'none'}`,
			);
		}

		const binaryData = await this.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
		if (!binaryData) {
			throw new NodeOperationError(
				node,
				`Failed to get binary data for property '${binaryPropertyName}'`,
			);
		}

		// Validate it's a video file (basic check)
		const binaryMetadata = item.binary[binaryPropertyName];
		if (!binaryMetadata.mimeType?.startsWith('video/')) {
			throw new NodeOperationError(
				node,
				`Binary property '${binaryPropertyName}' does not contain video data. ` +
					`Found MIME type: ${binaryMetadata.mimeType || 'unknown'}`,
			);
		}

		// Check file size (AT Protocol allows up to 100MB for videos)
		const maxSize = 100 * 1024 * 1024; // 100MB
		if (binaryData.length > maxSize) {
			throw new NodeOperationError(
				node,
				`Video file is too large. Maximum size is 100MB, but file is ${Math.round(binaryData.length / 1024 / 1024)}MB`,
			);
		}

		LoggerProxy.info(
			`Uploading video: ${binaryData.length} bytes, MIME: ${binaryMetadata.mimeType}`,
		);

		// First try the proper video upload API (optimistic approach)
		try {
			LoggerProxy.info(`Attempting video upload API...`);

			// Check if video APIs are now available
			if (typeof agent.api?.app?.bsky?.video?.uploadVideo === 'function') {
				const videoUpload = await agent.api.app.bsky.video.uploadVideo(binaryData, {
					encoding: 'video/mp4',
				});

				if (videoUpload.success) {
					LoggerProxy.info(`Video processing initiated via video API`);

					// The response should contain job status information
					const jobStatus = videoUpload.data.jobStatus;

					// For now, we'll convert this to the expected blob format
					// Once the processing completes, this would contain the proper blob reference
					return {
						blob: {
							$type: 'blob',
							ref: jobStatus.blob?.ref || 'processing',
							mimeType: binaryMetadata.mimeType,
							size: binaryData.length,
						},
						altText: altText || '',
						// aspectRatio will be determined by video processing
					};
				}
			}
		} catch (videoApiError: any) {
			LoggerProxy.info(
				`Video API not yet available: ${videoApiError instanceof Error ? videoApiError.message : String(videoApiError)}`,
			);
			// Fall through to blob upload approach
		}

		// Fallback to blob upload (current working approach)
		LoggerProxy.info(`Using blob upload for video (video processing API not yet available)`);

		const uploadResponse = await agent.api.com.atproto.repo.uploadBlob(binaryData, {
			encoding: binaryMetadata.mimeType,
		});

		if (!uploadResponse.success || !uploadResponse.data.blob) {
			throw new NodeOperationError(node, 'Video upload failed - no blob returned');
		}

		// Consolidated status message: upload succeeded but processing may be unavailable.
		LoggerProxy.warn(
			`Video blob uploaded successfully, but Bluesky's server-side video processing may not be available yet. ` +
				`Uploaded blobs can be used, but they may not be playable on the platform until processing is enabled. ` +
				`See ${VIDEO_STATUS_DOC_URL} for current status and recommended workarounds.`,
		);

		return {
			blob: uploadResponse.data.blob,
			altText: altText || '',
			// Note: aspectRatio will be handled by Bluesky when video processing is enabled
		};
	} catch (error) {
		LoggerProxy.error(`Video upload failed`, {
			error: error instanceof Error ? error.message : String(error),
		});
		throw new NodeOperationError(node, error, {
			message: `Failed to upload video from binary property '${binaryPropertyName}': ${error.message}`,
			itemIndex: itemIndex,
		});
	}
}

/**
 * Get video upload limits for the authenticated user
 *
 * This function now attempts to use the proper API first, with fallback to default limits
 */
export async function getVideoUploadLimits(agent: BskyAgent): Promise<{
	canUpload: boolean;
	remainingDailyVideos?: number;
	remainingDailyBytes?: number;
	message?: string;
	error?: string;
}> {
	try {
		// Try to use the proper video upload limits API
		if (typeof agent.api?.app?.bsky?.video?.getUploadLimits === 'function') {
			LoggerProxy.info(`Attempting to get video upload limits via API...`);

			const limits = await agent.api.app.bsky.video.getUploadLimits();
			if (limits.success) {
				LoggerProxy.info(`Retrieved video upload limits from API`);
				return limits.data;
			}
		}
	} catch (error: any) {
		LoggerProxy.info(
			`Video upload limits API not yet available: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
		// Fall through to default limits
	}

	// Return default limits based on current understanding and AT Protocol blob upload specifications
	return {
		canUpload: true,
		message: `Video uploads currently use blob upload (100MB max per file). Server-side video processing may not be available as of this writing; see ${VIDEO_STATUS_DOC_URL} for current status and workarounds.`,
	};
}
