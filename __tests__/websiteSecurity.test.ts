import { assertPublicMetadataUrl, readLimitedImageResponse } from '../nodes/Bluesky/V2/websiteSecurity';

describe('Open Graph URL security', () => {
	it('permits a publicly routable IPv4 literal without external network access', async () => {
		await expect(assertPublicMetadataUrl('https://8.8.8.8/example')).resolves.toBeUndefined();
	});
	it.each([
		'file:///etc/passwd', 'ftp://127.0.0.1/', 'http://localhost/',
		'http://metadata.google.internal/', 'http://127.0.0.1/',
		'http://10.0.0.3/', 'http://172.16.0.1/', 'http://192.168.1.1/',
		'http://169.254.169.254/latest/meta-data/', 'http://[::1]/',
		'http://user:pass@8.8.8.8/', 'not-a-url',
	])('rejects unsafe metadata destinations (%s)', async (url) => {
		await expect(assertPublicMetadataUrl(url)).rejects.toThrow();
	});
});

describe('Open Graph thumbnail limits', () => {
	it('reads small images successfully', async () => {
		const response = new Response(Buffer.from([1, 2, 3]), {
			headers: { 'content-type': 'image/png' },
		});
		await expect(readLimitedImageResponse(response)).resolves.toEqual(Buffer.from([1, 2, 3]));
	});
	it('rejects oversized bodies even without Content-Length', async () => {
		const response = new Response(Buffer.alloc(12), {
			headers: { 'content-type': 'image/png' },
		});
		await expect(readLimitedImageResponse(response, 10)).rejects.toThrow('maximum permitted size');
	});
	it('rejects non-image responses', async () => {
		const response = new Response('hello', { headers: { 'content-type': 'text/html' } });
		await expect(readLimitedImageResponse(response)).rejects.toThrow('image MIME type');
	});
});
