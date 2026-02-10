import { AtpAgent } from '@atproto/api';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const lexiconProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['lexicon'],
			},
		},
		options: [
			{
				name: 'Resolve Lexicon',
				value: 'resolveLexicon',
				description: 'Fetch a lexicon schema by URL or NSID',
				action: 'Resolve lexicon',
			},
		],
		default: 'resolveLexicon',
	},
	{
		displayName: 'Lexicon URL or NSID',
		name: 'lexiconUrl',
		type: 'string',
		default: '',
		description:
			'Lexicon NSID to resolve (for example: com.atproto.sync.getRepo). If a full XRPC URL is provided, the NSID part will be extracted automatically.',
		displayOptions: {
			show: {
				resource: ['lexicon'],
				operation: ['resolveLexicon'],
			},
		},
	},
	{
		displayName: 'Query Params (JSON)',
		name: 'lexiconParamsJson',
		type: 'string',
		default: '',
		typeOptions: {
			rows: 4,
		},
		description:
			'Optional JSON object for query params. If provided, this overrides Lexicon URL/NSID.',
		displayOptions: {
			show: {
				resource: ['lexicon'],
				operation: ['resolveLexicon'],
			},
		},
	},
];

export async function resolveLexiconOperation(
	agent: AtpAgent,
	lexiconUrl: string,
	lexiconParamsJson?: string,
): Promise<INodeExecutionData[]> {
	let params: Record<string, unknown> | undefined;

	if (lexiconParamsJson && lexiconParamsJson.trim()) {
		try {
			const parsed = JSON.parse(lexiconParamsJson);
			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
				throw new Error('Query params must be a JSON object');
			}
			params = parsed as Record<string, unknown>;
		} catch (error) {
			throw new Error(
				`Invalid JSON for query params: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	} else if (lexiconUrl) {
		const raw = lexiconUrl.trim();
		let nsid = raw;
		const xrpcMarker = '/xrpc/';
		const markerIndex = raw.indexOf(xrpcMarker);
		if (markerIndex >= 0) {
			nsid = raw.slice(markerIndex + xrpcMarker.length);
		}
		params = { nsid };
	}

	if (!params) {
		throw new Error('Lexicon URL/NSID or query params are required.');
	}

	// Ensure the agent exposes a low-level `call` method. The SDK may not
	// publicly export the narrow call types we want, so provide a conservative
	// local interface and runtime guard for type-safety. TODO: if `@atproto/api`
	// later exports an explicit call type (e.g. `AtpAgentCallOptions`/`AtpAgentCallBody`),
	// replace this with the SDK type and remove the guard.
	type AtpAgentWithCall = {
		call: (
			uri: string,
			params?: Record<string, unknown>,
			opts?: Record<string, unknown>,
		) => Promise<any>;
	};
	function ensureAgentHasCall(a: unknown): asserts a is AtpAgentWithCall {
		if (!a || typeof (a as any).call !== 'function') {
			throw new Error(
				'The provided AtpAgent does not expose a `call` method needed for com.atproto.lexicon.resolveLexicon',
			);
		}
	}

	ensureAgentHasCall(agent);

	const response = await agent.call('com.atproto.lexicon.resolveLexicon', params, undefined);

	return [
		{
			json: (response?.data ?? response) as IDataObject,
		},
	];
}
