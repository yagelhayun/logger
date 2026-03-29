import type { LogLevel } from '../common/types';
import { CLIENT_LOGS_ENDPOINT } from '../common/consts';
import type { LoggerConfig } from './types';

/**
 * @internal
 */
export const AUTO_FLUSH_LEVELS: LogLevel[] = ['warn', 'error'];

/**
 * @internal
 */
export const defaultConfig: LoggerConfig = {
	bufferSize: 10,
	bufferFlushInterval: 30,
	logEndpoint: CLIENT_LOGS_ENDPOINT
};

/**
 * Serializes an error value into a plain object, capturing non-enumerable
 * properties (message, name, stack) that JSON.stringify would miss.
 *
 * @internal
 */
export const serializeError = (error: unknown): Record<string, any> => {
	if (!(error instanceof Error)) return { value: String(error) };
	return {
		message: error.message,
		name: error.name,
		stack: error.stack,
		...Object.fromEntries(Object.entries(error))
	};
};

/**
 * Returns a debounced version of the provided function using a microtask,
 * collapsing synchronous bursts into a single call.
 *
 * @internal
 */
export const createDebouncedFlush = (flush: () => void): (() => void) => {
	let pending = false;
	return () => {
		if (pending) return;
		pending = true;
		Promise.resolve().then(() => {
			pending = false;
			flush();
		});
	};
};
