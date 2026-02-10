import { AtpAgent } from '@atproto/api';
import { INodeProperties } from 'n8n-workflow';

export const graphProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['graph'],
			},
		},
		options: [
			{
				name: 'Get Blocks',
				value: 'getBlocks',
				action: 'Get blocks',
				description: 'List accounts blocked by the authenticated user',
			},
			{
				name: 'Get Mutes',
				value: 'getMutes',
				action: 'Get mutes',
				description: 'List accounts muted by the authenticated user',
			},
			{
				name: 'Mute Thread',
				value: 'muteThread',
				action: 'Mute a thread',
				description: 'Mute a conversation thread',
			},
		],
		default: 'muteThread',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				operation: ['getBlocks', 'getMutes'],
				resource: ['graph'],
			},
		},
	},
	{
		displayName: 'Cursor',
		name: 'cursor',
		type: 'string',
		default: '',
		description: 'Pagination cursor',
		displayOptions: {
			show: {
				operation: ['getBlocks', 'getMutes'],
				resource: ['graph'],
			},
		},
	},
	{
		displayName: 'Thread URI',
		name: 'uri',
		type: 'string',
		required: true,
		default: '',
		description: 'The URI of the root post of the thread to mute',
		displayOptions: {
			show: {
				operation: ['muteThread'],
				resource: ['graph'],
			},
		},
	},
];

export async function muteThreadOperation(agent: AtpAgent, uri: string): Promise<void> {
	await agent.app.bsky.graph.muteThread({ root: uri });
}

export async function getBlocksOperation(
	agent: AtpAgent,
	limit: number,
	cursor?: string,
): Promise<{ data: any[]; cursor?: string }> {
	const response = await agent.app.bsky.graph.getBlocks({
		limit,
		cursor: cursor || undefined,
	});

	return { data: response.data.blocks || [], cursor: response.data.cursor };
}

export async function getMutesOperation(
	agent: AtpAgent,
	limit: number,
	cursor?: string,
): Promise<{ data: any[]; cursor?: string }> {
	const response = await agent.app.bsky.graph.getMutes({
		limit,
		cursor: cursor || undefined,
	});

	return { data: response.data.mutes || [], cursor: response.data.cursor };
}
