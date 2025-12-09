import merge from 'lodash.merge';
import type { LogMetadata } from '../types';
import { get, set } from '../async_hooks';

const LOG_METADATA_CONTEXT_KEY: string = 'context_scoped_log_metadata';

/**
 * Sets metadata in the log context. Merges with existing values.
 *
 * @param key - Metadata key
 * @param value - Metadata value (merged if key exists)
 */
export const setLogMetadata = (key: string, value: any): void => {
	const metadata: LogMetadata = merge(getLogMetadata(), { [key]: value });

	set(LOG_METADATA_CONTEXT_KEY, metadata);
};

/**
 * @internal
 */
export const getLogMetadata = (): LogMetadata =>
	get(LOG_METADATA_CONTEXT_KEY) || {};
