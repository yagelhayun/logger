import {
	type Logger,
	format,
	transports,
	createLogger as createWinstonLogger
} from 'winston';
import type { LoggerConfig } from '../types';
import { errorReplacer } from './errors';
import { getLogMetadata } from './metadata';
import { createRedactValuesFormatter } from './redact';

const defaultLoggerConfig: LoggerConfig = {
	isLocal: false,
	minLogLevel: 'info',
	defaultMetadata: {},
	redactValues: [],
	logUnhandledExceptions: false
};

const metadataFormatter = format((info) => {
	return Object.assign(info, getLogMetadata());
});

/**
 * Creates a winston logger instance with context metadata support.
 *
 * @param partialConfig - Optional logger configuration
 * @returns Configured winston logger instance
 */
export const createLogger = (partialConfig?: Partial<LoggerConfig>): Logger => {
	const config: LoggerConfig = {
		...defaultLoggerConfig,
		...partialConfig
	};

	const formatters = [
		metadataFormatter(),
		...(config.redactValues.length > 0 ? [createRedactValuesFormatter(config.redactValues)()] : []),
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
		exitOnError: config.logUnhandledExceptions,
		...(config.logUnhandledExceptions && {
			exceptionHandlers: [new transports.Console()],
			rejectionHandlers: [new transports.Console()]
		})
	});
};
