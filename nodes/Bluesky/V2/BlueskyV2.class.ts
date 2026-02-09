import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeBaseDescription,
    INodeTypeDescription,
} from 'n8n-workflow';

import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

import { AtpAgent, CredentialSession } from '@atproto/api';

import { resourcesProperty } from './resources';

// Operations
import {
    // listNotificationsOperation, // This was the one from analytics, ensure we use the one from notificationOperations
    getUnreadCountOperation as analyticsGetUnreadCountOperation,
    analyticsProperties,
    getPostInteractionsOperation,
    updateSeenNotificationsOperation,
} from './analyticsOperations';
import {
    authProperties,
    createAppPasswordOperation,
    createSessionOperation,
    deleteSessionOperation,
    refreshSessionOperation,
} from './authOperations';
import {
    acceptConversationOperation,
    chatProperties,
    deleteMessageOperation,
    getConversationOperation,
    getConvoForMembersOperation,
    getMessagesOperation,
    leaveConversationOperation,
    listConversationsOperation,
    muteConversationOperation,
    sendMessageOperation,
    unmuteConversationOperation,
    updateReadStatusOperation,
} from './chatOperations';
import {
    describeFeedGeneratorOperation,
    feedProperties,
    getAuthorFeed,
    getFeedGeneratorsOperation,
    getFeedOperation,
    getLikesOperation,
    getPostThread,
    getPostsOperation,
    getRepostedByOperation,
    getSuggestedFeedsOperation,
    getTimeline,
} from './feedOperations';
import { getBlocksOperation, getMutesOperation, graphProperties, muteThreadOperation } from './graphOperations';
import {
    identityProperties,
    resolveDidOperation,
    resolveHandleOperation,
    resolveIdentityOperation,
} from './identityOperations';
import { labelProperties, queryLabelsOperation } from './labelOperations';
import {
    addUserToListOperation,
    createListOperation,
    deleteListOperation,
    getListFeedOperation,
    getListsOperation,
    listProperties,
    removeUserFromListOperation,
    updateListOperation,
} from './listOperations';
import { createReportOperation, moderationProperties } from './moderationOperations';
import {
    // getNotificationsOperation, // Removed as it's no longer exported / replaced by enhanced listNotificationsOperation
    listNotificationsOperation as enhancedListNotifications, // Renamed for clarity and to point to the enhanced version
    notificationProperties,
} from './notificationOperations';
import {
    deleteLikeOperation,
    deletePostOperation,
    deleteRepostOperation,
    likeOperation,
    postOperation,
    postProperties,
    quoteOperation,
    replyOperation,
    repostOperation,
} from './postOperations';
import {
    getPreferencesOperation,
    preferenceProperties,
    putPreferencesOperation,
} from './preferenceOperations';
import {
    applyWritesOperation,
    createRecordOperation,
    deleteRecordOperation,
    getRecordOperation,
    listRecordsOperation,
    putRecordOperation,
    repoProperties,
    uploadBlobOperation,
} from './repoOperations';
import { searchPostsOperation, searchProperties, searchUsersOperation } from './searchOperations';
import {
    getBlobOperation,
    getLatestCommitOperation,
    getRecordSyncOperation,
    getRepoOperation,
    listBlobsOperation,
    listReposOperation,
    notifyOfUpdateOperation,
    requestCrawlOperation,
    syncProperties,
} from './syncOperations';
import {
    blockOperation,
    followOperation,
    getProfileOperation,
    getProfilesOperation,
    listAllFollowersOperation,
    listAllFollowsOperation,
    listFollowersOperation,
    listFollowsOperation,
    muteOperation,
    unblockOperation,
    unfollowOperation,
    unmuteOperation,
    updateProfileOperation,
    userProperties,
} from './userOperations';

export class BlueskyV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 2,
			defaults: {
				name: 'Bluesky',
			},
			inputs: [NodeConnectionType.Main],
			outputs: [NodeConnectionType.Main],
			credentials: [
				{
					name: 'blueskyApi',
					required: true,
				},
			],
			properties: [
				resourcesProperty,
				...authProperties,
				...userProperties,
				...postProperties,
				...feedProperties,
				...searchProperties,
				...graphProperties,
				...analyticsProperties,
				...notificationProperties,
				...listProperties,
				...repoProperties,
				...moderationProperties,
				...labelProperties,
				...syncProperties,
				...identityProperties,
				...preferenceProperties,
				...chatProperties,
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Load credentials
		const credentials = (await this.getCredentials('blueskyApi')) as {
			identifier: string;
			appPassword: string;
			serviceUrl: string;
		};

		const serviceUrl = new URL(credentials.serviceUrl.replace(/\/+$/, ''));

		const session = new CredentialSession(serviceUrl);
		const agent = new AtpAgent(session);
		await agent.login({
			identifier: credentials.identifier,
			password: credentials.appPassword,
		});

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;

			if (resource === 'search') {
				// Handle search operations
				switch (operation) {
					case 'searchUsers':
						const usersQuery = this.getNodeParameter('q', i) as string;
						const usersLimit = this.getNodeParameter('limit', i, 50) as number;
						const usersData = await searchUsersOperation(agent, usersQuery, usersLimit);
						returnData.push(...usersData);
						break;

					case 'searchPosts':
						const postsQuery = this.getNodeParameter('q', i) as string;
						const postsLimit = this.getNodeParameter('limit', i, 50) as number;
						const postsAuthor = this.getNodeParameter('author', i, '') as string;
						const postsData = await searchPostsOperation(
							agent,
							postsQuery,
							postsLimit,
							postsAuthor || undefined,
						);
						returnData.push(...postsData);
						break;

					default:
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
						);
				}
				continue; // Skip the rest of the loop for search operations
			}

			if (resource === 'auth') {
				switch (operation) {
					case 'createSession': {
						const identifier =
							(this.getNodeParameter('identifier', i, '') as string) || credentials.identifier;
						const password =
							(this.getNodeParameter('password', i, '') as string) || credentials.appPassword;
						const sessionData = await createSessionOperation(agent, identifier, password);
						returnData.push(...sessionData);
						break;
					}
					case 'refreshSession': {
						const refreshed = await refreshSessionOperation(agent);
						returnData.push(...refreshed);
						break;
					}
					case 'deleteSession': {
						const deleted = await deleteSessionOperation(agent);
						returnData.push(...deleted);
						break;
					}
					case 'createAppPassword': {
						const appPasswordName = this.getNodeParameter('appPasswordName', i) as string;
						const created = await createAppPasswordOperation(agent, appPasswordName);
						returnData.push(...created);
						break;
					}
					default:
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
						);
				}
				continue;
			}

			if (resource === 'graph') {
				// Handle graph operations
				switch (operation) {
					case 'getBlocks': {
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const cursor = this.getNodeParameter('cursor', i, '') as string;
						const result = await getBlocksOperation(agent, limit, cursor || undefined);
						result.data.forEach((block) => returnData.push({ json: block }));
						if (result.cursor) {
							returnData.push({ json: { cursor: result.cursor, _pagination: true } });
						}
						break;
					}
					case 'getMutes': {
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const cursor = this.getNodeParameter('cursor', i, '') as string;
						const result = await getMutesOperation(agent, limit, cursor || undefined);
						result.data.forEach((mute) => returnData.push({ json: mute }));
						if (result.cursor) {
							returnData.push({ json: { cursor: result.cursor, _pagination: true } });
						}
						break;
					}
					case 'muteThread':
						const threadUriToMute = this.getNodeParameter('uri', i) as string;
						await muteThreadOperation(agent, threadUriToMute);
						// Mute operation does not return data, so we push a success message
						returnData.push({
							json: { success: true, message: `Thread ${threadUriToMute} muted.` },
						});
						break;
					default:
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
						);
				}
				continue; // Skip the rest of the loop for graph operations
			}

			if (resource === 'analytics') {
				// Handle analytics operations
				switch (operation) {
					case 'listNotifications':
						const analyticsLimit = this.getNodeParameter('limit', i, 50) as number;
						const unreadOnly = this.getNodeParameter('unreadOnly', i, true) as boolean;
						const markRetrievedAsRead = this.getNodeParameter(
							'markRetrievedAsRead',
							i,
							true,
						) as boolean;

						const analyticsNotificationsData = await enhancedListNotifications(
							agent,
							analyticsLimit,
							unreadOnly,
							markRetrievedAsRead,
						);
						returnData.push(...analyticsNotificationsData);
						break;

					case 'getUnreadCount':
						const analyticsUnreadCountData = await analyticsGetUnreadCountOperation(agent);
						returnData.push(...analyticsUnreadCountData);
						break;

					case 'updateSeenNotifications':
						const seenAt = this.getNodeParameter('seenAt', i, '') as string;
						const analyticsSeenData = await updateSeenNotificationsOperation(agent, seenAt);
						returnData.push(...analyticsSeenData);
						break;

					case 'getPostInteractions':
						const postUri = this.getNodeParameter('uri', i) as string;
						const interactionTypes = this.getNodeParameter('interactionTypes', i, [
							'likes',
							'reposts',
							'replies',
						]) as string[];
						const interactionLimit = this.getNodeParameter('interactionLimit', i, 50) as number;

						const interactionsData = await getPostInteractionsOperation(
							agent,
							postUri,
							interactionTypes,
							interactionLimit,
						);
						returnData.push(...interactionsData);
						break;

					default:
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
						);
				}
				continue; // Skip the rest of the loop for analytics operations
			}

			if (resource === 'notification') {
				switch (operation) {
					case 'listNotifications': {
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const unreadOnly = this.getNodeParameter('unreadOnly', i, true) as boolean;
						const markRetrievedAsRead = this.getNodeParameter(
							'markRetrievedAsRead',
							i,
							true,
						) as boolean;
						const data = await enhancedListNotifications(
							agent,
							limit,
							unreadOnly,
							markRetrievedAsRead,
						);
						returnData.push(...data);
						break;
					}
					case 'getUnreadCount': {
						const data = await analyticsGetUnreadCountOperation(agent);
						returnData.push(...data);
						break;
					}
					case 'updateSeen': {
						const seenAt = this.getNodeParameter('seenAt', i, '') as string;
						const data = await updateSeenNotificationsOperation(agent, seenAt);
						returnData.push(...data);
						break;
					}
					default:
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
						);
				}
				continue;
			}

			if (resource === 'moderation') {
				switch (operation) {
					case 'createReport': {
						const subjectType = this.getNodeParameter('subjectType', i) as 'record' | 'repo';
						const subject = this.getNodeParameter('subject', i) as string;
						const subjectCid = this.getNodeParameter('subjectCid', i, '') as string;
						const reasonType = this.getNodeParameter('reasonType', i) as string;
						const reason = this.getNodeParameter('reason', i, '') as string;
						const data = await createReportOperation(
							agent,
							subjectType,
							subject,
							subjectCid || undefined,
							reasonType,
							reason || undefined,
						);
						returnData.push(...data);
						break;
					}
					default:
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
						);
				}
				continue;
			}

			if (resource === 'label') {
				switch (operation) {
					case 'queryLabels': {
						const uriPatternsRaw = this.getNodeParameter('uriPatterns', i) as string;
						const uriPatterns = uriPatternsRaw
							.split(',')
							.map((value) => value.trim())
							.filter(Boolean);
						const sourcesRaw = this.getNodeParameter('sources', i, '') as string;
						const sources = sourcesRaw
							.split(',')
							.map((value) => value.trim())
							.filter(Boolean);
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const cursor = this.getNodeParameter('cursor', i, '') as string;
						const data = await queryLabelsOperation(
							agent,
							uriPatterns,
							limit,
							sources.length > 0 ? sources : undefined,
							cursor || undefined,
						);
						returnData.push(...data);
						break;
					}
					default:
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
						);
				}
				continue;
			}

			if (resource === 'identity') {
				switch (operation) {
					case 'resolveHandle': {
						const handle = this.getNodeParameter('handle', i) as string;
						const data = await resolveHandleOperation(agent, handle);
						returnData.push(...data);
						break;
					}
					case 'resolveDid': {
						const did = this.getNodeParameter('did', i) as string;
						const data = await resolveDidOperation(agent, did);
						returnData.push(...data);
						break;
					}
					case 'resolveIdentity': {
						const identifier = this.getNodeParameter('identifier', i) as string;
						const data = await resolveIdentityOperation(agent, identifier);
						returnData.push(...data);
						break;
					}
					default:
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
						);
				}
				continue;
			}

			if (resource === 'preferences') {
				switch (operation) {
					case 'getPreferences': {
						const data = await getPreferencesOperation(agent);
						returnData.push(...data);
						break;
					}
					case 'putPreferences': {
						const preferencesJson = this.getNodeParameter('preferencesJson', i) as string;
						const data = await putPreferencesOperation(agent, preferencesJson);
						returnData.push(...data);
						break;
					}
					default:
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
						);
				}
				continue;
			}

			if (resource === 'repo') {
				switch (operation) {
					case 'createRecord': {
						const repo = this.getNodeParameter('repo', i) as string;
						const collection = this.getNodeParameter('collection', i) as string;
						const recordJson = this.getNodeParameter('recordJson', i) as string;
						const optionalRkey = this.getNodeParameter('optionalRkey', i, '') as string;
						const data = await createRecordOperation(
							agent,
							repo,
							collection,
							recordJson,
							optionalRkey || undefined,
						);
						returnData.push(...data);
						break;
					}
					case 'putRecord': {
						const repo = this.getNodeParameter('repo', i) as string;
						const collection = this.getNodeParameter('collection', i) as string;
						const rkey = this.getNodeParameter('rkey', i) as string;
						const recordJson = this.getNodeParameter('recordJson', i) as string;
						const swapCommit = this.getNodeParameter('swapCommit', i, '') as string;
						const data = await putRecordOperation(
							agent,
							repo,
							collection,
							rkey,
							recordJson,
							swapCommit || undefined,
						);
						returnData.push(...data);
						break;
					}
					case 'deleteRecord': {
						const repo = this.getNodeParameter('repo', i) as string;
						const collection = this.getNodeParameter('collection', i) as string;
						const rkey = this.getNodeParameter('rkey', i) as string;
						const swapCommit = this.getNodeParameter('swapCommit', i, '') as string;
						const data = await deleteRecordOperation(
							agent,
							repo,
							collection,
							rkey,
							swapCommit || undefined,
						);
						returnData.push(...data);
						break;
					}
					case 'getRecord': {
						const repo = this.getNodeParameter('repo', i) as string;
						const collection = this.getNodeParameter('collection', i) as string;
						const rkey = this.getNodeParameter('rkey', i) as string;
						const data = await getRecordOperation(agent, repo, collection, rkey);
						returnData.push(...data);
						break;
					}
					case 'listRecords': {
						const repo = this.getNodeParameter('repo', i) as string;
						const collection = this.getNodeParameter('collection', i) as string;
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const cursor = this.getNodeParameter('cursor', i, '') as string;
						const reverse = this.getNodeParameter('reverse', i, false) as boolean;
						const rkeyStart = this.getNodeParameter('rkeyStart', i, '') as string;
						const rkeyEnd = this.getNodeParameter('rkeyEnd', i, '') as string;
						const data = await listRecordsOperation(
							agent,
							repo,
							collection,
							limit,
							cursor || undefined,
							reverse,
							rkeyStart || undefined,
							rkeyEnd || undefined,
						);
						returnData.push(...data);
						break;
					}
					case 'applyWrites': {
						const repo = this.getNodeParameter('repo', i) as string;
						const writesJson = this.getNodeParameter('writesJson', i) as string;
						const swapCommit = this.getNodeParameter('swapCommit', i, '') as string;
						const data = await applyWritesOperation(
							agent,
							repo,
							writesJson,
							swapCommit || undefined,
						);
						returnData.push(...data);
						break;
					}
					case 'uploadBlob': {
						const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;
						const data = await uploadBlobOperation.call(this, agent, binaryProperty);
						returnData.push(...data);
						break;
					}
					default:
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
						);
				}
				continue;
			}

			if (resource === 'sync') {
				switch (operation) {
					case 'getRepo': {
						const did = this.getNodeParameter('did', i) as string;
						const data = await getRepoOperation.call(this, agent, did);
						returnData.push(...data);
						break;
					}
					case 'getRecord': {
						const did = this.getNodeParameter('did', i) as string;
						const collection = this.getNodeParameter('collection', i) as string;
						const rkey = this.getNodeParameter('rkey', i) as string;
						const data = await getRecordSyncOperation.call(this, agent, did, collection, rkey);
						returnData.push(...data);
						break;
					}
					case 'getLatestCommit': {
						const did = this.getNodeParameter('did', i) as string;
						const data = await getLatestCommitOperation(agent, did);
						returnData.push(...data);
						break;
					}
					case 'getBlob': {
						const did = this.getNodeParameter('did', i) as string;
						const cid = this.getNodeParameter('cid', i) as string;
						const data = await getBlobOperation.call(this, agent, did, cid);
						returnData.push(...data);
						break;
					}
					case 'listBlobs': {
						const did = this.getNodeParameter('did', i) as string;
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const cursor = this.getNodeParameter('cursor', i, '') as string;
						const data = await listBlobsOperation(agent, did, limit, cursor || undefined);
						returnData.push(...data);
						break;
					}
					case 'listRepos': {
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const cursor = this.getNodeParameter('cursor', i, '') as string;
						const data = await listReposOperation(agent, limit, cursor || undefined);
						returnData.push(...data);
						break;
					}
					case 'notifyOfUpdate': {
						const hostname = this.getNodeParameter('hostname', i) as string;
						const data = await notifyOfUpdateOperation(agent, hostname);
						returnData.push(...data);
						break;
					}
					case 'requestCrawl': {
						const hostname = this.getNodeParameter('hostname', i) as string;
						const data = await requestCrawlOperation(agent, hostname);
						returnData.push(...data);
						break;
					}
					default:
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
						);
				}
				continue;
			}

			if (resource === 'chat') {
				switch (operation) {
					case 'listConvos': {
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const cursor = this.getNodeParameter('cursor', i, '') as string;
						const readState = this.getNodeParameter('readState', i, '') as string;
						const status = this.getNodeParameter('status', i, '') as string;
						const data = await listConversationsOperation(
							agent,
							limit,
							cursor || undefined,
							readState || undefined,
							status || undefined,
						);
						returnData.push(...data);
						break;
					}
					case 'getConvo': {
						const convoId = this.getNodeParameter('convoId', i) as string;
						const data = await getConversationOperation(agent, convoId);
						returnData.push(...data);
						break;
					}
					case 'getMessages': {
						const convoId = this.getNodeParameter('convoId', i) as string;
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const cursor = this.getNodeParameter('cursor', i, '') as string;
						const data = await getMessagesOperation(agent, convoId, limit, cursor || undefined);
						returnData.push(...data);
						break;
					}
					case 'sendMessage': {
						const convoId = this.getNodeParameter('convoId', i) as string;
						const messageText = this.getNodeParameter('messageText', i) as string;
						const data = await sendMessageOperation(agent, convoId, messageText);
						returnData.push(...data);
						break;
					}
					case 'getConvoForMembers': {
						const membersRaw = this.getNodeParameter('members', i) as string;
						const members = membersRaw
							.split(',')
							.map((value) => value.trim())
							.filter(Boolean);
						const data = await getConvoForMembersOperation(agent, members);
						returnData.push(...data);
						break;
					}
					case 'acceptConvo': {
						const convoId = this.getNodeParameter('convoId', i) as string;
						const data = await acceptConversationOperation(agent, convoId);
						returnData.push(...data);
						break;
					}
					case 'leaveConvo': {
						const convoId = this.getNodeParameter('convoId', i) as string;
						const data = await leaveConversationOperation(agent, convoId);
						returnData.push(...data);
						break;
					}
					case 'muteConvo': {
						const convoId = this.getNodeParameter('convoId', i) as string;
						const data = await muteConversationOperation(agent, convoId);
						returnData.push(...data);
						break;
					}
					case 'unmuteConvo': {
						const convoId = this.getNodeParameter('convoId', i) as string;
						const data = await unmuteConversationOperation(agent, convoId);
						returnData.push(...data);
						break;
					}
					case 'updateRead': {
						const convoId = this.getNodeParameter('convoId', i) as string;
						const messageId = this.getNodeParameter('messageId', i, '') as string;
						const data = await updateReadStatusOperation(agent, convoId, messageId || undefined);
						returnData.push(...data);
						break;
					}
					case 'deleteMessage': {
						const convoId = this.getNodeParameter('convoId', i) as string;
						const messageId = this.getNodeParameter('messageId', i) as string;
						const data = await deleteMessageOperation(agent, convoId, messageId);
						returnData.push(...data);
						break;
					}
					default:
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
						);
				}
				continue;
			}

			// Handle other resources' operations (post, user, feed, search, graph, list)
			if (['post', 'user', 'feed', 'search', 'graph', 'list'].includes(resource)) {
				switch (operation) {
					/**
					 * Post operations
					 */

					case 'post':
						try {
							const postText = this.getNodeParameter('postText', i) as string;
							const langs = this.getNodeParameter('langs', i) as string[];
							const includeMedia = this.getNodeParameter('includeMedia', i, false) as boolean;

							let mediaItemsInput: any = undefined;
							if (includeMedia) {
								// The 'mediaItems' parameter is a fixedCollection with typeOptions.multiple = true.
								// For fixedCollection, n8n returns an object like: { media: [array_of_items] }
								// where 'media' is the collection name and the array contains the actual items.
								try {
									const rawMediaItems = this.getNodeParameter('mediaItems', i, {}) as any;

									// Extract the media array from the fixedCollection structure
									let mediaArray: any[] = [];
									if (rawMediaItems && rawMediaItems.media) {
										// Handle both single object and array cases
										if (Array.isArray(rawMediaItems.media)) {
											mediaArray = rawMediaItems.media;
										} else {
											// Single media item - wrap it in an array
											mediaArray = [rawMediaItems.media];
										}
									}

									// Transform the array to match our expected structure
									const transformedItems = mediaArray.map((item: any) => ({
										media: {
											binaryPropertyName: item.binaryPropertyName || 'data',
											altText: item.altText || '',
										},
									}));

									mediaItemsInput = { mediaItems: transformedItems };

									// Log media configuration for troubleshooting
									if (
										Array.isArray(mediaItemsInput.mediaItems) &&
										mediaItemsInput.mediaItems.length > 0
									) {
										console.log(
											`[INFO] Processing ${mediaItemsInput.mediaItems.length} media item(s) for Bluesky post`,
										);
									} else {
										// Ensure we have a valid array even if empty
										mediaItemsInput = { mediaItems: [] };
									}
								} catch (error) {
									console.error(`[ERROR] Error processing media items:`, error);
									// Ensure mediaItems is a valid array in case of any error
									mediaItemsInput = { mediaItems: [] };
								}
							}

							let websiteCardData: any = undefined;
							if (!includeMedia) {
								const websiteCardDetails = this.getNodeParameter('websiteCard', i, {}) as {
									details?: {
										uri: string;
										title: string;
										description: string;
										thumbnailBinaryProperty?: string;
										fetchOpenGraphTags: boolean;
									};
								};
								if (websiteCardDetails.details?.uri) {
									websiteCardData = {
										uri: websiteCardDetails.details.uri,
										title: websiteCardDetails.details.title,
										description: websiteCardDetails.details.description,
										thumbnailBinaryProperty: websiteCardDetails.details.thumbnailBinaryProperty,
										fetchOpenGraphTags: websiteCardDetails.details.fetchOpenGraphTags,
									};
								}
							}

							const postData = await postOperation.call(
								this, // Pass IExecuteFunctions context to postOperation
								agent,
								postText,
								langs,
								websiteCardData,
								includeMedia,
								mediaItemsInput,
							);

							returnData.push(...postData);
						} catch (error) {
							console.error(`[ERROR] Bluesky post operation failed: ${error.message}`, error);
							throw error;
						}
						break;

					case 'deletePost':
						const uriDeletePost = this.getNodeParameter('uri', i) as string;
						const deletePostData = await deletePostOperation(agent, uriDeletePost);
						returnData.push(...deletePostData);
						break;

					case 'like':
						const uriLike = this.getNodeParameter('uri', i) as string;
						const cidLike = this.getNodeParameter('cid', i) as string;
						const likeData = await likeOperation(agent, uriLike, cidLike);
						returnData.push(...likeData);
						break;

					case 'deleteLike':
						const uriDeleteLike = this.getNodeParameter('uri', i) as string;
						const deleteLikeData = await deleteLikeOperation(agent, uriDeleteLike);
						returnData.push(...deleteLikeData);
						break;

					case 'repost':
						const uriRepost = this.getNodeParameter('uri', i) as string;
						const cidRepost = this.getNodeParameter('cid', i) as string;
						const repostData = await repostOperation(agent, uriRepost, cidRepost);
						returnData.push(...repostData);
						break;

					case 'deleteRepost':
						const uriDeleteRepost = this.getNodeParameter('uri', i) as string;
						const deleteRepostData = await deleteRepostOperation(agent, uriDeleteRepost);
						returnData.push(...deleteRepostData);
						break;

					case 'reply':
						try {
							const uriReply = this.getNodeParameter('uri', i) as string;
							const cidReply = this.getNodeParameter('cid', i) as string;
							const replyText = this.getNodeParameter('replyText', i) as string;
							const replyLangs = this.getNodeParameter('replyLangs', i) as string[];
							const includeMediaReply = this.getNodeParameter('includeMedia', i, false) as boolean;
							let mediaItemsInputReply: any = undefined;
							if (includeMediaReply) {
								try {
									const rawMediaItems = this.getNodeParameter('mediaItems', i, {}) as any;
									let mediaArray: any[] = [];
									if (rawMediaItems && rawMediaItems.media && Array.isArray(rawMediaItems.media)) {
										mediaArray = rawMediaItems.media;
									}
									mediaItemsInputReply = { mediaItems: mediaArray };
								} catch (error) {
									console.error(`[ERROR] Error processing media items:`, error);
									mediaItemsInputReply = { mediaItems: [] };
								}
							}
							let websiteCardDataReply: any = undefined;
							if (!includeMediaReply) {
								const websiteCardDetails = this.getNodeParameter('websiteCard', i, {}) as {
									details?: {
										uri: string;
										title: string;
										description: string;
										thumbnailBinaryProperty?: string;
										fetchOpenGraphTags: boolean;
									};
								};
								if (websiteCardDetails.details?.uri) {
									websiteCardDataReply = {
										uri: websiteCardDetails.details.uri,
										title: websiteCardDetails.details.title,
										description: websiteCardDetails.details.description,
										thumbnailBinaryProperty: websiteCardDetails.details.thumbnailBinaryProperty,
										fetchOpenGraphTags: websiteCardDetails.details.fetchOpenGraphTags,
									};
								}
							}
							const replyData = await replyOperation.call(
								this,
								agent,
								replyText,
								replyLangs,
								uriReply,
								cidReply,
								websiteCardDataReply,
								includeMediaReply,
								mediaItemsInputReply,
							);
							returnData.push(...replyData);
						} catch (error) {
							console.error(`[ERROR] Bluesky reply operation failed: ${error.message}`, error);
							throw error;
						}
						break;

					case 'quote':
						const uriQuote = this.getNodeParameter('uri', i) as string;
						const cidQuote = this.getNodeParameter('cid', i) as string;
						const quoteText = this.getNodeParameter('quoteText', i) as string;
						const quoteLangs = this.getNodeParameter('quoteLangs', i) as string[];
						const quoteData = await quoteOperation(
							agent,
							quoteText,
							quoteLangs,
							uriQuote,
							cidQuote,
						);
						returnData.push(...quoteData);
						break;

					/**
					 * Feed operations
					 */

					case 'getAuthorFeed':
						const authorFeedActor = this.getNodeParameter('actor', i) as string;
						const authorFeedPostLimit = this.getNodeParameter('limit', i) as number;
						const authorFeedFilter = this.getNodeParameter(
							'filter',
							i,
							'posts_with_replies',
						) as string;
						const authorFeedCursor = this.getNodeParameter('cursor', i, '') as string;
						const feedData = await getAuthorFeed(
							agent,
							authorFeedActor,
							authorFeedPostLimit,
							authorFeedFilter,
							authorFeedCursor || undefined,
						);
						returnData.push(...feedData);
						break;

					case 'getTimeline':
						const timelinePostLimit = this.getNodeParameter('limit', i) as number;
						const timelineCursor = this.getNodeParameter('cursor', i, '') as string;
						const timelineData = await getTimeline(agent, timelinePostLimit, timelineCursor || undefined);
						returnData.push(...timelineData);
						break;

					case 'getPostThread':
						const threadUriForGet = this.getNodeParameter('uri', i) as string;
						const depth = this.getNodeParameter('depth', i, 0) as number;
						const parentHeight = this.getNodeParameter('parentHeight', i, 0) as number;
						const threadDataArray: INodeExecutionData[] = await getPostThread(
							agent,
							threadUriForGet,
							depth,
							parentHeight,
						);
						returnData.push(...threadDataArray);
						break;

					case 'getPosts': {
						const urisRaw = this.getNodeParameter('uris', i) as string;
						const uris = urisRaw
							.split(',')
							.map((value) => value.trim())
							.filter(Boolean);
						const data = await getPostsOperation(agent, uris);
						returnData.push(...data);
						break;
					}

					case 'getLikes': {
						const uri = this.getNodeParameter('uri', i) as string;
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const cursor = this.getNodeParameter('cursor', i, '') as string;
						const data = await getLikesOperation(agent, uri, limit, cursor || undefined);
						returnData.push(...data);
						break;
					}

					case 'getRepostedBy': {
						const uri = this.getNodeParameter('uri', i) as string;
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const cursor = this.getNodeParameter('cursor', i, '') as string;
						const data = await getRepostedByOperation(agent, uri, limit, cursor || undefined);
						returnData.push(...data);
						break;
					}

					case 'getSuggestedFeeds': {
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const cursor = this.getNodeParameter('cursor', i, '') as string;
						const data = await getSuggestedFeedsOperation(agent, limit, cursor || undefined);
						returnData.push(...data);
						break;
					}

					case 'getFeedGenerators': {
						const feedUrisRaw = this.getNodeParameter('feedUris', i) as string;
						const feedUris = feedUrisRaw
							.split(',')
							.map((value) => value.trim())
							.filter(Boolean);
						const data = await getFeedGeneratorsOperation(agent, feedUris);
						returnData.push(...data);
						break;
					}

					case 'getFeed': {
						const feed = this.getNodeParameter('feed', i) as string;
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const cursor = this.getNodeParameter('cursor', i, '') as string;
						const data = await getFeedOperation(agent, feed, limit, cursor || undefined);
						returnData.push(...data);
						break;
					}

					case 'describeFeedGenerator': {
						const data = await describeFeedGeneratorOperation(agent);
						returnData.push(...data);
						break;
					}

					/**
					 * User operations
					 */

					case 'getProfile':
						const actor = this.getNodeParameter('actor', i) as string;
						const profileData = await getProfileOperation(agent, actor);
						returnData.push(...profileData);
						break;

					case 'getProfiles': {
						const actorsRaw = this.getNodeParameter('actors', i) as string;
						const actors = actorsRaw
							.split(',')
							.map((value) => value.trim())
							.filter(Boolean);
						const profilesData = await getProfilesOperation(agent, actors);
						returnData.push(...profilesData);
						break;
					}

					case 'listAllFollowers':
						const handle = this.getNodeParameter('handle', i) as string;
						const maxResults = this.getNodeParameter('maxResults', i, 1000) as number;
						const pageSize = this.getNodeParameter('pageSize', i, 100) as number;
						const followersData = await listAllFollowersOperation(
							agent,
							handle,
							maxResults,
							pageSize,
						);
						returnData.push(...followersData);
						break;

					case 'listFollowers': {
						const handle = this.getNodeParameter('handle', i) as string;
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const cursor = this.getNodeParameter('cursor', i, '') as string;
						const data = await listFollowersOperation(agent, handle, limit, cursor || undefined);
						returnData.push(...data);
						break;
					}

					case 'listAllFollows':
						const followsHandle = this.getNodeParameter('handle', i) as string;
						const followsMaxResults = this.getNodeParameter('maxResults', i, 1000) as number;
						const followsPageSize = this.getNodeParameter('pageSize', i, 100) as number;
						const followsData = await listAllFollowsOperation(
							agent,
							followsHandle,
							followsMaxResults,
							followsPageSize,
						);
						returnData.push(...followsData);
						break;

					case 'listFollows': {
						const handle = this.getNodeParameter('handle', i) as string;
						const limit = this.getNodeParameter('limit', i, 50) as number;
						const cursor = this.getNodeParameter('cursor', i, '') as string;
						const data = await listFollowsOperation(agent, handle, limit, cursor || undefined);
						returnData.push(...data);
						break;
					}

					case 'mute':
						const didMute = this.getNodeParameter('did', i) as string;
						const muteData = await muteOperation(agent, didMute);
						returnData.push(...muteData);
						break;

					case 'unmute':
						const didUnmute = this.getNodeParameter('did', i) as string;
						const unmuteData = await unmuteOperation(agent, didUnmute);
						returnData.push(...unmuteData);
						break;

					case 'follow': {
						const didFollow = this.getNodeParameter('did', i) as string;
						const followData = await followOperation(agent, didFollow);
						returnData.push(...followData);
						break;
					}

					case 'unfollow': {
						const followUri = this.getNodeParameter('followUri', i) as string;
						const unfollowData = await unfollowOperation(agent, followUri);
						returnData.push(...unfollowData);
						break;
					}

					case 'block':
						const didBlock = this.getNodeParameter('did', i) as string;
						const blockData = await blockOperation(agent, didBlock);
						returnData.push(...blockData);
						break;

					case 'unblock':
						const uriUnblock = this.getNodeParameter('uri', i) as string;
						const unblockData = await unblockOperation(agent, uriUnblock);
						returnData.push(...unblockData);
						break;

					case 'updateProfile': {
						const displayName = this.getNodeParameter('displayName', i, '') as string;
						const description = this.getNodeParameter('description', i, '') as string;
						const avatarBinaryProperty = this.getNodeParameter(
							'avatarBinaryProperty',
							i,
							'',
						) as string;
						const bannerBinaryProperty = this.getNodeParameter(
							'bannerBinaryProperty',
							i,
							'',
						) as string;
						const data = await updateProfileOperation.call(this, agent, {
							displayName: displayName || undefined,
							description: description || undefined,
							avatarBinaryProperty: avatarBinaryProperty || undefined,
							bannerBinaryProperty: bannerBinaryProperty || undefined,
						});
						returnData.push(...data);
						break;
					}

					/**
					 * List operations
					 */

					case 'createList':
						const createName = this.getNodeParameter('name', i) as string;
						const createPurpose = this.getNodeParameter('purpose', i) as string;
						const createDescription = this.getNodeParameter('description', i, '') as string;
						const createListData = await createListOperation(
							agent,
							createName,
							createPurpose,
							createDescription,
						);
						returnData.push(...createListData);
						break;

					case 'updateList':
						const updateListUri = this.getNodeParameter('listUri', i) as string;
						const updateName = this.getNodeParameter('name', i) as string;
						const updatePurpose = this.getNodeParameter('purpose', i) as string;
						const updateDescription = this.getNodeParameter('description', i, '') as string;
						const updateListData = await updateListOperation(
							agent,
							updateListUri,
							updateName,
							updatePurpose,
							updateDescription,
						);
						returnData.push(...updateListData);
						break;

					case 'deleteList':
						const deleteListUri = this.getNodeParameter('listUri', i) as string;
						const deleteListData = await deleteListOperation(agent, deleteListUri);
						returnData.push(...deleteListData);
						break;

					case 'getLists':
						const listsActor = this.getNodeParameter('actor', i) as string;
						const listsLimit = this.getNodeParameter('limit', i, 50) as number;
						const getListsData = await getListsOperation(agent, listsActor, listsLimit);
						returnData.push(...getListsData);
						break;

					case 'getListFeed':
						const feedListUri = this.getNodeParameter('listUri', i) as string;
						const feedLimit = this.getNodeParameter('limit', i, 50) as number;
						const getListFeedData = await getListFeedOperation(agent, feedListUri, feedLimit);
						returnData.push(...getListFeedData);
						break;

					case 'addUserToList':
						const addListUri = this.getNodeParameter('listUri', i) as string;
						const addUserDid = this.getNodeParameter('userDid', i) as string;
						const addUserData = await addUserToListOperation(agent, addListUri, addUserDid);
						returnData.push(...addUserData);
						break;

					case 'removeUserFromList':
						const removeListItemUri = this.getNodeParameter('listItemUri', i) as string;
						const removeUserData = await removeUserFromListOperation(agent, removeListItemUri);
						returnData.push(...removeUserData);
						break;

					default:
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not supported for resource "${resource}"!`,
						);
				}
				continue; // Skip the rest of the loop for these resource operations
			}

			// If we reach here, the resource is not supported for the current item
			throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not supported!`, {
				itemIndex: i,
			});
		}

		return this.prepareOutputData(returnData);
	}
}
