import { INodeProperties } from 'n8n-workflow';
import { Bluesky } from '../nodes/Bluesky/Bluesky.node';
import { BlueskyV2 } from '../nodes/Bluesky/V2/BlueskyV2.class';

describe('Bluesky Node - Core', () => {
	test('should have correct node metadata', () => {
		const node = new Bluesky();
		expect(node.description.name).toBe('bluesky');
		expect(node.description.displayName).toBe('Bluesky');
		expect(node.description.group).toEqual(['transform']);
		expect(node.description.defaultVersion).toBe(2);
	});
});

describe('Bluesky V2 - Description', () => {
	const baseDescription = {
		displayName: 'Bluesky',
		name: 'bluesky',
		icon: 'file:bluesky.svg',
		group: ['transform'],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Bluesky social platform',
		defaultVersion: 2,
	};

	let node: BlueskyV2;

	beforeAll(() => {
		node = new BlueskyV2(baseDescription);
	});

	test('should define required Bluesky credentials', () => {
		const creds = node.description.credentials;
		expect(creds).toBeDefined();
		expect(creds?.[0].name).toBe('blueskyApi');
		expect(creds?.[0].required).toBe(true);
	});

	test('should include resource property with expected defaults', () => {
		const props = node.description.properties as INodeProperties[];
		const resourceProp = props.find((p) => p.name === 'resource');
		expect(resourceProp).toBeDefined();
		expect(resourceProp?.type).toBe('options');
		expect(resourceProp?.default).toBe('post');

		const options = (resourceProp?.options as Array<{ value?: string }>) || [];
		const values = options.map((o) => o.value);
		expect(values).toContain('post');
		expect(values).toContain('user');
		expect(values).toContain('search');
		expect(values).toContain('list');
	});
});
