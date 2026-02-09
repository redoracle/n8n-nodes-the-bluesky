import { AtpAgent } from '@atproto/api';
import { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const repoProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['repo'],
			},
		},
		options: [
			{
				name: 'Create Record',
				value: 'createRecord',
				description: 'Create a record in a repo',
				action: 'Create a record',
			},
			{
				name: 'Put Record',
				value: 'putRecord',
				description: 'Create or update a record at a specific rkey',
				action: 'Put a record',
			},
			{
				name: 'Delete Record',
				value: 'deleteRecord',
				description: 'Delete a record from a repo',
				action: 'Delete a record',
			},
			{
				name: 'Get Record',
				value: 'getRecord',
				description: 'Fetch a record by rkey',
				action: 'Get a record',
			},
			{
				name: 'List Records',
				value: 'listRecords',
				description: 'List records in a collection',
				action: 'List records',
			},
			{
				name: 'Apply Writes',
				value: 'applyWrites',
				description: 'Apply a batch of writes',
				action: 'Apply writes',
			},
			{
				name: 'Upload Blob',
				value: 'uploadBlob',
				description: 'Upload binary data as a blob',
				action: 'Upload a blob',
			},
		],
		default: 'createRecord',
	},
	{
		displayName: 'Repo (DID or Handle)',
		name: 'repo',
		type: 'string',
		default: '',
		required: true,
		description: 'Repo DID or handle',
		displayOptions: {
			show: {
				resource: ['repo'],
				operation: [
					'createRecord',
					'putRecord',
					'deleteRecord',
					'getRecord',
					'listRecords',
					'applyWrites',
				],
			},
		},
	},
	{
		displayName: 'Collection NSID',
		name: 'collection',
		type: 'string',
		default: '',
		required: true,
		description: 'Record collection NSID (e.g. app.bsky.feed.post)',
		displayOptions: {
			show: {
				resource: ['repo'],
				operation: ['createRecord', 'putRecord', 'deleteRecord', 'getRecord', 'listRecords'],
			},
		},
	},
	{
		displayName: 'Record Key (rkey)',
		name: 'rkey',
		type: 'string',
		default: '',
		description: 'Record key for put/get/delete operations',
		required: true,
		displayOptions: {
			show: {
				resource: ['repo'],
				operation: ['putRecord', 'deleteRecord', 'getRecord'],
			},
		},
	},
	{
		displayName: 'Optional rkey',
		name: 'optionalRkey',
		type: 'string',
		default: '',
		description: 'Optional rkey override for createRecord',
		displayOptions: {
			show: {
				resource: ['repo'],
				operation: ['createRecord'],
			},
		},
	},
	{
		displayName: 'Record JSON',
		name: 'recordJson',
		type: 'string',
		default: '{"$type":"app.bsky.feed.post"}',
		description: 'JSON object to write as the record',
		typeOptions: {
			rows: 6,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['repo'],
				operation: ['createRecord', 'putRecord'],
			},
		},
	},
	{
		displayName: 'Swap Commit',
		name: 'swapCommit',
		type: 'string',
		default: '',
		description: 'Optional swapCommit CID for optimistic concurrency',
		displayOptions: {
			show: {
				resource: ['repo'],
				operation: ['putRecord', 'deleteRecord', 'applyWrites'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of records to return',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['repo'],
				operation: ['listRecords'],
			},
		},
	},
	{
		displayName: 'Cursor',
		name: 'cursor',
		type: 'string',
		default: '',
		description: 'Cursor for pagination',
		displayOptions: {
			show: {
				resource: ['repo'],
				operation: ['listRecords'],
			},
		},
	},
	{
		displayName: 'Reverse',
		name: 'reverse',
		type: 'boolean',
		default: false,
		description: 'Whether to list records in reverse order',
		displayOptions: {
			show: {
				resource: ['repo'],
				operation: ['listRecords'],
			},
		},
	},
	{
		displayName: 'rkey Start',
		name: 'rkeyStart',
		type: 'string',
		default: '',
		description: 'Optional start rkey for listing records',
		displayOptions: {
			show: {
				resource: ['repo'],
				operation: ['listRecords'],
			},
		},
	},
	{
		displayName: 'rkey End',
		name: 'rkeyEnd',
		type: 'string',
		default: '',
		description: 'Optional end rkey for listing records',
		displayOptions: {
			show: {
				resource: ['repo'],
				operation: ['listRecords'],
			},
		},
	},
	{
		displayName: 'Writes JSON',
		name: 'writesJson',
		type: 'string',
		default: '[]',
		description: 'JSON array of write actions for applyWrites',
		typeOptions: {
			rows: 6,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['repo'],
				operation: ['applyWrites'],
			},
		},
	},
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		default: 'data',
		description: 'Binary property containing data to upload',
		required: true,
		displayOptions: {
			show: {
				resource: ['repo'],
				operation: ['uploadBlob'],
			},
		},
	},
];

export async function createRecordOperation(
	agent: AtpAgent,
	repo: string,
	collection: string,
	recordJson: string,
	optionalRkey?: string,
): Promise<INodeExecutionData[]> {
	const record = JSON.parse(recordJson);

	const response = await agent.com.atproto.repo.createRecord({
		repo,
		collection,
		record,
		...(optionalRkey ? { rkey: optionalRkey } : {}),
	});

	return [
		{
			json: {
				uri: response.data.uri,
				cid: response.data.cid,
				record,
			} as IDataObject,
		},
	];
}

export async function putRecordOperation(
	agent: AtpAgent,
	repo: string,
	collection: string,
	rkey: string,
	recordJson: string,
	swapCommit?: string,
): Promise<INodeExecutionData[]> {
	const record = JSON.parse(recordJson);

	const response = await agent.com.atproto.repo.putRecord({
		repo,
		collection,
		rkey,
		record,
		...(swapCommit ? { swapCommit } : {}),
	});

	return [
		{
			json: {
				uri: response.data.uri,
				cid: response.data.cid,
				record,
			} as IDataObject,
		},
	];
}

export async function deleteRecordOperation(
	agent: AtpAgent,
	repo: string,
	collection: string,
	rkey: string,
	swapCommit?: string,
): Promise<INodeExecutionData[]> {
	await agent.com.atproto.repo.deleteRecord({
		repo,
		collection,
		rkey,
		...(swapCommit ? { swapCommit } : {}),
	});

	return [
		{
			json: { deleted: true, rkey } as IDataObject,
		},
	];
}

export async function getRecordOperation(
	agent: AtpAgent,
	repo: string,
	collection: string,
	rkey: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.com.atproto.repo.getRecord({
		repo,
		collection,
		rkey,
	});

	return [
		{
			json: response.data as unknown as IDataObject,
		},
	];
}

export async function listRecordsOperation(
	agent: AtpAgent,
	repo: string,
	collection: string,
	limit: number,
	cursor?: string,
	reverse?: boolean,
	rkeyStart?: string,
	rkeyEnd?: string,
): Promise<INodeExecutionData[]> {
	const params: any = {
		repo,
		collection,
		limit,
	};

	if (cursor) params.cursor = cursor;
	if (reverse) params.reverse = reverse;
	if (rkeyStart) params.rkeyStart = rkeyStart;
	if (rkeyEnd) params.rkeyEnd = rkeyEnd;

	const response = await agent.com.atproto.repo.listRecords(params);

	const items: INodeExecutionData[] = [];
	if (response.data.records) {
		response.data.records.forEach((record) => {
			items.push({ json: record as unknown as IDataObject });
		});
	}

	if (response.data.cursor) {
		items.push({
			json: { cursor: response.data.cursor, _pagination: true } as IDataObject,
		});
	}

	return items;
}

export async function applyWritesOperation(
	agent: AtpAgent,
	repo: string,
	writesJson: string,
	swapCommit?: string,
): Promise<INodeExecutionData[]> {
	const writes = JSON.parse(writesJson);

	const response = await agent.com.atproto.repo.applyWrites({
		repo,
		writes,
		...(swapCommit ? { swapCommit } : {}),
	});

	return [
		{
			json: response.data as unknown as IDataObject,
		},
	];
}

export async function uploadBlobOperation(
	this: IExecuteFunctions,
	agent: AtpAgent,
	binaryProperty: string,
): Promise<INodeExecutionData[]> {
	const buffer = await this.helpers.getBinaryDataBuffer(0, binaryProperty);
	const uploadResponse = await agent.uploadBlob(buffer);

	return [
		{
			json: uploadResponse.data as unknown as IDataObject,
		},
	];
}
