import { INodeProperties } from 'n8n-workflow';
import { BlueskyV2 } from '../nodes/Bluesky/V2/BlueskyV2.class';

describe('Bluesky V2 - List Properties', () => {
	const baseDescription: any = {
		displayName: 'Bluesky',
		name: 'bluesky',
		icon: 'file:bluesky.svg',
		group: ['transform'],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Bluesky social platform',
		defaultVersion: 2,
	};

	test('should define list operations and required fields', () => {
		const node = new BlueskyV2(baseDescription);
		const props = node.description.properties as INodeProperties[];

		const opProp = props.find(
			(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('list'),
		);
		expect(opProp).toBeDefined();

		const options = (opProp?.options as Array<{ value?: string }>) || [];
		const values = options.map((o) => o.value);
		expect(values).toContain('createList');
		expect(values).toContain('updateList');
		expect(values).toContain('deleteList');
		expect(values).toContain('addUserToList');
		expect(values).toContain('removeUserFromList');

		const listUriProp = props.find((p) => p.name === 'listUri');
		expect(listUriProp).toBeDefined();
		expect(listUriProp?.required).toBe(true);
	});
});
