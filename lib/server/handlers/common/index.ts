import { randomBytes, randomUUID } from 'crypto';
import type { Logger } from 'winston';
import type {
	ClientLogs,
	MiddlewareConfig,
	LogMetadata,
	Request,
	Response,
	NextFunction,
	RouteConfig
} from '../../types';
import { clientLogsSchema } from '../../consts';
import { attachLogContext } from '../../async_hooks';
import { setLogMetadata } from '../../logger/metadata';
import { CLIENT_LOGS_ENDPOINT } from '../../../common/consts';

/**
 * @internal
 */
export const defaultMiddlewareConfig: MiddlewareConfig = {
	excludePaths: [],
	enableRequestMetadata: true,
	enableRequestLogging: true,
	customReceivedMessage: 'Request started',
	customFinishedMessage: 'Request finished',
	requestIdLogLabel: 'requestId'
};

/**
 * @internal
 */
export const defaultRouteConfig: RouteConfig = {
	endpoint: CLIENT_LOGS_ENDPOINT
};

const generateRequestId = (): string => {
	if (typeof randomUUID === 'function') {
		return randomUUID();
	}

	return randomBytes(16).toString('hex');
};

/**
 * Sets request metadata in the async context.
 *
 * @internal
 */
export const setRequestMetadata = (
	req: Request,
	middlewareConfig: MiddlewareConfig
) => {
	const customProps: LogMetadata = middlewareConfig.customProps?.(req) || {};
	const requestId: string =
		middlewareConfig.getRequestId?.(req) || generateRequestId();

	Object.entries(customProps).forEach(([key, value]: [string, any]) => {
		setLogMetadata(key, value);
	});

	setLogMetadata(middlewareConfig.requestIdLogLabel, requestId);

	if (middlewareConfig.enableRequestMetadata) {
		setLogMetadata('request', {
			method: req.method,
			endpoint: req.url
		});
	}
};

/**
 * Middleware that establishes async context and sets request metadata.
 *
 * @internal
 */
export const logContextMiddleware =
	(middlewareConfig: MiddlewareConfig) =>
	(req: Request, _res: Response, next: NextFunction) => {
		if (middlewareConfig.excludePaths.includes(req.url)) {
			return next();
		}

		attachLogContext(() => {
			setRequestMetadata(req, middlewareConfig);
			next();
		});
	};

/**
 * Route handler for receiving and processing client logs.
 *
 * @internal
 */
export const printClientLogs =
	(logger: Logger, config: RouteConfig) => (req: Request, res: Response) => {
		try {
			const origin = config.origin?.(req) || 'client';
			const logs: ClientLogs = clientLogsSchema.parse(req.body);

			logs.forEach(({ level, message, metadata, timestamp }) => {
				logger.log(level, message, {
					...metadata,
					origin,
					timestamp
				});
			});
		} catch (error) {
			logger.error(error);
		} finally {
			res.status(200).send('OK');
		}
	};
