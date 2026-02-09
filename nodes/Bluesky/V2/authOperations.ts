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
