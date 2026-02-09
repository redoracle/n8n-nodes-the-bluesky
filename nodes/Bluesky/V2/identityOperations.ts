import { AtpAgent } from '@atproto/api';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const identityProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['identity'],
			},
		},
		options: [
			{
				name: 'Resolve Handle',
				value: 'resolveHandle',
				description: 'Resolve a handle to a DID',
				action: 'Resolve handle',
			},
			{
				name: 'Resolve DID',
				value: 'resolveDid',
				description: 'Resolve a DID to a DID document',
				action: 'Resolve DID',
			},
			{
				name: 'Resolve Identity',
				value: 'resolveIdentity',
				description: 'Resolve a handle or DID to identity details',
				action: 'Resolve identity',
			},
		],
		default: 'resolveHandle',
	},
	{
		displayName: 'Handle',
		name: 'handle',
		type: 'string',
		default: '',
		required: true,
		description: 'Handle to resolve (e.g. alice.bsky.social)',
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['resolveHandle'],
			},
		},
	},
	{
		displayName: 'DID',
		name: 'did',
		type: 'string',
		default: '',
		required: true,
		description: 'DID to resolve',
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['resolveDid'],
			},
		},
	},
	{
		displayName: 'Identifier',
		name: 'identifier',
		type: 'string',
		default: '',
		required: true,
		description: 'Handle or DID to resolve',
		displayOptions: {
			show: {
				resource: ['identity'],
				operation: ['resolveIdentity'],
			},
		},
	},
];

export async function resolveHandleOperation(
	agent: AtpAgent,
	handle: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.com.atproto.identity.resolveHandle({ handle });
	return [{ json: response.data as unknown as IDataObject }];
}

export async function resolveDidOperation(
	agent: AtpAgent,
	did: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.com.atproto.identity.resolveDid({ did });
	return [{ json: response.data as unknown as IDataObject }];
}

export async function resolveIdentityOperation(
	agent: AtpAgent,
	identifier: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.com.atproto.identity.resolveIdentity({ identifier });
	return [{ json: response.data as unknown as IDataObject }];
}
