import { AtpAgent } from '@atproto/api';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const moderationProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['moderation'],
			},
		},
		options: [
			{
				name: 'Create Report',
				value: 'createReport',
				description: 'Report a record or account',
				action: 'Create a report',
			},
		],
		default: 'createReport',
	},
	{
		displayName: 'Subject Type',
		name: 'subjectType',
		type: 'options',
		default: 'record',
		options: [
			{
				name: 'Record (URI)',
				value: 'record',
			},
			{
				name: 'Account (DID)',
				value: 'repo',
			},
		],
		description: 'Type of subject being reported',
		displayOptions: {
			show: {
				resource: ['moderation'],
				operation: ['createReport'],
			},
		},
	},
	{
		displayName: 'Subject URI or DID',
		name: 'subject',
		type: 'string',
		default: '',
		required: true,
		description: 'Record URI or account DID to report',
		displayOptions: {
			show: {
				resource: ['moderation'],
				operation: ['createReport'],
			},
		},
	},
	{
		displayName: 'Subject CID',
		name: 'subjectCid',
		type: 'string',
		default: '',
		required: true,
		description: 'Record CID (required when subject type is Record)',
		displayOptions: {
			show: {
				resource: ['moderation'],
				operation: ['createReport'],
				subjectType: ['record'],
			},
		},
	},
	{
		displayName: 'Reason Type',
		name: 'reasonType',
		type: 'string',
		default: 'com.atproto.moderation.defs#reasonSpam',
		description: 'Reason type NSID (e.g. com.atproto.moderation.defs#reasonSpam)',
		displayOptions: {
			show: {
				resource: ['moderation'],
				operation: ['createReport'],
			},
		},
	},
	{
		displayName: 'Reason (Optional)',
		name: 'reason',
		type: 'string',
		default: '',
		description: 'Additional context for the report',
		typeOptions: {
			rows: 3,
		},
		displayOptions: {
			show: {
				resource: ['moderation'],
				operation: ['createReport'],
			},
		},
	},
];

export async function createReportOperation(
	agent: AtpAgent,
	subjectType: 'record' | 'repo',
	subject: string,
	subjectCid: string | undefined,
	reasonType: string,
	reason?: string,
): Promise<INodeExecutionData[]> {
	const reportSubject =
		subjectType === 'record'
			? { $type: 'com.atproto.repo.strongRef', uri: subject, cid: subjectCid }
			: { $type: 'com.atproto.admin.defs#repoRef', did: subject };

	const response = await agent.api.com.atproto.moderation.createReport({
		subject: reportSubject as any,
		reasonType,
		...(reason ? { reason } : {}),
	});

	return [
		{
			json: response.data as unknown as IDataObject,
		},
	];
}
