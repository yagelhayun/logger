import { AsyncLocalStorage } from 'async_hooks';

const context = new AsyncLocalStorage<Map<string, any>>();

/**
 * Adds a value to the context by key. If the key already exists, its value will be overwritten. No value will persist if the context has not yet been initialized.
 *
 * @internal
 * @param {string} key
 * @param {any} value
 */
export const set = (key: string, value: any): void => {
	context.getStore()?.set(key, value);
};

/**
 * @internal
 */
export const get = <T>(key: string): T | undefined =>
	context.getStore()?.get(key);

/**
 * Defines the start of a code block in which a unique context should run in
 *
 * @param {Function} callback
 */
export const attachLogContext = (callback: () => void): void => {
	context.run(new Map<string, any>(), callback);
};
