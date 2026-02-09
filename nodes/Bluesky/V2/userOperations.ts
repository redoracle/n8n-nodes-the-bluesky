import {
    AppBskyActorGetProfile,
    AppBskyActorGetProfiles,
    AppBskyGraphGetFollowers,
    AppBskyGraphGetFollows,
    AppBskyGraphMuteActor,
    AppBskyGraphUnmuteActor,
    AtpAgent,
    AtUri,
    ComAtprotoRepoUploadBlob,
} from '@atproto/api';
import {
    IDataObject,
    IExecuteFunctions,
    INodeExecutionData,
    INodeProperties,
} from 'n8n-workflow';

export const userProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Block User',
				value: 'block',
				description:
					'Blocking a user prevents interaction and hides the user from the client experience',
				action: 'Block a user',
			},
			{
				name: 'Follow User',
				value: 'follow',
				description: 'Follow a user by DID',
				action: 'Follow a user',
			},
			{
				name: 'Get Profiles',
				value: 'getProfiles',
				description: 'Get multiple actor profiles in one call',
				action: 'Get multiple profiles',
			},
			{
				name: 'Get Profile',
				value: 'getProfile',
				description: 'Get detailed profile view of an actor',
				action: 'Get detailed profile view of an actor',
			},
			{
				name: 'List All Followers',
				value: 'listAllFollowers',
				description: 'Get all followers of a user with automatic pagination',
				action: 'List all followers of a user',
			},
			{
				name: 'List All Follows',
				value: 'listAllFollows',
				description: 'Get all accounts a user is following with automatic pagination',
				action: 'List all follows of a user',
			},
			{
				name: 'List Followers (Paged)',
				value: 'listFollowers',
				description: 'Get followers of a user with pagination support',
				action: 'List followers (paged)',
			},
			{
				name: 'List Follows (Paged)',
				value: 'listFollows',
				description: 'Get follows of a user with pagination support',
				action: 'List follows (paged)',
			},
			{
				name: 'Mute User',
				value: 'mute',
				description: 'Muting a user hides their posts from your feeds',
				action: 'Mute a user',
			},
			{
				name: 'Unfollow User',
				value: 'unfollow',
				description: 'Unfollow a user by follow record URI',
				action: 'Unfollow a user',
			},
			{
				name: 'Unblock User',
				value: 'unblock',
				description: 'Unblock a user by block record URI',
				action: 'Unblock a user',
			},
			{
				name: 'Un-Mute User',
				value: 'unmute',
				description: 'Muting a user hides their posts from your feeds',
				action: 'Unmute a user',
			},
			{
				name: 'Update Profile',
				value: 'updateProfile',
				description: 'Update the authenticated user profile',
				action: 'Update profile',
			},
		],
		default: 'getProfile',
	},
	{
		displayName: 'Did',
		name: 'did',
		type: 'string',
		default: '',
		required: true,
		description: 'The DID of the user',
		hint: 'The getProfile operation can be used to get the DID of a user',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['mute', 'unmute', 'block', 'follow'],
			},
		},
	},
	{
		displayName: 'Actor',
		name: 'actor',
		type: 'string',
		default: '',
		required: true,
		description: 'Handle or DID of account to fetch profile of',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getProfile'],
			},
		},
	},
	{
		displayName: 'Actors (Comma Separated)',
		name: 'actors',
		type: 'string',
		default: '',
		required: true,
		description: 'Comma-separated list of handles or DIDs to fetch profiles for',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['getProfiles'],
			},
		},
	},
	{
		displayName: 'Handle',
		name: 'handle',
		type: 'string',
		default: '',
		required: true,
		description: 'Handle or DID of the actor',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['listAllFollowers', 'listAllFollows'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return (paged)',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['listFollowers', 'listFollows'],
			},
		},
	},
	{
		displayName: 'Follow URI',
		name: 'followUri',
		type: 'string',
		default: '',
		required: true,
		description: 'Record URI of the follow to delete',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['unfollow'],
			},
		},
	},
	{
		displayName: 'Max Results',
		name: 'maxResults',
		type: 'number',
		default: 1000,
		description: 'Maximum number of results to fetch (default: 1000)',
		typeOptions: {
			minValue: 1,
		},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['listAllFollowers', 'listAllFollows', 'listFollowers', 'listFollows'],
			},
		},
	},
	{
		displayName: 'Cursor',
		name: 'cursor',
		type: 'string',
		default: '',
		description: 'Pagination cursor for paged follower/follow lists',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['listFollowers', 'listFollows'],
			},
		},
	},
	{
		displayName: 'Page Size',
		name: 'pageSize',
		type: 'number',
		default: 100,
		description: 'Number of results to fetch per request (default: 100, max: 100)',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['listAllFollowers', 'listAllFollows'],
			},
		},
	},
	{
		displayName: 'Display Name',
		name: 'displayName',
		type: 'string',
		default: '',
		description: 'Profile display name',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updateProfile'],
			},
		},
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		default: '',
		typeOptions: {
			rows: 3,
		},
		description: 'Profile bio/description',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updateProfile'],
			},
		},
	},
	{
		displayName: 'Avatar Binary Property',
		name: 'avatarBinaryProperty',
		type: 'string',
		default: '',
		description: 'Binary property containing avatar image',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updateProfile'],
			},
		},
	},
	{
		displayName: 'Banner Binary Property',
		name: 'bannerBinaryProperty',
		type: 'string',
		default: '',
		description: 'Binary property containing banner image',
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['updateProfile'],
			},
		},
	},
	{
		displayName: 'Uri',
		name: 'uri',
		type: 'string',
		description: 'The URI of the user',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: ['user'],
				operation: ['unblock'],
			},
		},
	},
];

export async function muteOperation(agent: AtpAgent, did: string): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const muteResponse: AppBskyGraphMuteActor.Response = await agent.mute(did);

	returnData.push({
		json: muteResponse as Object,
	} as INodeExecutionData);

	return returnData;
}

export async function unmuteOperation(agent: AtpAgent, did: string): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const unmuteResponse: AppBskyGraphUnmuteActor.Response = await agent.unmute(did);

	returnData.push({
		json: unmuteResponse as Object,
	} as INodeExecutionData);

	return returnData;
}

export async function getProfileOperation(
	agent: AtpAgent,
	actor: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const profileResponse: AppBskyActorGetProfile.Response = await agent.getProfile({
		actor: actor,
	});

	returnData.push({
		json: profileResponse.data as unknown as IDataObject,
	} as INodeExecutionData);

	return returnData;
}

export async function getProfilesOperation(
	agent: AtpAgent,
	actors: string[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const response: AppBskyActorGetProfiles.Response = await agent.getProfiles({ actors });

	response.data.profiles.forEach((profile) => {
		returnData.push({ json: profile as unknown as IDataObject });
	});

	return returnData;
}

export async function followOperation(agent: AtpAgent, did: string): Promise<INodeExecutionData[]> {
	const { uri, cid } = await agent.follow(did);

	return [
		{
			json: { uri, cid } as IDataObject,
		},
	];
}

export async function unfollowOperation(
	agent: AtpAgent,
	followUri: string,
): Promise<INodeExecutionData[]> {
	await agent.deleteFollow(followUri);

	return [
		{
			json: { deleted: true, uri: followUri } as IDataObject,
		},
	];
}

export async function blockOperation(agent: AtpAgent, did: string): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	const { uri } = await agent.app.bsky.graph.block.create(
		{ repo: agent.session!.did }, // owner DID
		{
			subject: did, // DID of the user to block
			createdAt: new Date().toISOString(),
		},
	);

	returnData.push({
		json: {
			uri,
		},
	} as INodeExecutionData);

	return returnData;
}

export async function unblockOperation(
	agent: AtpAgent,
	uri: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const { rkey } = new AtUri(uri);

	await agent.app.bsky.graph.block.delete({
		repo: agent.session!.did, // Assuming block records are in the user's own repo
		rkey,
	});

	returnData.push({
		json: {
			uri,
		},
	} as INodeExecutionData);

	return returnData;
}

export async function listAllFollowersOperation(
	agent: AtpAgent,
	handle: string,
	maxResults: number = 1000,
	pageSize: number = 100,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	let total = 0;
	let cursor: string | undefined = undefined;
	const results: any[] = [];

	// Loop through all pages using the built-in getFollowers method
	while (total < maxResults) {
		const followersResponse: AppBskyGraphGetFollowers.Response =
			await agent.app.bsky.graph.getFollowers({
				actor: handle,
				limit: Math.min(pageSize, maxResults - total),
				cursor: cursor,
			});

		// Append followers to results
		if (followersResponse.data.followers && Array.isArray(followersResponse.data.followers)) {
			results.push(...followersResponse.data.followers);
			total += followersResponse.data.followers.length;
		}

		// Check if we should continue
		if (!followersResponse.data.cursor || total >= maxResults) {
			break;
		}

		cursor = followersResponse.data.cursor;
	}

	// Trim results to maxResults if needed
	const finalResults = results.slice(0, maxResults);

	// Return items in the format expected by n8n
	finalResults.forEach((follower) => {
		returnData.push({
			json: follower,
		});
	});

	return returnData;
}

export async function listFollowersOperation(
	agent: AtpAgent,
	handle: string,
	limit: number = 50,
	cursor?: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const response: AppBskyGraphGetFollowers.Response = await agent.app.bsky.graph.getFollowers({
		actor: handle,
		limit,
		cursor,
	});

	if (response.data.followers) {
		response.data.followers.forEach((follower) => {
			returnData.push({ json: follower as unknown as IDataObject });
		});
	}

	if (response.data.cursor) {
		returnData.push({
			json: { cursor: response.data.cursor, _pagination: true } as IDataObject,
		});
	}

	return returnData;
}

export async function listAllFollowsOperation(
	agent: AtpAgent,
	handle: string,
	maxResults: number = 1000,
	pageSize: number = 100,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	let total = 0;
	let cursor: string | undefined = undefined;
	const results: any[] = [];

	// Loop through all pages using the built-in getFollows method
	while (total < maxResults) {
		const followsResponse: AppBskyGraphGetFollows.Response = await agent.app.bsky.graph.getFollows({
			actor: handle,
			limit: Math.min(pageSize, maxResults - total),
			cursor: cursor,
		});

		// Append follows to results
		if (followsResponse.data.follows && Array.isArray(followsResponse.data.follows)) {
			results.push(...followsResponse.data.follows);
			total += followsResponse.data.follows.length;
		}

		// Check if we should continue
		if (!followsResponse.data.cursor || total >= maxResults) {
			break;
		}

		cursor = followsResponse.data.cursor;
	}

	// Trim results to maxResults if needed
	const finalResults = results.slice(0, maxResults);

	// Return items in the format expected by n8n
	finalResults.forEach((follow) => {
		returnData.push({
			json: follow,
		});
	});

	return returnData;
}

export async function listFollowsOperation(
	agent: AtpAgent,
	handle: string,
	limit: number = 50,
	cursor?: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const response: AppBskyGraphGetFollows.Response = await agent.app.bsky.graph.getFollows({
		actor: handle,
		limit,
		cursor,
	});

	if (response.data.follows) {
		response.data.follows.forEach((follow) => {
			returnData.push({ json: follow as unknown as IDataObject });
		});
	}

	if (response.data.cursor) {
		returnData.push({
			json: { cursor: response.data.cursor, _pagination: true } as IDataObject,
		});
	}

	return returnData;
}

export async function updateProfileOperation(
	this: IExecuteFunctions,
	agent: AtpAgent,
	updates: {
		displayName?: string;
		description?: string;
		avatarBinaryProperty?: string;
		bannerBinaryProperty?: string;
	},
): Promise<INodeExecutionData[]> {
	let avatarBlob: ComAtprotoRepoUploadBlob.OutputSchema['blob'] | undefined;
	let bannerBlob: ComAtprotoRepoUploadBlob.OutputSchema['blob'] | undefined;

	if (updates.avatarBinaryProperty) {
		const buffer = await this.helpers.getBinaryDataBuffer(0, updates.avatarBinaryProperty);
		const uploadResponse = await agent.uploadBlob(buffer);
		avatarBlob = uploadResponse.data.blob;
	}

	if (updates.bannerBinaryProperty) {
		const buffer = await this.helpers.getBinaryDataBuffer(0, updates.bannerBinaryProperty);
		const uploadResponse = await agent.uploadBlob(buffer);
		bannerBlob = uploadResponse.data.blob;
	}

	await agent.upsertProfile((existing) => {
		return {
			...existing,
			...(updates.displayName !== undefined ? { displayName: updates.displayName } : {}),
			...(updates.description !== undefined ? { description: updates.description } : {}),
			...(avatarBlob ? { avatar: avatarBlob } : {}),
			...(bannerBlob ? { banner: bannerBlob } : {}),
		};
	});

	return [
		{
			json: { success: true } as IDataObject,
		},
	];
}
