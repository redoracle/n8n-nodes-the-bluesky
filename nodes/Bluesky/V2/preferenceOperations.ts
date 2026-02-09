import { AtpAgent } from '@atproto/api';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const preferenceProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['preferences'],
			},
		},
		options: [
			{
				name: 'Get Preferences',
				value: 'getPreferences',
				description: 'Get the authenticated user preferences',
				action: 'Get preferences',
			},
			{
				name: 'Put Preferences',
				value: 'putPreferences',
				description: 'Update preferences for the authenticated user',
				action: 'Put preferences',
			},
		],
		default: 'getPreferences',
	},
	{
		displayName: 'Preferences JSON',
		name: 'preferencesJson',
		type: 'string',
		default: '[]',
		typeOptions: {
			rows: 6,
		},
		description: 'JSON array of preference objects',
		required: true,
		displayOptions: {
			show: {
				resource: ['preferences'],
				operation: ['putPreferences'],
			},
		},
	},
];

export async function getPreferencesOperation(agent: AtpAgent): Promise<INodeExecutionData[]> {
	const response = await agent.getPreferences();
	return [{ json: response as unknown as IDataObject }];
}

export async function putPreferencesOperation(
	agent: AtpAgent,
	preferencesJson: string,
): Promise<INodeExecutionData[]> {
	const preferences = JSON.parse(preferencesJson);
	await agent.app.bsky.actor.putPreferences({ preferences });
	return [{ json: { success: true } as IDataObject }];
}
