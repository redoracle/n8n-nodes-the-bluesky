import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { BlueskyV2 } from './V2/BlueskyV2.class';

export class Bluesky extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Bluesky',
			name: 'bluesky',
			icon: 'file:bluesky.svg',
			group: ['transform'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Interact with the Bluesky social platform',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			// Note: BlueskyV2 properly implements INodeType, but TypeScript sees the shim
			// types from types/n8n-workflow-shim.d.ts (loaded via typeRoots) which define
			// INodeTypeDescription as Record<string, any>. This causes a type mismatch.
			// The 'as any' cast is safe because BlueskyV2.description is correctly typed
			// as INodeTypeDescription from the real n8n-workflow package at runtime.

			// Version 1: Use BlueskyV2 implementation for backward compatibility with legacy workflows
			// This ensures workflows created with typeVersion: 1 continue to work
			1: new BlueskyV2(baseDescription) as any,
			2: new BlueskyV2(baseDescription) as any,
		};

		super(nodeVersions, baseDescription);
	}
}
