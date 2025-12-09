import type { Request } from './framework';
import type { LogMetadata } from './internal';
import type { LogLevel } from '../../common/types';

export type MiddlewareConfig<TReq extends Request = any> = {
	/**
	 * URL paths excluded from logging and metadata attachment.
	 *
	 * @default []
	 */
	excludePaths: string[];
	/**
	 * Appends request metadata (method, endpoint) to all logs.
	 *
	 * @default true
	 */
	enableRequestMetadata: boolean;
	/**
	 * Logs request start and finish with duration. Includes response status code.
	 *
	 * @default true
	 */
	enableRequestLogging: boolean;
	/**
	 * Message printed when a request arrives. Silenced if `enableRequestLogging` is `false`.
	 *
	 * @default 'Request started'
	 */
	customReceivedMessage: string;
	/**
	 * Message printed when a request completes. Silenced if `enableRequestLogging` is `false`.
	 *
	 * @default 'Request finished'
	 */
	customFinishedMessage: string;
	/**
	 * Label for request ID in logs.
	 *
	 * @default 'requestId'
	 */
	requestIdLogLabel: string;
	/**
	 * Extracts custom properties from request to append to all logs.
	 *
	 * @param req - Request object
	 * @returns Metadata object or undefined
	 */
	customProps?: (req: TReq) => LogMetadata | undefined;
	/**
	 * Extracts or generates request ID. If undefined, a UUID is generated.
	 *
	 * @param req - Request object
	 * @returns Request ID string or undefined
	 */
	getRequestId?: (req: TReq) => string | undefined;
};

export type RouteConfig<TReq extends Request = any> = {
	/**
	 * Endpoint path for receiving client logs.
	 *
	 * @default '/logger/write'
	 */
	endpoint: string;
	/**
	 * Resolves `origin` metadata for client logs. Defaults to 'client'.
	 *
	 * @param req - Request object
	 * @returns Origin string or undefined
	 */
	origin?: (req: TReq) => string | undefined;
};

export type WebFrameworkConfig<TReq extends Request = any> = {
	/**
	 * Client logs endpoint configuration.
	 */
	route?: Partial<RouteConfig<TReq>>;
	/**
	 * Middleware configuration for request metadata and logging.
	 */
	middleware: Partial<MiddlewareConfig<TReq>>;
};

export type LoggerConfig = {
	/**
	 * Minimum log level. Logs below this level are ignored.
	 *
	 * @default 'info'
	 */
	minLogLevel: LogLevel;
	/**
	 * Default metadata appended to every log (e.g., serviceName, systemName).
	 */
	defaultMetadata: LogMetadata;
	/**
	 * Enables human-readable, colorized output. Use with caution in production.
	 *
	 * @default false
	 */
	isLocal: boolean;
};
