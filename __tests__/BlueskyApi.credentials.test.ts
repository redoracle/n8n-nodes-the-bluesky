import { INodeProperties } from 'n8n-workflow';
import { BlueskyApi } from '../credentials/BlueskyApi.credentials';

describe('BlueskyApi Credentials', () => {
	let credentials: BlueskyApi;

	beforeEach(() => {
		credentials = new BlueskyApi();
	});

	// --- Class metadata ---

	test('should have correct display name', () => {
		expect(credentials.displayName).toBe('Bluesky');
	});

	test('should have correct internal name', () => {
		expect(credentials.name).toBe('blueskyApi');
	});

	test('should link to Bluesky documentation', () => {
		expect(credentials.documentationUrl).toBe('https://docs.bsky.app/docs/get-started');
	});

	test('should have an icon referencing bluesky.svg', () => {
		expect(credentials.icon).toContain('bluesky.svg');
	});

	// --- Properties definition ---

	test('should define exactly 3 credential properties', () => {
		expect(credentials.properties).toHaveLength(3);
	});

	test('should define properties in correct order: identifier, appPassword, serviceUrl', () => {
		const names = credentials.properties.map((p) => p.name);
		expect(names).toEqual(['identifier', 'appPassword', 'serviceUrl']);
	});

	// --- Identifier field ---

	describe('identifier property', () => {
		let identifierProp!: INodeProperties;

		beforeAll(() => {
			const found = credentials.properties.find((p) => p.name === 'identifier');
			expect(found).toBeDefined();
			identifierProp = found as INodeProperties;
		});

		test('should be required', () => {
			expect(identifierProp.required).toBe(true);
		});

		test('should be a string type', () => {
			expect(identifierProp.type).toBe('string');
		});

		test('should have an empty default', () => {
			expect(identifierProp.default).toBe('');
		});

		test('should have a placeholder showing example handle', () => {
			expect(identifierProp.placeholder).toBeDefined();
			expect(identifierProp.placeholder).toContain('.bsky.social');
		});

		test('should mention handle, email, and DID in description', () => {
			const desc = (identifierProp.description || '').toLowerCase();
			expect(desc).toContain('handle');
			expect(desc).toContain('email');
			expect(desc).toContain('did');
		});

		test('should reference createSession endpoint in description', () => {
			expect(identifierProp.description).toContain('com.atproto.server.createSession');
		});
	});

	// --- App Password field ---

	describe('appPassword property', () => {
		test('should be required', () => {
			const prop = credentials.properties.find((p) => p.name === 'appPassword');
			expect(prop).toBeDefined();
			expect(prop!.required).toBe(true);
		});

		test('should be a password field', () => {
			const prop = credentials.properties.find((p) => p.name === 'appPassword');
			expect(prop!.type).toBe('string');
			expect(prop!.typeOptions).toEqual({ password: true });
		});

		test('should have an empty default', () => {
			const prop = credentials.properties.find((p) => p.name === 'appPassword');
			expect(prop!.default).toBe('');
		});

		test('should warn against using main account password', () => {
			const prop = credentials.properties.find((p) => p.name === 'appPassword');
			const desc = prop!.description!.toLowerCase();
			expect(desc).toContain('do not use your main account password');
		});

		test('should mention App Passwords are generated from settings', () => {
			const prop = credentials.properties.find((p) => p.name === 'appPassword');
			expect(prop!.description).toContain('Settings');
			expect(prop!.description).toContain('App Passwords');
		});
	});

	// --- Service URL field ---

	describe('serviceUrl property', () => {
		test('should be required', () => {
			const prop = credentials.properties.find((p) => p.name === 'serviceUrl');
			expect(prop).toBeDefined();
			expect(prop!.required).toBe(true);
		});

		test('should default to https://bsky.social', () => {
			const prop = credentials.properties.find((p) => p.name === 'serviceUrl');
			expect(prop!.default).toBe('https://bsky.social');
		});

		test('should be a string type', () => {
			const prop = credentials.properties.find((p) => p.name === 'serviceUrl');
			expect(prop!.type).toBe('string');
		});

		test('should mention PDS in description', () => {
			const prop = credentials.properties.find((p) => p.name === 'serviceUrl');
			expect(prop!.description).toContain('PDS');
		});

		test('should mention self-hosted PDS support', () => {
			const prop = credentials.properties.find((p) => p.name === 'serviceUrl');
			const desc = prop!.description!.toLowerCase();
			expect(desc).toContain('self-hosted');
		});

		test('should mention AppView URL for read-only queries', () => {
			const prop = credentials.properties.find((p) => p.name === 'serviceUrl');
			expect(prop!.description).toContain('public.api.bsky.app');
		});
	});

	// --- Test request (credential verification) ---

	describe('test request configuration', () => {
		test('should be defined', () => {
			expect(credentials.test).toBeDefined();
		});

		test('should target the createSession XRPC endpoint', () => {
			expect(credentials.test.request.url).toBe('/xrpc/com.atproto.server.createSession');
		});

		test('should use POST method', () => {
			expect(credentials.test.request.method).toBe('POST');
		});

		test('should use serviceUrl as base URL via expression', () => {
			expect(credentials.test.request.baseURL).toBe('={{$credentials.serviceUrl}}');
		});

		test('should send identifier in the request body', () => {
			const body = credentials.test.request.body as Record<string, string>;
			expect(body.identifier).toBe('={{$credentials.identifier}}');
		});

		test('should send appPassword as password in the request body', () => {
			const body = credentials.test.request.body as Record<string, string>;
			expect(body.password).toBe('={{$credentials.appPassword}}');
		});

		test('should set Content-Type header to application/json', () => {
			const headers = credentials.test.request.headers as Record<string, string>;
			expect(headers['Content-Type']).toBe('application/json');
		});

		test('should not include any authorization header (session not yet established)', () => {
			const headers = credentials.test.request.headers as Record<string, string> | undefined;
			expect(headers?.['Authorization']).toBeUndefined();
		});
	});

	// --- AT Protocol compliance checks ---

	describe('AT Protocol API compliance', () => {
		test('matches AT Protocol expectations (NSID, serviceUrl default, identifier formats)', () => {
			// The NSID for session creation is com.atproto.server.createSession
			expect(credentials.test.request.url).toContain('com.atproto.server.createSession');

			const serviceProp = credentials.properties.find((p) => p.name === 'serviceUrl');
			expect(serviceProp).toBeDefined();
			expect((serviceProp as any).default).toBe('https://bsky.social');

			const idProp = credentials.properties.find((p) => p.name === 'identifier');
			expect(idProp).toBeDefined();
			const desc = (idProp as any).description || '';
			expect(desc).toMatch(/handle/i);
			expect(desc).toMatch(/email/i);
			expect(desc).toMatch(/did/i);
		});

		test('body fields match createSession input schema (identifier + password)', () => {
			const body = credentials.test.request.body as Record<string, string>;
			// createSession expects { identifier, password } per the lexicon
			expect(Object.keys(body).sort()).toEqual(['identifier', 'password']);
		});
	});
});
