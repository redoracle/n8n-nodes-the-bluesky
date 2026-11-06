import { buildSubscriptionEndpoint } from '../nodes/BlueskyTrigger/subscriptionEndpoint';

describe('subscription endpoint security', () => {
	it('normalizes encrypted repository and label endpoints', () => {
		expect(buildSubscriptionEndpoint('wss://bsky.network/', 'subscribeRepos')).toBe(
			'wss://bsky.network/xrpc/com.atproto.sync.subscribeRepos',
		);
		expect(buildSubscriptionEndpoint('wss://bsky.network', 'subscribeLabels')).toBe(
			'wss://bsky.network/xrpc/com.atproto.label.subscribeLabels',
		);
	});
	it('allows plaintext only for unauthenticated repository streams', () => {
		expect(buildSubscriptionEndpoint('ws://127.0.0.1:8080', 'subscribeRepos')).toBe(
			'ws://127.0.0.1:8080/xrpc/com.atproto.sync.subscribeRepos',
		);
		expect(() => buildSubscriptionEndpoint('ws://bsky.network', 'subscribeLabels')).toThrow('require wss://');
	});
	it.each([
		'http://example.com', 'https://example.com', 'file:///tmp/socket',
		'wss://user:secret@example.com', 'wss://example.com/custom',
		'wss://example.com/?token=secret', 'wss://example.com/#anchor', 'not a url',
	])('rejects invalid or ambiguous origins (%s)', (endpoint) => {
		expect(() => buildSubscriptionEndpoint(endpoint, 'subscribeRepos')).toThrow();
	});
	it('rejects unknown stream types', () => {
		expect(() => buildSubscriptionEndpoint('wss://example.com', 'invalid')).toThrow(
			'Unsupported Bluesky subscription stream',
		);
	});
});
