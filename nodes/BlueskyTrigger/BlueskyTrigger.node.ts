import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
// Trigger types aren't exported from main index, import from interfaces directly
import { AtpAgent, CredentialSession } from '@atproto/api';
import { cborDecode } from '@atproto/lex-cbor';
import type { ITriggerFunctions, ITriggerResponse } from 'n8n-workflow/dist/cjs/interfaces';
import WebSocket from 'ws';
import {
	matchesFilters,
	parseFirehoseMessage,
	type LabelMessage,
	type ParsedMessage,
} from './firehoseParser';

export class BlueskyTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bluesky Trigger',
		name: 'blueskyTrigger',
		icon: 'file:bluesky.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Bluesky events occur (firehose)',
		defaults: {
			name: 'Bluesky Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'blueskyApi',
				required: false,
				displayOptions: {
					show: {
						stream: ['subscribeLabels'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Stream Type',
				name: 'stream',
				type: 'options',
				options: [
					{
						name: 'Repository Events (Firehose)',
						value: 'subscribeRepos',
						description: 'Subscribe to all repository events (posts, likes, follows, etc.)',
					},
					{
						name: 'Label Updates',
						value: 'subscribeLabels',
						description: 'Subscribe to label updates (moderation labels)',
					},
				],
				default: 'subscribeRepos',
				description: 'The type of events to subscribe to',
			},
			{
				displayName: 'Service Endpoint',
				name: 'serviceEndpoint',
				type: 'string',
				default: '',
				placeholder: 'wss://bsky.network',
				description:
					'The WebSocket endpoint to connect to (defaults to wss://bsky.network for both streams)',
			},
			{
				displayName: 'Max Events',
				name: 'maxEvents',
				type: 'number',
				default: 0,
				description: 'Maximum number of events to capture (0 for unlimited)',
			},
			{
				displayName: 'Filter by Collection',
				name: 'filterCollection',
				type: 'string',
				default: '',
				placeholder: 'app.bsky.feed.post',
				description:
					'Filter events by collection type (e.g., app.bsky.feed.post, app.bsky.feed.like)',
				displayOptions: {
					show: {
						stream: ['subscribeRepos'],
					},
				},
			},
			{
				displayName: 'Filter by DID',
				name: 'filterDid',
				type: 'string',
				default: '',
				placeholder: 'did:plc:...',
				description: 'Filter events by specific DID (user identifier)',
				displayOptions: {
					show: {
						stream: ['subscribeRepos'],
					},
				},
			},
			{
				displayName: 'Filter by Operation',
				name: 'filterOperation',
				type: 'options',
				options: [
					{
						name: 'All',
						value: '',
					},
					{
						name: 'Create',
						value: 'create',
					},
					{
						name: 'Update',
						value: 'update',
					},
					{
						name: 'Delete',
						value: 'delete',
					},
				],
				default: '',
				description: 'Filter by operation type',
				displayOptions: {
					show: {
						stream: ['subscribeRepos'],
					},
				},
			},
			{
				displayName: 'Auto Reconnect',
				name: 'autoReconnect',
				type: 'boolean',
				default: true,
				description: 'Whether to automatically reconnect on connection loss',
			},
			{
				displayName: 'Reconnect Interval',
				name: 'reconnectInterval',
				type: 'number',
				default: 5000,
				description: 'Milliseconds to wait before reconnecting',
				displayOptions: {
					show: {
						autoReconnect: [true],
					},
				},
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const stream = this.getNodeParameter('stream', '') as string;
		let serviceEndpoint = this.getNodeParameter('serviceEndpoint', '') as string;

		// Apply dynamic defaults based on stream type if endpoint is empty
		if (!serviceEndpoint) {
			// Both subscribeRepos and subscribeLabels use the same public relay endpoint
			serviceEndpoint = 'wss://bsky.network';
		}

		const maxEvents = this.getNodeParameter('maxEvents', 0) as number;
		const filterCollection = this.getNodeParameter('filterCollection', '', {
			extractValue: true,
		}) as string;
		const filterDid = this.getNodeParameter('filterDid', '', { extractValue: true }) as string;
		const filterOperation = this.getNodeParameter('filterOperation', '', {
			extractValue: true,
		}) as string;
		const autoReconnect = this.getNodeParameter('autoReconnect', true) as boolean;
		const reconnectInterval = this.getNodeParameter('reconnectInterval', 5000) as number;

		let ws: WebSocket | null = null;
		let eventCount = 0;
		let shouldReconnect = true;
		let reconnectTimer: NodeJS.Timeout | null = null;
		let authHeader: string | undefined;

		// Bounded queue for backpressure control
		const QUEUE_HIGH_WATER_MARK = 1000; // Pause socket when queue reaches this size
		const QUEUE_LOW_WATER_MARK = 250; // Resume socket when queue drains to this size
		const QUEUE_HARD_LIMIT = 5000; // Drop oldest messages to prevent unbounded growth
		const messageQueue: Buffer[] = [];
		let isProcessing = false;
		let workerShouldStop = false;
		let isPaused = false;

		// Signal mechanism to wake worker when new messages arrive
		let newMessageResolve: (() => void) | null = null;

		const waitNewMessage = (): Promise<void> => {
			return new Promise((resolve) => {
				// Fast-path check before waiting
				if (workerShouldStop || messageQueue.length > 0) {
					resolve();
					return;
				}
				newMessageResolve = resolve;
				// Re-check after setting resolver to close race window
				if (workerShouldStop || messageQueue.length > 0) {
					newMessageResolve = null;
					resolve();
				}
			});
		};

		const signalNewMessage = () => {
			if (newMessageResolve) {
				const resolve = newMessageResolve;
				newMessageResolve = null;
				resolve();
			}
		};

		// Async worker that processes messages from the queue
		const processQueue = async () => {
			isProcessing = true;

			while (!workerShouldStop) {
				// Wait for messages in queue
				if (messageQueue.length === 0) {
					// Wait for signal from message handler instead of busy-waiting
					await waitNewMessage();
					continue;
				}

				// Dequeue and process message
				const data = messageQueue.shift()!;

				// Resume socket if we've drained below low-water mark
				if (isPaused && messageQueue.length <= QUEUE_LOW_WATER_MARK) {
					isPaused = false;
					if (ws && ws.readyState === WebSocket.OPEN) {
						try {
							// BACKPRESSURE: Resume underlying TCP socket to allow more data
							// Tested with ws@^8.18.0 (package.json dependency)
							// The ws library does not expose a public API for TCP-level backpressure control.
							// Accessing _socket.resume() is necessary to signal the underlying Node.js net.Socket
							// to resume reading from the TCP connection after we paused it.
							// This prevents memory exhaustion when the firehose sends data faster than we can process.
							if ((ws as any)._socket && typeof (ws as any)._socket.resume === 'function') {
								(ws as any)._socket.resume();
								this.logger.info(`Queue drained to ${messageQueue.length}, resumed TCP socket`);
							} else if (typeof (ws as any).resume === 'function') {
								// Fallback: some environments may expose resume() directly on WebSocket
								(ws as any).resume();
								this.logger.info(`Queue drained to ${messageQueue.length}, resumed WebSocket`);
							} else {
								this.logger.warn(
									'Cannot resume socket: neither _socket.resume() nor ws.resume() available',
								);
							}
						} catch (resumeError) {
							this.logger.error(
								`Failed to resume socket: ${resumeError instanceof Error ? resumeError.message : String(resumeError)}`,
							);
						}
					}
				}

				try {
					// Check if we've reached the max event limit
					if (maxEvents > 0 && eventCount >= maxEvents) {
						this.logger.info(`Reached max events limit (${maxEvents}), closing connection`);
						shouldReconnect = false;
						ws?.close();
						break;
					}

					let message: ParsedMessage | LabelMessage | null = null;

					// Handle different message formats
					if (stream === 'subscribeRepos') {
						// Parse the firehose message
						message = parseFirehoseMessage(data);

						if (!message) {
							// If parsing fails, it might be a binary CAR file
							// We'll skip it for now or could emit raw data
							this.logger.debug('Failed to parse firehose message');
							continue;
						}

						// Apply filters
						const filters = {
							collection: filterCollection || undefined,
							repo: filterDid || undefined,
							action: filterOperation || undefined,
						};

						if (!matchesFilters(message, filters)) {
							continue;
						}
					} else {
						// Label subscriptions are CBOR-framed like other XRPC subscriptions
						try {
							let labelMessage: unknown;
							try {
								labelMessage = cborDecode(data);
							} catch (cborError) {
								// Fallback to JSON for tests or non-CBOR payloads
								labelMessage = JSON.parse(data.toString('utf8'));
							}

							// Construct properly typed LabelMessage
							message = {
								...(labelMessage as Record<string, unknown>),
								type: 'label' as const,
							} satisfies LabelMessage;
						} catch (parseError) {
							this.logger.error(
								`Failed to parse label message: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
							);
							continue;
						}
					}

					eventCount++;

					// Emit the event to the workflow
					this.emit([
						this.helpers.returnJsonArray([
							{
								...message,
								eventCount,
								receivedAt: new Date().toISOString(),
							},
						]),
					]);
				} catch (error) {
					this.logger.error(
						`Error processing queued message: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			}

			isProcessing = false;
		};

		// Start the async worker
		processQueue().catch((error) => {
			this.logger.error(
				`Queue worker encountered fatal error: ${error instanceof Error ? error.message : String(error)}`,
			);
		});

		// Optional auth for label stream
		if (stream === 'subscribeLabels') {
			try {
				const rawCreds = await this.getCredentials('blueskyApi');

				const isBlueskyCreds = (
					c: any,
				): c is { identifier: string; appPassword: string; serviceUrl: string } =>
					!!c &&
					typeof c === 'object' &&
					typeof c.identifier === 'string' &&
					typeof c.appPassword === 'string' &&
					typeof c.serviceUrl === 'string';

				if (!isBlueskyCreds(rawCreds)) {
					const error =
						'Bluesky API credentials are missing or invalid. Please provide identifier, appPassword, and serviceUrl.';
					this.logger.error(error);
					this.emit([this.helpers.returnJsonArray([{ error }])]);
					shouldReconnect = false;
					workerShouldStop = true;
					signalNewMessage();
				} else {
					const creds = rawCreds;
					const serviceUrl = new URL(creds.serviceUrl.replace(/\/+$/, ''));
					const session = new CredentialSession(serviceUrl);
					const agent = new AtpAgent(session);
					const sessionResponse = await agent.api.com.atproto.server.createSession({
						identifier: creds.identifier,
						password: creds.appPassword,
					});
					authHeader = `Bearer ${sessionResponse.data.accessJwt}`;
				}
			} catch (authError) {
				const message = authError instanceof Error ? authError.message : String(authError);
				this.logger.error(`Failed to authenticate label stream: ${message}`);
				this.emit([this.helpers.returnJsonArray([{ error: message }])]);
				shouldReconnect = false;
				workerShouldStop = true;
				signalNewMessage();
			}
		}

		const connect = () => {
			if (!shouldReconnect) return;

			// Validate serviceEndpoint before constructing URL
			if (!serviceEndpoint || typeof serviceEndpoint !== 'string') {
				const error = 'Service endpoint is empty or invalid';
				this.logger.error(error);
				this.emit([this.helpers.returnJsonArray([{ error }])]);
				shouldReconnect = false;
				return;
			}

			// Validate serviceEndpoint protocol
			if (!serviceEndpoint.startsWith('wss://') && !serviceEndpoint.startsWith('ws://')) {
				const error = `Service endpoint must use ws:// or wss:// protocol, got: ${serviceEndpoint}`;
				this.logger.error(error);
				this.emit([this.helpers.returnJsonArray([{ error }])]);
				shouldReconnect = false;
				return;
			}

			const endpoint =
				stream === 'subscribeRepos'
					? `${serviceEndpoint}/xrpc/com.atproto.sync.subscribeRepos`
					: `${serviceEndpoint}/xrpc/com.atproto.label.subscribeLabels`;

			// Validate the final endpoint URL
			try {
				const parsedUrl = new URL(endpoint);
				if (parsedUrl.protocol !== 'wss:' && parsedUrl.protocol !== 'ws:') {
					throw new Error(`Invalid protocol: ${parsedUrl.protocol}`);
				}
			} catch (urlError) {
				const error = `Invalid WebSocket endpoint URL: ${endpoint} - ${urlError instanceof Error ? urlError.message : String(urlError)}`;
				this.logger.error(error);
				this.emit([this.helpers.returnJsonArray([{ error }])]);
				shouldReconnect = false;
				return;
			}

			// Construct WebSocket with error handling
			try {
				ws = authHeader
					? new WebSocket(endpoint, { headers: { Authorization: authHeader } })
					: new WebSocket(endpoint);
			} catch (wsError) {
				const error = `Failed to create WebSocket connection: ${wsError instanceof Error ? wsError.message : String(wsError)}`;
				this.logger.error(error);
				this.emit([this.helpers.returnJsonArray([{ error }])]);
				scheduleReconnect();
				return;
			}

			ws.on('open', () => {
				this.logger.info(`Connected to ${stream} stream`);
			});

			// Message handler: enqueue for async processing with backpressure
			ws.on('message', (data: Buffer) => {
				try {
					if (messageQueue.length >= QUEUE_HARD_LIMIT) {
						const dropCount = messageQueue.length - QUEUE_HARD_LIMIT + 1;
						messageQueue.splice(0, dropCount);
						this.logger.warn(
							`Queue exceeded hard limit (${QUEUE_HARD_LIMIT}), dropped ${dropCount} message(s)`,
						);
					}

					// Enqueue the message for processing by the worker
					messageQueue.push(data);

					// Signal worker to wake up and process new message
					signalNewMessage();

					// Apply backpressure: pause socket when queue is at high-water mark
					if (!isPaused && messageQueue.length >= QUEUE_HIGH_WATER_MARK) {
						isPaused = true;
						try {
							// BACKPRESSURE: Pause underlying TCP socket to stop reading more data
							// Tested with ws@^8.18.0 (package.json dependency)
							// The ws library does not expose a public API for TCP-level backpressure control.
							// Accessing _socket.pause() is necessary to signal the underlying Node.js net.Socket
							// to stop reading from the TCP connection and apply backpressure to the sender.
							// This prevents our messageQueue from growing unbounded when processing falls behind.
							if ((ws as any)._socket && typeof (ws as any)._socket.pause === 'function') {
								(ws as any)._socket.pause();
								this.logger.warn(
									`Queue size ${messageQueue.length} reached high-water mark, paused TCP socket`,
								);
							} else if (typeof (ws as any).pause === 'function') {
								// Fallback: some environments may expose pause() directly on WebSocket
								(ws as any).pause();
								this.logger.warn(
									`Queue size ${messageQueue.length} reached high-water mark, paused WebSocket`,
								);
							} else {
								this.logger.warn(
									`Cannot pause socket: neither _socket.pause() nor ws.pause() available. Queue size: ${messageQueue.length}`,
								);
							}
						} catch (pauseError) {
							this.logger.error(
								`Failed to pause WebSocket: ${pauseError instanceof Error ? pauseError.message : String(pauseError)}`,
							);
						}
					}
				} catch (error) {
					this.logger.error(
						`Error enqueueing message: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			});

			ws.on('error', (error) => {
				this.logger.error(`WebSocket error: ${error.message}`);
				scheduleReconnect();
			});

			ws.on('close', () => {
				this.logger.info('WebSocket connection closed');
				scheduleReconnect(true);
			});
		};

		const scheduleReconnect = (logDelay = false) => {
			if (!autoReconnect || !shouldReconnect || reconnectTimer) {
				return;
			}

			if (logDelay) {
				this.logger.info(`Reconnecting in ${reconnectInterval}ms...`);
			}

			reconnectTimer = setTimeout(() => {
				reconnectTimer = null;
				connect();
			}, reconnectInterval);
		};

		// Start the connection
		connect();

		// Function to close the connection
		async function closeFunction() {
			shouldReconnect = false;

			// Stop the queue worker
			workerShouldStop = true;

			// Signal worker to wake up and check workerShouldStop
			signalNewMessage();

			// Wait for worker to finish processing current message
			let waitCount = 0;
			while (isProcessing && waitCount < 50) {
				await new Promise((resolve) => setTimeout(resolve, 100));
				waitCount++;
			}

			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
			if (ws) {
				ws.close();
			}

			// Clear any remaining messages in queue
			messageQueue.length = 0;
		}

		return {
			closeFunction,
		};
	}
}
