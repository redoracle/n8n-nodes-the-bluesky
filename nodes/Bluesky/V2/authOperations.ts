import { AtpAgent } from '@atproto/api';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const authProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['auth'],
			},
		},
		options: [
			{
				name: 'Create Session',
				value: 'createSession',
				description: 'Create a session and return access/refresh tokens',
				action: 'Create a session',
			},
			{
				name: 'Refresh Session',
				value: 'refreshSession',
				description: 'Refresh the current session using the stored refresh token',
				action: 'Refresh session',
			},
			{
				name: 'Delete Session',
				value: 'deleteSession',
				description: 'Invalidate the current session',
				action: 'Delete session',
			},
			{
				name: 'Create App Password',
				value: 'createAppPassword',
				description: 'Create a new app password for the account',
				action: 'Create app password',
			},
			{
				name: 'Create Invite Code',
				value: 'createInviteCode',
				description: 'Create a single invite code (admin/host only)',
				action: 'Create invite code',
			},
			{
				name: 'Rotate Signing Key',
				value: 'rotateSigningKey',
				description: 'Rotate signing key for the repository (admin/host only)',
				action: 'Rotate signing key',
			},
		],
		default: 'createSession',
	},
	{
		displayName: 'Identifier (Handle or DID)',
		name: 'identifier',
		type: 'string',
		default: '',
		description: 'Optional override for session creation. If omitted, uses credentials.',
		displayOptions: {
			show: {
				resource: ['auth'],
				operation: ['createSession'],
			},
		},
	},
	{
		displayName: 'App Password',
		name: 'password',
		type: 'string',
		default: '',
		typeOptions: { password: true },
		description: 'Optional override for session creation. If omitted, uses credentials.',
		displayOptions: {
			show: {
				resource: ['auth'],
				operation: ['createSession'],
			},
		},
	},
	{
		displayName: 'App Password Name',
		name: 'appPasswordName',
		type: 'string',
		default: '',
		required: true,
		description: 'Name for the new app password (for your reference)',
		displayOptions: {
			show: {
				resource: ['auth'],
				operation: ['createAppPassword'],
			},
		},
	},
	{
		displayName: 'Invite Use Count',
		name: 'inviteUseCount',
		type: 'number',
		default: 1,
		required: true,
		typeOptions: {
			minValue: 1,
		},
		description: 'Number of times the invite code can be used',
		displayOptions: {
			show: {
				resource: ['auth'],
				operation: ['createInviteCode'],
			},
		},
	},
	{
		displayName: 'Invite For Account (DID)',
		name: 'inviteForAccount',
		type: 'string',
		default: '',
		description: 'Optional DID to restrict invite code to a specific account',
		displayOptions: {
			show: {
				resource: ['auth'],
				operation: ['createInviteCode'],
			},
		},
	},
	{
		displayName: 'Rotate Signing Key Body (JSON)',
		name: 'rotateSigningKeyBody',
		type: 'string',
		default: '',
		typeOptions: {
			rows: 4,
		},
		description:
			'Optional raw JSON body for com.atproto.server.rotateSigningKey. Leave empty for default behavior.',
		displayOptions: {
			show: {
				resource: ['auth'],
				operation: ['rotateSigningKey'],
			},
		},
	},
];

export async function createSessionOperation(
	agent: AtpAgent,
	identifier: string,
	password: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.api.com.atproto.server.createSession({
		identifier,
		password,
	});

	return [
		{
			json: response.data as unknown as IDataObject,
		},
	];
}

export async function refreshSessionOperation(agent: AtpAgent): Promise<INodeExecutionData[]> {
	const response = await agent.api.com.atproto.server.refreshSession();

	return [
		{
			json: response.data as unknown as IDataObject,
		},
	];
}

export async function deleteSessionOperation(agent: AtpAgent): Promise<INodeExecutionData[]> {
	await agent.api.com.atproto.server.deleteSession();

	return [
		{
			json: { success: true } as IDataObject,
		},
	];
}

export async function createAppPasswordOperation(
	agent: AtpAgent,
	name: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.api.com.atproto.server.createAppPassword({
		name,
	});

	return [
		{
			json: response.data as unknown as IDataObject,
		},
	];
}

export async function createInviteCodeOperation(
	agent: AtpAgent,
	useCount: number,
	forAccount?: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.api.com.atproto.server.createInviteCode({
		useCount,
		...(forAccount ? { forAccount } : {}),
	});

	return [
		{
			json: response.data as unknown as IDataObject,
		},
	];
}

export async function rotateSigningKeyOperation(
	agent: AtpAgent,
	rotateSigningKeyBody?: string,
): Promise<INodeExecutionData[]> {
	let body: unknown | undefined = undefined;

	if (rotateSigningKeyBody && rotateSigningKeyBody.trim()) {
		try {
			body = JSON.parse(rotateSigningKeyBody);
		} catch (error) {
			throw new Error(
				`Invalid JSON for rotateSigningKey body: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	// Ensure the agent exposes a low-level `call` method. Some agent versions
	// may not publicly type `call`, so use a narrow interface and a runtime
	// guard to provide a clear error if it's missing.
	type AtpAgentWithCall = { call: (uri: string, opts?: any, body?: any) => Promise<any> };
	function ensureAgentHasCall(a: unknown): asserts a is AtpAgentWithCall {
		if (!a || typeof (a as any).call !== 'function') {
			throw new Error(
				'The provided AtpAgent does not expose a `call` method needed for rotateSigningKey',
			);
		}
	}

	ensureAgentHasCall(agent);

	const response = await agent.call('com.atproto.server.rotateSigningKey', undefined, body);

	const data = response?.data ?? response;
	if (!data) {
		// API returned no data; treat as success but be explicit
		return [{ json: { success: true } as IDataObject }];
	}
	return [{ json: data as IDataObject }];
}
