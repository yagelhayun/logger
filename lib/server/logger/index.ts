import {
	type Logger,
	format,
	transports,
	createLogger as createWinstonLogger
} from 'winston';
import type { LoggerConfig } from '../types';
import { errorReplacer } from './errors';
import { getLogMetadata } from './metadata';

const defaultLoggerConfig: LoggerConfig = {
	isLocal: false,
	minLogLevel: 'info',
	defaultMetadata: {}
};

const metadataFormatter = format((info) => {
	return Object.assign(info, getLogMetadata());
});

/**
 * Creates and returns a logger instance.
 *
 * @param config
 */
export const createLogger = (partialConfig?: Partial<LoggerConfig>): Logger => {
	const config: LoggerConfig = {
		...defaultLoggerConfig,
		...partialConfig
	};

	const formatters = [
		metadataFormatter(),
		format.timestamp(),
		format.json({ replacer: errorReplacer })
	];

	if (config.isLocal) {
		formatters.push(format.prettyPrint({ colorize: true, depth: 5 }));
	}

	return createWinstonLogger({
		transports: [new transports.Console()],
		defaultMeta: config.defaultMetadata,
		format: format.combine(...formatters),
		level: config.minLogLevel,
		exitOnError: false
	});
};
