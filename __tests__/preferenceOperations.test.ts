/**
 * Tests for preferenceOperations.ts
 * Covers: getPreferencesOperation, putPreferencesOperation
 */
import {
	getPreferencesOperation,
	putPreferencesOperation,
} from '../nodes/Bluesky/V2/preferenceOperations';

function createMockAgent(): any {
	return {
		getPreferences: jest.fn().mockResolvedValue({
			savedFeeds: [{ type: 'feed', value: 'at://feed1' }],
			contentLabels: { nsfw: 'hide' },
		}),
		app: {
			bsky: {
				actor: {
					putPreferences: jest.fn().mockResolvedValue(undefined),
				},
			},
		},
	};
}

describe('Preference Operations', () => {
	let agent: any;
	beforeEach(() => {
		agent = createMockAgent();
	});

	describe('getPreferencesOperation', () => {
		it('should return user preferences', async () => {
			const result = await getPreferencesOperation(agent);
			expect(agent.getPreferences).toHaveBeenCalled();
			expect(result).toHaveLength(1);
			expect(result[0].json).toHaveProperty('savedFeeds');
			expect(result[0].json).toHaveProperty('contentLabels');
		});
	});

	describe('putPreferencesOperation', () => {
		it('should update preferences with JSON input', async () => {
			const prefsJson = JSON.stringify([
				{ $type: 'app.bsky.actor.defs#savedFeedsPrefV2', items: [] },
			]);
			const result = await putPreferencesOperation(agent, prefsJson);
			expect(agent.app.bsky.actor.putPreferences).toHaveBeenCalledWith({
				preferences: [{ $type: 'app.bsky.actor.defs#savedFeedsPrefV2', items: [] }],
			});
			expect(result).toHaveLength(1);
			expect(result[0].json).toEqual({ success: true });
		});

		it('should throw on invalid JSON', async () => {
			await expect(putPreferencesOperation(agent, 'not json')).rejects.toThrow();
		});
	});
});
