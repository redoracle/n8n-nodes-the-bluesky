/**
 * Construct an AT Protocol subscription endpoint from an origin.
 * Never attach bearer tokens to unencrypted WebSockets.
 */
export function buildSubscriptionEndpoint(serviceEndpoint: string, stream: string): string {
	if (stream !== 'subscribeRepos' && stream !== 'subscribeLabels') {
		throw new Error('Unsupported Bluesky subscription stream');
	}
	let origin: URL;
	try {
		origin = new URL(serviceEndpoint);
	} catch {
		throw new Error('Service endpoint must be a valid WebSocket origin URL');
	}
	if (origin.protocol !== 'ws:' && origin.protocol !== 'wss:') {
		throw new Error('Service endpoint must use ws:// or wss://');
	}
	if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') {
		throw new Error('Service endpoint must be an origin without credentials, path, query or fragment');
	}
	if (stream === 'subscribeLabels' && origin.protocol !== 'wss:') {
		throw new Error('Authenticated label subscriptions require wss://');
	}
	const route = stream === 'subscribeRepos'
		? 'com.atproto.sync.subscribeRepos'
		: 'com.atproto.label.subscribeLabels';
	return new URL(`/xrpc/${route}`, origin).toString();
}
