import { AtpAgent } from '@atproto/api';
import { IDataObject, INodeExecutionData, INodeProperties, LoggerProxy } from 'n8n-workflow';

export const accountProperties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['account'],
			},
		},
		options: [
			{
				name: 'Request Transfer',
				value: 'requestTransfer',
				description: 'Request account repository transfer (experimental)',
				action: 'Request account transfer',
			},
		],
		default: 'requestTransfer',
	},
	{
		displayName: 'Request Body (JSON)',
		name: 'requestBodyJson',
		type: 'string',
		default: '{}',
		required: true,
		typeOptions: {
			rows: 6,
		},
		description:
			'Raw JSON body for com.atproto.account.requestTransfer. Refer to the AT Protocol spec for required fields.',
		displayOptions: {
			show: {
				resource: ['account'],
				operation: ['requestTransfer'],
			},
		},
	},
];

export async function requestTransferOperation(
	agent: AtpAgent,
	requestBodyJson: string,
): Promise<INodeExecutionData[]> {
	let body: unknown;
	try {
		body = JSON.parse(requestBodyJson);
	} catch (error) {
		throw new Error(
			`Invalid JSON for request body: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	// Ensure the agent exposes a low-level `call` method. Some agent builds
	// may not publicly type `call`, so use a narrow interface and runtime guard.
	// Use conservative types for opts/body to retain type-safety.
	type AtpAgentWithCall = {
		call: (uri: string, opts?: Record<string, unknown>, body?: unknown) => Promise<any>;
	};
	function ensureAgentHasCall(a: unknown): asserts a is AtpAgentWithCall {
		if (!a || typeof (a as any).call !== 'function') {
			throw new Error(
				'The provided AtpAgent does not expose a `call` method needed for requestTransfer',
			);
		}
	}

	ensureAgentHasCall(agent);

	let response: unknown;
	try {
		response = await agent.call('com.atproto.account.requestTransfer', undefined, body);
	} catch (error: any) {
		LoggerProxy.error('Account transfer request failed', {
			error: error instanceof Error ? error.message : String(error),
		});
		const cause = error instanceof Error ? error : new Error(String(error));
		const err = new Error(
			`Failed to call com.atproto.account.requestTransfer: ${error instanceof Error ? error.message : String(error)}`,
		);
		// Attach the original error as `cause` for debugging when supported by runtimes
		(err as any).cause = cause;
		throw err;
	}

	const result = (response as { data?: IDataObject }).data ?? (response as IDataObject | undefined);
	if (
		result == null ||
		(typeof result === 'object' && !Array.isArray(result) && Object.keys(result).length === 0)
	) {
		throw new Error('Account transfer request returned no response data');
	}

	return [
		{
			json: result as IDataObject,
		},
	];
}
