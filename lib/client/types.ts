import { z } from 'zod';
import { clientLogSchema } from '../common/consts';

/**
 * Configuration for the client logger.
 */
export type LoggerConfig = {
	/**
	 * Maximum number of logs to buffer before sending.
	 *
	 * @default 10
	 */
	bufferSize: number;
	/**
	 * Interval in seconds for automatically flushing buffered logs.
	 *
	 * @default 30
	 */
	bufferFlushInterval: number;
	/**
	 * Endpoint path for sending logs. Combined with server URL in `initialize()`.
	 *
	 * @default '/logger/write'
	 */
	logEndpoint: string;
	/**
	 * Function that returns user-specific data to append to all logs.
	 */
	getUserData?: () => any | undefined;
};

/**
 * @internal
 */
export type Log = z.infer<typeof clientLogSchema>;
