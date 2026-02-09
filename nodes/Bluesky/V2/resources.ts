import { INodeProperties } from 'n8n-workflow';

export const resourcesProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: 'Auth',
			value: 'auth',
		},
		{
			name: 'Analytics',
			value: 'analytics',
		},
		{
			name: 'Chat',
			value: 'chat',
		},
		{
			name: 'Feed',
			value: 'feed',
		},
		{
			name: 'Graph',
			value: 'graph',
		},
		{
			name: 'Identity',
			value: 'identity',
		},
		{
			name: 'List',
			value: 'list',
		},
		{
			name: 'Label',
			value: 'label',
		},
		{
			name: 'Moderation',
			value: 'moderation',
		},
		{
			name: 'Notification',
			value: 'notification',
		},
		{
			name: 'Post',
			value: 'post',
		},
		{
			name: 'Preferences',
			value: 'preferences',
		},
		{
			name: 'Repo',
			value: 'repo',
		},
		{
			name: 'Search',
			value: 'search',
		},
		{
			name: 'Sync',
			value: 'sync',
		},
		{
			name: 'User',
			value: 'user',
		},
	],
	default: 'post',
};
