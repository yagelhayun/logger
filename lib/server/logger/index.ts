import {
	format,
	transports,
	Logger as WinstonLogger,
	createLogger as createWinstonLogger
} from 'winston';
import { LoggerConfig } from '../types';
import { errorReplacer } from './errors';
import { getLogMetadata } from './metadata';

/**
 * @internal
 */
export let loggerRef: WinstonLogger | undefined = undefined;

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
 * A reference to the first created logger is saved for furthur usage.
 *
 * @param config
 */
export const createLogger = (
	partialConfig?: Partial<LoggerConfig>
): WinstonLogger => {
	if (!loggerRef) {
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

		loggerRef = createWinstonLogger({
			transports: [new transports.Console()],
			defaultMeta: config.defaultMetadata,
			format: format.combine(...formatters),
			level: config.minLogLevel,
			exitOnError: false
		});
	}

	return loggerRef;
};
