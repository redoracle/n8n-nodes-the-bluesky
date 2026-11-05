import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

// Keep address families separate: Node can match IPv4 addresses against IPv4-mapped IPv6 rules.
const BLOCKED_IPV4 = new BlockList();
const BLOCKED_IPV6 = new BlockList();
const IPv4_RANGES: Array<[string, number]> = [
	['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
	['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24],
	['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
	['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4],
	['240.0.0.0', 4],
];
const IPv6_RANGES: Array<[string, number]> = [
	['::', 128], ['::1', 128], ['::ffff:0:0', 96],
	['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
	['2001:db8::', 32], ['2002::', 16],
];
for (const [subnet, prefix] of IPv4_RANGES) BLOCKED_IPV4.addSubnet(subnet, prefix, 'ipv4');
for (const [subnet, prefix] of IPv6_RANGES) BLOCKED_IPV6.addSubnet(subnet, prefix, 'ipv6');

function isPublicAddress(address: string): boolean {
	const family = isIP(address);
	if (family === 4) return !BLOCKED_IPV4.check(address, 'ipv4');
	if (family === 6) return !BLOCKED_IPV6.check(address, 'ipv6');
	return false;
}

/**
 * Reject untrusted protocols, local names and private/reserved resolved addresses.
 * This is defense in depth, not a replacement for network egress restrictions:
 * DNS rebinding between lookup and request remains possible.
 */
export async function assertPublicMetadataUrl(rawUrl: string): Promise<void> {
	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch {
		throw new Error('Open Graph URL must be a valid absolute HTTP(S) URL');
	}
	if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
		throw new Error('Open Graph URL must use HTTP(S) without embedded credentials');
	}

	const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
	if (
		!hostname.includes('.') ||
		['localhost', 'local', 'internal', 'home', 'test', 'invalid', 'example', 'onion']
			.some((name) => hostname === name || hostname.endsWith(`.${name}`))
	) {
		throw new Error('Open Graph URL must use a public hostname');
	}

	const addresses = isIP(hostname)
		? [hostname]
		: (await lookup(hostname, { all: true })).map((entry) => entry.address);
	if (addresses.length === 0 || addresses.some((address) => !isPublicAddress(address))) {
		throw new Error('Open Graph URL resolves to a non-public network address');
	}
}

/** Read a thumbnail into memory with a hard limit; avoid unbounded arrayBuffer(). */
export async function readLimitedImageResponse(
	response: Response,
	maxBytes: number = 1_000_000,
): Promise<Buffer> {
	if (!response.headers.get('content-type')?.toLowerCase().startsWith('image/')) {
		throw new Error('Open Graph thumbnail response must have an image MIME type');
	}
	const contentLength = Number(response.headers.get('content-length') || 0);
	if (Number.isFinite(contentLength) && contentLength > maxBytes) {
		throw new Error('Open Graph thumbnail exceeds the maximum permitted size');
	}
	if (!response.body) throw new Error('Open Graph thumbnail response has no body');

	const reader = response.body.getReader();
	const chunks: Buffer[] = [];
	let total = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > maxBytes) throw new Error('Open Graph thumbnail exceeds the maximum permitted size');
			chunks.push(Buffer.from(value));
		}
	} finally {
		await reader.cancel().catch(() => undefined);
		reader.releaseLock();
	}
	return Buffer.concat(chunks, total);
}
