import { ICredentialTestRequest, ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class BlueskyApi implements ICredentialType {
	displayName = 'Bluesky';
	name = 'blueskyApi';
	documentationUrl = 'https://docs.bsky.app/docs/get-started';
	// Relative to this credentials file, go up to nodes/Bluesky for the icon
	icon = 'file:../nodes/Bluesky/bluesky.svg' as Icon;

	properties: INodeProperties[] = [
		{
			displayName: 'Identifier',
			name: 'identifier',
			description:
				'Your Bluesky handle (e.g. alice.bsky.social), email address, or DID (e.g. did:plc:...).' +
				' The identifier is sent to com.atproto.server.createSession for authentication.',
			type: 'string',
			placeholder: 'alice.bsky.social',
			default: '',
			required: true,
		},
		{
			displayName: 'App Password',
			name: 'appPassword',
			description:
				'An App Password generated from your Bluesky account settings (Settings → App Passwords).' +
				' App Passwords provide limited-scope access and cannot delete your account.' +
				' Do not use your main account password.',
			type: 'string',
			typeOptions: { password: true },
			placeholder: 'xxxx-xxxx-xxxx-xxxx',
			default: '',
			required: true,
		},
		{
			displayName: 'Service URL',
			name: 'serviceUrl',
			description:
				'The URL of your AT Protocol Personal Data Server (PDS).' +
				' For most Bluesky users this is https://bsky.social.' +
				' Self-hosted PDS operators should enter their own PDS URL.' +
				' Note: unauthenticated read-only queries can target the public AppView at https://public.api.bsky.app.',
			type: 'string',
			placeholder: 'https://bsky.social',
			default: 'https://bsky.social',
			required: true,
		},
	];

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.serviceUrl}}',
			url: '/xrpc/com.atproto.server.createSession',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: {
				identifier: '={{$credentials.identifier}}',
				password: '={{$credentials.appPassword}}',
			},
		},
	};
}
