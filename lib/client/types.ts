import { z } from 'zod';
import { clientLogSchema } from '../common/consts';
import type { LogLevel } from '../common/types';

/**
 * A function that returns ambient metadata to be merged into every log's payload.
 * Multiple builders can be registered and their results are merged in registration order.
 * Call-site payload always takes precedence over builder output.
 */
export type PayloadBuilder = () => Record<string, any>;

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
	 * Endpoint path for sending logs. Combined with server URL in `createLogger()`.
	 *
	 * @default '/logger/write'
	 */
	logEndpoint: string;
};

export type Logger = {
	verbose(message: string, payload?: Record<string, any>): void;
	debug(message: string, payload?: Record<string, any>): void;
	info(message: string, payload?: Record<string, any>): void;
	warn(message: string, payload?: Record<string, any>): void;
	error(message: string, payload?: Record<string, any>): void;
	log(level: LogLevel, message: string, payload?: Record<string, any>): void;
	/**
	 * Registers a builder function that contributes ambient metadata to every log.
	 * Call-site payload takes precedence over builder output.
	 */
	addPayloadBuilder(builder: PayloadBuilder): void;
	/**
	 * Immediately flushes all buffered logs to the server.
	 */
	flush(): void;
};

/**
 * @internal
 */
export type Log = z.infer<typeof clientLogSchema>;
