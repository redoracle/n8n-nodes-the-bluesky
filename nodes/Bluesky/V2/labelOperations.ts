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
			{
				name: 'Apply Labels',
				value: 'applyLabels',
				description: 'Apply labels to a subject (admin/labeler only)',
				action: 'Apply labels',
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
		description:
			'Comma-separated list of AT URIs to query labels for (for example: at://did:plc:.../app.bsky.feed.post/3xyz)',
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
		displayName: 'Labels JSON',
		name: 'labelsJson',
		type: 'string',
		default:
			'{"labels":[{"src":"did:plc:example","uri":"at://did:plc:example/app.bsky.feed.post/3k3c2u2wq2b2c","val":"label-name","cts":"2024-01-01T00:00:00Z"}]}',
		required: true,
		typeOptions: {
			rows: 6,
		},
		description:
			'Raw JSON payload for com.atproto.label.applyLabels. Refer to the AT Protocol spec for required fields.',
		displayOptions: {
			show: {
				resource: ['label'],
				operation: ['applyLabels'],
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
	// Current endpoint rejects wildcard suffixes, normalize common `*` patterns from older examples.
	const normalizedUriPatterns = uriPatterns
		.map((uri) => uri.trim().replace(/\*+$/, ''))
		.filter((uri) => uri.length > 0);

	const response = await agent.com.atproto.label.queryLabels({
		uriPatterns: normalizedUriPatterns,
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

export async function applyLabelsOperation(
	agent: AtpAgent,
	labelsJson: string,
): Promise<INodeExecutionData[]> {
	let payload: unknown;
	try {
		payload = JSON.parse(labelsJson);
	} catch (error) {
		throw new Error(
			`Invalid JSON for labels payload: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	const response = await (agent as any).call('com.atproto.label.applyLabels', undefined, payload);

	if (!response) {
		throw new Error('No response received from applyLabels API');
	}

	return [
		{
			json: (response.data ?? response) as IDataObject,
		},
	];
}
