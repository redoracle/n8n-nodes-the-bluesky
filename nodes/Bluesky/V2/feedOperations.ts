import {
	AppBskyFeedDefs,
	AppBskyFeedGetAuthorFeed,
	AppBskyFeedGetTimeline,
	AtpAgent,
} from '@atproto/api';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const feedProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['feed'],
			},
		},
		options: [
			{
				name: 'Describe Feed Generator',
				value: 'describeFeedGenerator',
				description: 'Get feed generator configuration',
				action: 'Describe feed generator',
			},
			{
				name: 'Get Author Feed',
				value: 'getAuthorFeed',
				description: 'Author feeds return posts by a single user',
				action: 'Retrieve feed with posts by a single user',
			},
			{
				name: 'Get Feed',
				value: 'getFeed',
				description: 'Get posts from a custom feed generator',
				action: 'Get feed',
			},
			{
				name: 'Get Feed Skeleton',
				value: 'getFeedSkeleton',
				description: 'Get a feed skeleton from a generator',
				action: 'Get feed skeleton',
			},
			{
				name: 'Get Feed Generators',
				value: 'getFeedGenerators',
				description: 'Get metadata for feed generator records',
				action: 'Get feed generators',
			},
			{
				name: 'Get Likes',
				value: 'getLikes',
				description: 'List who liked a post',
				action: 'Get likes',
			},
			{
				name: 'Get Post Thread',
				value: 'getPostThread',
				description: 'Retrieve the full context of a post thread',
				action: 'Retrieve a post thread',
			},
			{
				name: 'Get Posts',
				value: 'getPosts',
				description: 'Fetch posts by URI',
				action: 'Get posts',
			},
			{
				name: 'Get Reposted By',
				value: 'getRepostedBy',
				description: 'List who reposted a post',
				action: 'Get reposted by',
			},
			{
				name: 'Get Suggested Feeds',
				value: 'getSuggestedFeeds',
				description: 'Get suggested feed generators',
				action: 'Get suggested feeds',
			},
			{
				name: 'Timeline',
				value: 'getTimeline',
				description:
					'The default chronological feed of posts from users the authenticated user follows',
				action: 'Retrieve user timeline',
			},
		],
		default: 'getAuthorFeed',
	},
	{
		displayName: 'Actor',
		name: 'actor',
		type: 'string',
		default: '',
		required: true,
		description: "The DID of the author whose posts you'd like to fetch",
		hint: 'The user getProfile operation can be used to get the DID of a user',
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: ['getAuthorFeed'],
			},
		},
	},
	{
		displayName: 'Feed URI',
		name: 'feed',
		type: 'string',
		default: '',
		required: true,
		description: 'AT URI of the feed generator record',
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: ['getFeed', 'getFeedSkeleton'],
			},
		},
	},
	{
		displayName: 'Feed URIs (Comma Separated)',
		name: 'feedUris',
		type: 'string',
		default: '',
		required: true,
		description: 'Comma-separated list of feed generator URIs',
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: ['getFeedGenerators'],
			},
		},
	},
	{
		displayName: 'Post URIs (Comma Separated)',
		name: 'uris',
		type: 'string',
		default: '',
		required: true,
		description: 'Comma-separated list of post URIs',
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: ['getPosts'],
			},
		},
	},
	{
		displayName: 'Post URI',
		name: 'uri',
		type: 'string',
		default: '',
		required: true,
		description: 'The URI of the post to fetch the thread for',
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: ['getPostThread', 'getLikes', 'getRepostedBy'],
			},
		},
	},
	{
		displayName: 'Depth',
		name: 'depth',
		type: 'number',
		typeOptions: {
			minValue: 0,
		},
		default: 6,
		description: 'Depth of parent replies to fetch (max 1000)',
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: ['getPostThread'],
			},
		},
	},
	{
		displayName: 'Parent Height',
		name: 'parentHeight',
		type: 'number',
		typeOptions: {
			minValue: 0,
		},
		default: 80,
		description: 'Depth of child replies to fetch (max 1000)',
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: ['getPostThread'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		default: 50,
		required: true,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: [
					'getAuthorFeed',
					'getTimeline',
					'getFeed',
					'getFeedSkeleton',
					'getLikes',
					'getRepostedBy',
					'getSuggestedFeeds',
				],
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
				resource: ['feed'],
				operation: [
					'getAuthorFeed',
					'getTimeline',
					'getFeed',
					'getFeedSkeleton',
					'getLikes',
					'getRepostedBy',
					'getSuggestedFeeds',
				],
			},
		},
	},
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'options',
		default: 'posts_with_replies',
		description: 'Filter posts by type',
		options: [
			{
				name: 'Posts and Author Threads',
				value: 'posts_and_author_threads',
				description: 'Posts and threads authored by the user',
			},
			{
				name: 'Posts with Media',
				value: 'posts_with_media',
				description: 'Only posts containing media attachments',
			},
			{
				name: 'Posts with Replies',
				value: 'posts_with_replies',
				description: 'All posts, including replies',
			},
			{
				name: 'Posts with Video',
				value: 'posts_with_video',
				description: 'Only posts containing video content',
			},
			{
				name: 'Posts without Replies',
				value: 'posts_no_replies',
				description: 'Only top-level posts (excludes replies)',
			},
		],
		displayOptions: {
			show: {
				resource: ['feed'],
				operation: ['getAuthorFeed'],
			},
		},
	},
];

export async function getAuthorFeed(
	agent: AtpAgent,
	actor: string,
	limit: number,
	filter?: string,
	cursor?: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const authorFeedResponse: AppBskyFeedGetAuthorFeed.Response = await agent.getAuthorFeed({
		actor: actor,
		limit: limit,
		filter: filter,
		cursor: cursor || undefined,
	});

	authorFeedResponse.data.feed.forEach((feedPost: AppBskyFeedDefs.FeedViewPost) => {
		returnData.push({
			json: {
				post: feedPost.post,
				reply: feedPost.reply,
				reason: feedPost.reason,
				feedContext: feedPost.feedContext,
			},
		});
	});

	if (authorFeedResponse.data.cursor) {
		returnData.push({
			json: { cursor: authorFeedResponse.data.cursor, _pagination: true },
		});
	}
	return returnData;
}

export async function getPostThread(
	agent: AtpAgent,
	uri: string,
	depth?: number,
	parentHeight?: number,
): Promise<INodeExecutionData[]> {
	const threadResponse = await agent.getPostThread({
		uri: uri,
		depth: depth,
		parentHeight: parentHeight,
	});

	if (!threadResponse.data.thread) {
		return [];
	}

	// The thread can be of various types, ensure it's serializable to JSON for n8n
	const threadJson = JSON.parse(JSON.stringify(threadResponse.data.thread));

	return [{ json: threadJson }];
}

export async function getTimeline(
	agent: AtpAgent,
	limit: number,
	cursor?: string,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const timelineResponse: AppBskyFeedGetTimeline.Response = await agent.getTimeline({
		limit: limit,
		cursor: cursor || undefined,
	});

	timelineResponse.data.feed.forEach((feedPost: AppBskyFeedDefs.FeedViewPost) => {
		returnData.push({
			json: {
				post: feedPost.post,
				reply: feedPost.reply,
				reason: feedPost.reason,
				feedContext: feedPost.feedContext,
			},
		});
	});

	if (timelineResponse.data.cursor) {
		returnData.push({
			json: { cursor: timelineResponse.data.cursor, _pagination: true },
		});
	}
	return returnData;
}

export async function getPostsOperation(
	agent: AtpAgent,
	uris: string[],
): Promise<INodeExecutionData[]> {
	const response = await agent.getPosts({ uris });
	return response.data.posts.map((post) => ({ json: post }));
}

export async function getLikesOperation(
	agent: AtpAgent,
	uri: string,
	limit: number,
	cursor?: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.getLikes({ uri, limit, cursor: cursor || undefined });
	const items: INodeExecutionData[] = response.data.likes.map((like) => ({ json: like }));
	if (response.data.cursor) {
		items.push({ json: { cursor: response.data.cursor, _pagination: true } });
	}
	return items;
}

export async function getRepostedByOperation(
	agent: AtpAgent,
	uri: string,
	limit: number,
	cursor?: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.getRepostedBy({ uri, limit, cursor: cursor || undefined });
	const items: INodeExecutionData[] = response.data.repostedBy.map((actor) => ({ json: actor }));
	if (response.data.cursor) {
		items.push({ json: { cursor: response.data.cursor, _pagination: true } });
	}
	return items;
}

export async function getSuggestedFeedsOperation(
	agent: AtpAgent,
	limit: number,
	cursor?: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.app.bsky.feed.getSuggestedFeeds({
		limit,
		cursor: cursor || undefined,
	});
	const items: INodeExecutionData[] = response.data.feeds.map((feed) => ({ json: feed }));
	if (response.data.cursor) {
		items.push({ json: { cursor: response.data.cursor, _pagination: true } });
	}
	return items;
}

export async function getFeedGeneratorsOperation(
	agent: AtpAgent,
	feedUris: string[],
): Promise<INodeExecutionData[]> {
	const response = await agent.app.bsky.feed.getFeedGenerators({ feeds: feedUris });
	return response.data.feeds.map((feed) => ({ json: feed }));
}

export async function getFeedOperation(
	agent: AtpAgent,
	feed: string,
	limit: number,
	cursor?: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.app.bsky.feed.getFeed({
		feed,
		limit,
		cursor: cursor || undefined,
	});
	const items: INodeExecutionData[] = response.data.feed.map((item) => ({ json: item }));
	if (response.data.cursor) {
		items.push({ json: { cursor: response.data.cursor, _pagination: true } });
	}
	return items;
}

export async function getFeedSkeletonOperation(
	agent: AtpAgent,
	feed: string,
	limit: number,
	cursor?: string,
): Promise<INodeExecutionData[]> {
	const response = await agent.app.bsky.feed.getFeedSkeleton({
		feed,
		limit,
		cursor: cursor || undefined,
	});
	const items: INodeExecutionData[] = response.data.feed.map((item) => ({
		json: item as unknown as IDataObject,
	}));
	if (response.data.cursor) {
		items.push({ json: { cursor: response.data.cursor, _pagination: true } });
	}
	return items;
}

export async function describeFeedGeneratorOperation(
	agent: AtpAgent,
): Promise<INodeExecutionData[]> {
	const response = await agent.app.bsky.feed.describeFeedGenerator();
	return [{ json: response.data }];
}
