import { IExecuteFunctions } from 'n8n-workflow';
import { BlueskyV2 } from '../nodes/Bluesky/V2/BlueskyV2.class';

jest.mock('@atproto/api', () => {
	const AtpAgent = jest.fn().mockImplementation(() => ({
		login: jest.fn().mockResolvedValue(undefined),
	}));
	const CredentialSession = jest.fn().mockImplementation(() => ({}));
	return { AtpAgent, CredentialSession };
});

jest.mock('../nodes/Bluesky/V2/postOperations', () => ({
	postProperties: [],
	postOperation: jest.fn(),
	deletePostOperation: jest.fn(),
	likeOperation: jest.fn(),
	deleteLikeOperation: jest.fn(),
	repostOperation: jest.fn(),
	deleteRepostOperation: jest.fn(),
	replyOperation: jest.fn(),
	quoteOperation: jest.fn(),
}));

jest.mock('../nodes/Bluesky/V2/userOperations', () => ({
	userProperties: [],
	getProfileOperation: jest.fn(),
	listAllFollowersOperation: jest.fn(),
	listAllFollowsOperation: jest.fn(),
	muteOperation: jest.fn(),
	unmuteOperation: jest.fn(),
	blockOperation: jest.fn(),
	unblockOperation: jest.fn(),
}));

jest.mock('../nodes/Bluesky/V2/feedOperations', () => ({
	feedProperties: [],
	getAuthorFeed: jest.fn(),
	getTimeline: jest.fn(),
	getPostThread: jest.fn(),
}));

jest.mock('../nodes/Bluesky/V2/searchOperations', () => ({
	searchProperties: [],
	searchUsersOperation: jest.fn(),
	searchPostsOperation: jest.fn(),
}));

jest.mock('../nodes/Bluesky/V2/graphOperations', () => ({
	graphProperties: [],
	muteThreadOperation: jest.fn(),
}));

jest.mock('../nodes/Bluesky/V2/notificationOperations', () => ({
	listNotificationsOperation: jest.fn(),
}));

jest.mock('../nodes/Bluesky/V2/analyticsOperations', () => ({
	analyticsProperties: [],
	getUnreadCountOperation: jest.fn(),
	updateSeenNotificationsOperation: jest.fn(),
	getPostInteractionsOperation: jest.fn(),
}));

jest.mock('../nodes/Bluesky/V2/listOperations', () => ({
	listProperties: [],
	createListOperation: jest.fn(),
	updateListOperation: jest.fn(),
	deleteListOperation: jest.fn(),
	getListsOperation: jest.fn(),
	getListFeedOperation: jest.fn(),
	addUserToListOperation: jest.fn(),
	removeUserFromListOperation: jest.fn(),
}));

import { searchUsersOperation } from '../nodes/Bluesky/V2/searchOperations';
import { muteThreadOperation } from '../nodes/Bluesky/V2/graphOperations';
import { listNotificationsOperation } from '../nodes/Bluesky/V2/notificationOperations';

const baseDescription = {
	displayName: 'Bluesky',
	name: 'bluesky',
	icon: 'file:bluesky.svg',
	group: ['transform'],
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Interact with the Bluesky social platform',
	defaultVersion: 2,
};

describe('Bluesky V2 - Execute', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const makeCtx = (): Partial<IExecuteFunctions> => ({
		getInputData: jest.fn().mockReturnValue([{ json: {} }]),
		getCredentials: jest.fn().mockResolvedValue({
			identifier: 'user.bsky.social',
			appPassword: 'app-pass',
			serviceUrl: 'https://bsky.social',
		}),
		getNodeParameter: jest.fn(),
		continueOnFail: () => false,
		getNode: () =>
			({
				id: '1',
				type: 'bluesky',
				name: 'Bluesky',
				typeVersion: 2,
				position: [0, 0],
				parameters: {},
			} as unknown as ReturnType<IExecuteFunctions['getNode']>),
	});

	it('should execute searchUsers operation', async () => {
		(searchUsersOperation as jest.Mock).mockResolvedValue([{ json: { ok: true } }]);

		const ctx = makeCtx();
		(ctx.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
			switch (name) {
				case 'resource':
					return 'search';
				case 'operation':
					return 'searchUsers';
				case 'q':
					return 'n8n';
				case 'limit':
					return 5;
				default:
					return undefined;
			}
		});

		const node = new BlueskyV2(baseDescription);
		const result = await node.execute.call(ctx as IExecuteFunctions);

		expect(searchUsersOperation).toHaveBeenCalledWith(expect.anything(), 'n8n', 5);
		expect(result).toEqual([[{ json: { ok: true } }]]);
	});

	it('should execute graph muteThread operation', async () => {
		(muteThreadOperation as jest.Mock).mockResolvedValue(undefined);

		const ctx = makeCtx();
		(ctx.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
			switch (name) {
				case 'resource':
					return 'graph';
				case 'operation':
					return 'muteThread';
				case 'uri':
					return 'at://did:plc:123/app.bsky.feed.post/abc';
				default:
					return undefined;
			}
		});

		const node = new BlueskyV2(baseDescription);
		const result = await node.execute.call(ctx as IExecuteFunctions);

		expect(muteThreadOperation).toHaveBeenCalled();
		expect(result?.[0]?.[0].json).toEqual({
			success: true,
			message: 'Thread at://did:plc:123/app.bsky.feed.post/abc muted.',
		});
	});

	it('should execute analytics listNotifications operation', async () => {
		(listNotificationsOperation as jest.Mock).mockResolvedValue([{ json: { n: 1 } }]);

		const ctx = makeCtx();
		(ctx.getNodeParameter as jest.Mock).mockImplementation((name: string, _i: number, def?: any) => {
			switch (name) {
				case 'resource':
					return 'analytics';
				case 'operation':
					return 'listNotifications';
				case 'limit':
					return 3;
				case 'unreadOnly':
					return true;
				case 'markRetrievedAsRead':
					return false;
				default:
					return def;
			}
		});

		const node = new BlueskyV2(baseDescription);
		const result = await node.execute.call(ctx as IExecuteFunctions);

		expect(listNotificationsOperation).toHaveBeenCalledWith(expect.anything(), 3, true, false);
		expect(result).toEqual([[{ json: { n: 1 } }]]);
	});
});
