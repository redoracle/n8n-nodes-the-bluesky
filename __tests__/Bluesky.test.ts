jest.mock('n8n-workflow/dist/esm/versioned-node-type', () => ({
	VersionedNodeType: class {
		description: unknown;
		nodeVersions: unknown;
		constructor(nodeVersions: unknown, baseDescription: unknown) {
			this.nodeVersions = nodeVersions;
			this.description = baseDescription;
		}
	},
}));

import { INodeProperties } from 'n8n-workflow';
import { Bluesky } from '../nodes/Bluesky/Bluesky.node';
import { BlueskyV2 } from '../nodes/Bluesky/V2/BlueskyV2.class';

describe('Bluesky Node - Core', () => {
	test('should have correct node metadata', () => {
		const node = new Bluesky();
		// Access description property inherited from VersionedNodeType
		const desc = (node as any).description;
		expect(desc.name).toBe('bluesky');
		expect(desc.displayName).toBe('Bluesky');
		expect(desc.group).toEqual(['transform']);
		expect(desc.defaultVersion).toBe(2);
	});

	test('should register both version 1 and version 2 for backward compatibility', () => {
		const node = new Bluesky();
		const nodeVersions = (node as any).nodeVersions;

		// Verify version 1 exists (for legacy workflows)
		expect(nodeVersions).toHaveProperty('1');
		expect(nodeVersions[1]).toBeInstanceOf(BlueskyV2);

		// Verify version 2 exists (current version)
		expect(nodeVersions).toHaveProperty('2');
		expect(nodeVersions[2]).toBeInstanceOf(BlueskyV2);
	});
});

describe('Bluesky V2 - Description', () => {
	const baseDescription: any = {
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
