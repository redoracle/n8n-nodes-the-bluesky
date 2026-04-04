// Local minimal type declarations for ITriggerFunctions and ITriggerResponse.
// ITriggerFunctions and ITriggerResponse are NOT re-exported from the n8n-workflow
// public index (dist/cjs/index or dist/esm/index). Using the deep private path
// 'n8n-workflow/dist/cjs/interfaces' is fragile and will break if n8n-workflow
// ever restructures its internals. Only the properties actually consumed by
// BlueskyTrigger.node.ts are declared here.

export interface ITriggerFunctions {
	getNodeParameter(parameterName: string, fallbackValue?: unknown): unknown;
	getNodeParameter(
		parameterName: string,
		fallbackValue: unknown,
		options: { extractValue?: boolean },
	): unknown;
	getCredentials(type: string): Promise<Record<string, unknown>>;
	emit(data: unknown[][]): void;
	helpers: {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		returnJsonArray(items: any): any[];
	};
	logger: {
		info(message: string): void;
		warn(message: string): void;
		error(message: string): void;
		debug(message: string): void;
	};
}

export interface ITriggerResponse {
	closeFunction?: () => Promise<void>;
}
