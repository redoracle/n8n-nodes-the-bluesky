import { AtpAgent } from '@atproto/api';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const labelProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['label'],
			},
		},
		options: [
			{
				name: 'Query Labels',
				value: 'queryLabels',
				description: 'Query labels by subject patterns',
				action: 'Query labels',
			},
		],
		default: 'queryLabels',
	},
	{
		displayName: 'URI Patterns (Comma Separated)',
		name: 'uriPatterns',
		type: 'string',
		default: '',
		required: true,
		description: 'Comma-separated list of AT URI patterns (e.g. at://did:plc:.../app.bsky.feed.post/*)',
		displayOptions: {
			show: {
				resource: ['label'],
				operation: ['queryLabels'],
			},
		},
	},
	{
		displayName: 'Sources (Comma Separated)',
		name: 'sources',
		type: 'string',
		default: '',
		description: 'Optional list of labeler DIDs to filter on',
		displayOptions: {
			show: {
				resource: ['label'],
				operation: ['queryLabels'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of labels to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['label'],
				operation: ['queryLabels'],
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
				resource: ['label'],
				operation: ['queryLabels'],
			},
		},
	},
];

export async function queryLabelsOperation(
	agent: AtpAgent,
	uriPatterns: string[],
	limit: number,
	sources?: string[],
	cursor?: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.com.atproto.label.queryLabels({
		uriPatterns,
		limit,
		...(sources && sources.length > 0 ? { sources } : {}),
		...(cursor ? { cursor } : {}),
	});

	const items = response.data.labels.map((label) => ({ json: label as unknown as IDataObject }));
	if (response.data.cursor) {
		items.push({ json: { cursor: response.data.cursor, _pagination: true } as IDataObject });
	}
	return items;
}
