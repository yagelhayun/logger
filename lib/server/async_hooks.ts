import { AsyncLocalStorage } from 'async_hooks';

const context = new AsyncLocalStorage<Map<string, any>>();

/**
 * Sets a value in the async context. Overwrites existing keys.
 *
 * @internal
 */
export const set = (key: string, value: any): void => {
	context.getStore()?.set(key, value);
};

/**
 * Gets a value from the async context.
 *
 * @internal
 */
export const get = <T>(key: string): T | undefined =>
	context.getStore()?.get(key);

/**
 * Runs callback within a new async context.
 *
 * @param callback - Function to execute within the context
 */
export const attachLogContext = (callback: () => void): void => {
	context.run(new Map<string, any>(), callback);
};
