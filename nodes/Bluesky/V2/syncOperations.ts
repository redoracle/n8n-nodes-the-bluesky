import { AtpAgent } from '@atproto/api';
import { IDataObject, IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const syncProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['sync'],
			},
		},
		options: [
			{
				name: 'Get Repo (CAR)',
				value: 'getRepo',
				description: 'Download a repo as a CAR file',
				action: 'Get repo',
			},
			{
				name: 'Get Record (CAR Block)',
				value: 'getRecord',
				description: 'Fetch a specific record block',
				action: 'Get record (sync)',
			},
			{
				name: 'Get Repo Status',
				value: 'getRepoStatus',
				description: 'Get current hosting status for a repo',
				action: 'Get repo status',
			},
			{
				name: 'Get Latest Commit',
				value: 'getLatestCommit',
				description: 'Get the latest commit CID for a repo',
				action: 'Get latest commit',
			},
			{
				name: 'Get Blob',
				value: 'getBlob',
				description: 'Fetch a blob by CID',
				action: 'Get blob',
			},
			{
				name: 'List Blobs',
				value: 'listBlobs',
				description: 'List blobs for a repo',
				action: 'List blobs',
			},
			{
				name: 'List Repos',
				value: 'listRepos',
				description: 'List repos known to the service',
				action: 'List repos',
			},
			{
				name: 'Notify Of Update',
				value: 'notifyOfUpdate',
				description: 'Notify a service that a repo was updated',
				action: 'Notify of update',
			},
			{
				name: 'Request Crawl',
				value: 'requestCrawl',
				description: 'Request a crawl of a host',
				action: 'Request crawl',
			},
		],
		default: 'getRepo',
	},
	{
		displayName: 'DID',
		name: 'did',
		type: 'string',
		default: '',
		required: true,
		description: 'Repo DID',
		displayOptions: {
			show: {
				resource: ['sync'],
				operation: [
					'getRepo',
					'getRecord',
					'getRepoStatus',
					'getLatestCommit',
					'getBlob',
					'listBlobs',
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
		displayOptions: {
			show: {
				resource: ['sync'],
				operation: ['getRecord'],
			},
		},
	},
	{
		displayName: 'Record Key (rkey)',
		name: 'rkey',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['sync'],
				operation: ['getRecord'],
			},
		},
	},
	{
		displayName: 'CID',
		name: 'cid',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['sync'],
				operation: ['getBlob'],
			},
		},
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
				resource: ['sync'],
				operation: ['listBlobs', 'listRepos'],
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
				resource: ['sync'],
				operation: ['listBlobs', 'listRepos'],
			},
		},
	},
	{
		displayName: 'Host Name',
		name: 'hostname',
		type: 'string',
		default: '',
		required: true,
		description: 'Host name for notify/request crawl',
		displayOptions: {
			show: {
				resource: ['sync'],
				operation: ['notifyOfUpdate', 'requestCrawl'],
			},
		},
	},
];

export async function getRepoOperation(
	this: IExecuteFunctions,
	agent: AtpAgent,
	did: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.com.atproto.sync.getRepo({ did });
	const data = response.data as Uint8Array;
	const buffer = Buffer.from(data);
	const binary = await this.helpers.prepareBinaryData(buffer, 'application/car');

	return [
		{
			json: { did } as IDataObject,
			binary: { data: binary },
		},
	];
}

export async function getRecordSyncOperation(
	this: IExecuteFunctions,
	agent: AtpAgent,
	did: string,
	collection: string,
	rkey: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.com.atproto.sync.getRecord({ did, collection, rkey });
	const data = response.data as Uint8Array;
	const buffer = Buffer.from(data);
	const binary = await this.helpers.prepareBinaryData(buffer, 'application/car');

	return [
		{
			json: { did, collection, rkey } as IDataObject,
			binary: { data: binary },
		},
	];
}

export async function getRepoStatusOperation(
	agent: AtpAgent,
	did: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.com.atproto.sync.getRepoStatus({ did });
	return [
		{
			json: response.data as unknown as IDataObject,
		},
	];
}

export async function getLatestCommitOperation(
	agent: AtpAgent,
	did: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.com.atproto.sync.getLatestCommit({ did });

	return [
		{
			json: response.data as unknown as IDataObject,
		},
	];
}

export async function getBlobOperation(
	this: IExecuteFunctions,
	agent: AtpAgent,
	did: string,
	cid: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.com.atproto.sync.getBlob({ did, cid });
	const data = response.data as Uint8Array;
	const buffer = Buffer.from(data);
	const binary = await this.helpers.prepareBinaryData(buffer);

	return [
		{
			json: { did, cid } as IDataObject,
			binary: { data: binary },
		},
	];
}

export async function listBlobsOperation(
	agent: AtpAgent,
	did: string,
	limit: number,
	cursor?: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.com.atproto.sync.listBlobs({
		did,
		limit,
		cursor: cursor || undefined,
	});

	const items: INodeExecutionData[] = [];
	response.data.cids.forEach((cid) => {
		items.push({ json: { cid } as IDataObject });
	});

	if (response.data.cursor) {
		items.push({ json: { cursor: response.data.cursor, _pagination: true } as IDataObject });
	}

	return items;
}

export async function listReposOperation(
	agent: AtpAgent,
	limit: number,
	cursor?: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.com.atproto.sync.listRepos({
		limit,
		cursor: cursor || undefined,
	});

	const items: INodeExecutionData[] = [];
	response.data.repos.forEach((repo) => {
		items.push({ json: repo as unknown as IDataObject });
	});

	if (response.data.cursor) {
		items.push({ json: { cursor: response.data.cursor, _pagination: true } as IDataObject });
	}

	return items;
}

export async function notifyOfUpdateOperation(
	agent: AtpAgent,
	hostname: string,
): Promise<INodeExecutionData[]> {
	await agent.com.atproto.sync.notifyOfUpdate({ hostname });

	return [
		{
			json: { success: true, hostname } as IDataObject,
		},
	];
}

export async function requestCrawlOperation(
	agent: AtpAgent,
	hostname: string,
): Promise<INodeExecutionData[]> {
	await agent.com.atproto.sync.requestCrawl({ hostname });

	return [
		{
			json: { success: true, hostname } as IDataObject,
		},
	];
}
