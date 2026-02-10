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
	try {
		const response = await agent.com.atproto.identity.resolveDid({ did });
		return [{ json: response.data as unknown as IDataObject }];
	} catch (error) {
		// Some service hosts do not expose this XRPC, but DID PLC docs are public.
		const msg = error instanceof Error ? error.message : String(error);
		if (!msg.includes('XRPCNotSupported') || !did.startsWith('did:plc:')) {
			throw error;
		}
		const response = await fetch(`https://plc.directory/${encodeURIComponent(did)}`);
		if (!response.ok) {
			throw new Error(`Unable to resolve DID via plc.directory: HTTP ${response.status}`);
		}
		const didDoc = (await response.json()) as Record<string, unknown>;
		return [{ json: { didDoc } as IDataObject }];
	}
}

export async function resolveIdentityOperation(
	agent: AtpAgent,
	identifier: string,
): Promise<INodeExecutionData[]> {
	try {
		const response = await agent.com.atproto.identity.resolveIdentity({ identifier });
		return [{ json: response.data as unknown as IDataObject }];
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		if (!msg.includes('XRPCNotSupported')) {
			throw error;
		}
		if (identifier.startsWith('did:')) {
			return resolveDidOperation(agent, identifier);
		}
		const response = await agent.com.atproto.identity.resolveHandle({ handle: identifier });
		return [{ json: { did: response.data.did, handle: identifier } as IDataObject }];
	}
}
