import { v4 } from 'uuid';
import { Logger } from 'winston';
import {
	ClientLogs,
	WebFrameworkConfig,
	MiddlewareConfig,
	LogMetadata,
	Request,
	Response,
	NextFunction,
	RouteConfig
} from '../types';
import { loggerRef } from '../logger';
import { clientLogsSchema } from '../consts';
import { attachLogContext } from '../async_hooks';
import { setLogMetadata } from '../logger/metadata';

/**
 * @internal
 */
export const defaultConfig: WebFrameworkConfig = {
	middleware: {
		enableRequestMetadata: true,
		enableRequestLogging: true,
		customReceivedMessage: 'Request started',
		customFinishedMessage: 'Request finished',
		requestIdLogLabel: 'requestId'
	},
	route: {
		enabled: false,
		endpoint: '/logger/write'
	}
};

const setRequestMetadata = (
	req: Request,
	middlewareConfig: MiddlewareConfig
) => {
	const customProps: LogMetadata = middlewareConfig.customProps?.(req) || {};
	const requestId: string = middlewareConfig.generateRequestId?.(req) || v4();

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
 * @internal
 */
export const requestLogContextMiddleware =
	(middlewareConfig: MiddlewareConfig) =>
	(req: Request, _res: Response, next: NextFunction) => {
		attachLogContext(() => {
			setRequestMetadata(req, middlewareConfig);
			next();
		});
	};

/**
 * @internal
 */
export const printExternalLogs =
	(config: RouteConfig) => (req: Request, res: Response) => {
		try {
			const externalLogger: Logger | undefined = loggerRef?.child({
				origin: config.origin?.(req) || 'client'
			});
			const logs: ClientLogs = clientLogsSchema.parse(req.body);

			logs.forEach(({ level, message, info, timestamp }) => {
				externalLogger?.log(level, message, { ...info, timestamp });
			});
		} catch (error) {
			loggerRef?.error(error);
		} finally {
			res.status(200).send('OK');
		}
	};
