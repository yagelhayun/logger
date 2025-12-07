import { Request } from './framework';
import { LogMetadata } from './internal';
import { LogLevel } from '../../common/types';

export type MiddlewareConfig<TReq extends Request = any> = {
	/**
	 * Paths to be excluded from logging and metadata attachment.
	 *
	 * @default []
	 */
	excludePaths: string[];
	/**
	 * Enables request metadata to be appended to every log. Includes HTTP method (GET/POST etc.) and endpoint.
	 *
	 * @default true
	 */
	enableRequestMetadata: boolean;
	/**
	 * Enables internal request logs. Includes a response message that specifies the requests duration.
	 *
	 * @default true
	 */
	enableRequestLogging: boolean;
	/**
	 * Override the default message printed when a request arrives to the server. Will be silenced if `enableInternalLogs` is off.
	 *
	 * @default 'Request started'
	 */
	customReceivedMessage: string;
	/**
	 * Override the default message printed when a request is finished. Will be silenced if `enableInternalLogs` is off.
	 *
	 * @default 'Request finished'
	 */
	customFinishedMessage: string;
	/**
	 * Override the default request id label in each log.
	 *
	 * @default 'requestId'
	 */
	requestIdLogLabel: string;
	/**
	 * Appends all properties to every log throughout the whole request lifecycle.
	 * Can be useful for things like `entityId`, `userDetails`, `operationName` and more.
	 *
	 * @param {TReq} req Should be used to extract any metadata from the request
	 * @returns {LogMetadata}
	 */
	customProps?: (req: TReq) => LogMetadata | undefined;
	/**
	 * Appends request id to every log throughout the whole request lifecycle.
	 *
	 * @default uuid
	 * @param {TReq} req Can be used in cases where you want to reuse a request id from a header or the body
	 * @returns {string}
	 */
	getRequestId?: (req: TReq) => string | undefined;
};

export type RouteConfig<TReq extends Request = any> = {
	/**
	 * The endpoint to be exposed for client logs.
	 *
	 * @default '/logger/write'
	 */
	endpoint: string;
	/**
	 * Function that resolves to an 'origin' metadata, to be appended to each client log.
	 *
	 * @default 'client'
	 */
	origin?: (req: TReq) => string | undefined;
};

export type WebFrameworkConfig<TReq extends Request = any> = {
	/**
	 * Route for printing logs sent from an external source (e.g. your client application).
	 *
	 * @default undefined
	 */
	route?: Partial<RouteConfig<TReq>>;
	/**
	 * Middleware that expands the capabilities of your logger
	 */
	middleware: Partial<MiddlewareConfig<TReq>>;
};

export type LoggerConfig = {
	/**
	 * Lowest level of printing logs.
	 * For example, when setting this to `warn`, any `debug`/`info` logs will be ignored and not printed.
	 *
	 * @default 'info'
	 */
	minLogLevel: LogLevel;
	/**
	 * Default metadata to be appended to every log.
	 * Common use cases are `systemName (Todolist)` or `serviceName (user-service)`.
	 */
	defaultMetadata: LogMetadata;
	/**
	 * If set to `true`, will print human readable logs.
	 * Be cautious setting this, as it can break your logs in production.
	 *
	 * @default false
	 */
	isLocal: boolean;
};
