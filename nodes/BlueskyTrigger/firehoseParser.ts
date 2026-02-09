/**
 * Helper module for parsing AT Protocol firehose messages
 * The firehose sends messages in CAR (Content Addressable aRchive) format with CBOR encoding
 */

import { cborDecode } from '@atproto/lex-cbor';
import { LoggerProxy } from 'n8n-workflow';

export interface CommitData {
	op: 'create' | 'update' | 'delete';
	path: string;
	cid?: string;
	record?: any;
}

export interface FirehoseCommit {
	$type: string;
	seq: number;
	rebase: boolean;
	tooBig: boolean;
	repo: string;
	commit: {
		cid: string;
		rev: string;
	};
	time: string;
	ops?: CommitData[];
	blocks?: Uint8Array;
	blobs?: string[];
}

export interface ParsedMessage {
	type: string;
	seq: number;
	repo: string;
	time: string;
	commit: {
		cid: string;
		rev: string;
	};
	operations: Array<{
		action: string;
		collection: string;
		rkey: string;
		cid?: string;
		record?: any;
	}>;
	rebase: boolean;
	tooBig: boolean;
}

/**
 * LabelMessage represents messages from the label subscription stream
 * It has a minimal required structure but can contain additional fields
 */
export interface LabelMessage {
	type: 'label';
	[key: string]: unknown;
}

/**
 * Parse a firehose message
 * Note: Full CAR/CBOR parsing requires additional dependencies
 * This is a simplified version that handles the common message format
 */
function isFirehoseCommit(value: unknown): value is FirehoseCommit {
	if (!value || typeof value !== 'object') return false;
	const msg = value as Partial<FirehoseCommit>;
	return (
		typeof msg.$type === 'string' &&
		typeof msg.seq === 'number' &&
		typeof msg.repo === 'string' &&
		typeof msg.time === 'string' &&
		typeof msg.rebase === 'boolean' &&
		typeof msg.tooBig === 'boolean' &&
		typeof msg.commit?.cid === 'string' &&
		typeof msg.commit?.rev === 'string'
	);
}

export function parseFirehoseMessage(data: Buffer): ParsedMessage | null {
	let message: FirehoseCommit | null = null;

	try {
		const decoded = cborDecode(data) as unknown;
		if (isFirehoseCommit(decoded)) {
			message = decoded;
		}
	} catch (error) {
		// Fall back to JSON parsing for tests or non-CBOR payloads.
		try {
			const text = data.toString('utf8');
			const parsed = JSON.parse(text) as unknown;
			if (isFirehoseCommit(parsed)) {
				message = parsed;
			}
		} catch (jsonError) {
			return null;
		}
	}

	if (!message) {
		return null;
	}

	// Parse operations
	const operations = (message.ops || [])
		.map((op) => {
			if (!op?.path) {
				return null;
			}

			// Expected format: "collection/rkey" where collection is the record type
			// (e.g., "app.bsky.feed.post") and rkey is the record key identifier
			const segments = String(op.path).split('/').filter(Boolean);

			// Validate path format - must have exactly 2 segments (collection and rkey)
			if (segments.length !== 2) {
				LoggerProxy.warn(
					`Skipping operation with invalid path format: "${op.path}" (expected "collection/rkey")`,
				);
				return null;
			}

			const [collection, rkey] = segments;

			return {
				action: op.op,
				collection,
				rkey,
				cid: op.cid,
				record: op.record,
			};
		})
		.filter((op): op is NonNullable<typeof op> => Boolean(op));

	return {
		type: message.$type,
		seq: message.seq,
		repo: message.repo,
		time: message.time,
		commit: message.commit,
		operations,
		rebase: message.rebase,
		tooBig: message.tooBig,
	};
}

/**
 * Check if a message matches the given filters
 */
export function matchesFilters(
	message: ParsedMessage,
	filters: {
		collection?: string;
		repo?: string;
		action?: string;
	},
): boolean {
	if (filters.repo && message.repo !== filters.repo) {
		return false;
	}

	if (filters.collection || filters.action) {
		const hasMatchingOp = message.operations.some((op) => {
			// Note: Using substring matching (includes) to support flexible filtering:
			// - Exact match: "app.bsky.feed.post" matches "app.bsky.feed.post"
			// - Namespace match: "app.bsky.feed" matches "app.bsky.feed.post", "app.bsky.feed.like", etc.
			// - Partial match: "post" matches "app.bsky.feed.post"
			// This allows users to filter by collection type at various levels of specificity.
			if (filters.collection && !op.collection.includes(filters.collection)) {
				return false;
			}
			if (filters.action && op.action !== filters.action) {
				return false;
			}
			return true;
		});

		if (!hasMatchingOp) {
			return false;
		}
	}

	return true;
}
