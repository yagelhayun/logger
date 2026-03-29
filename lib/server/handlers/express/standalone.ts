import type {
	ExpressRequest,
	ExpressResponse,
	ExpressNextFunction,
	ExpressApp
} from '../../types';
import type { Logger } from 'winston';
import { performance } from 'perf_hooks';
import {
	defaultRouteConfig,
	defaultMiddlewareConfig,
	printClientLogs,
	logContextMiddleware
} from '../common';
import type {
	WebFrameworkConfig,
	MiddlewareConfig,
	RouteConfig
} from '../../types';

/**
 * Middleware that logs request start and finish with duration.
 *
 * @internal
 */
const requestLifecycleLoggingMiddleware =
	(logger: Logger, middlewareConfig: MiddlewareConfig<ExpressRequest>) =>
	(req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
		if (!middlewareConfig.excludePaths.includes(req.url)) {
			const startTime: number = performance.now();
			logger.info(middlewareConfig.customReceivedMessage);

			res.once('finish', () => {
				logger.info(middlewareConfig.customFinishedMessage, {
					response: {
						statusCode: res.statusCode,
						duration: performance.now() - startTime
					}
				});
			});
		}

		next();
	};

/**
 * Integrates logger with an Express application.
 * Sets up request metadata tracking and optional lifecycle logging.
 *
 * @param app - Express application instance
 * @param logger - Winston logger instance
 * @param partialConfig - Optional configuration for middleware and client logs route
 *
 * @example
 * ```ts
 * import { Logger, createLogger, applyExpressLogger } from '@yagelhayun/logger/server';
 * import express, { Application } from 'express';
 *
 * const app: Application = express();
 * const logger: Logger = createLogger();
 *
 * applyExpressLogger(app, logger, {
 * 	middleware: {
 * 		customProps: (req) => ({
 * 			entityId: req.header('entity-id'),
 * 			operationName: req.body?.operationName
 * 		}),
 * 		getRequestId: (req) => req.header('request-id')
 * 	}
 * });
 * ```
 */
export const applyExpressLogger = (
	app: ExpressApp,
	logger: Logger,
	partialConfig?: WebFrameworkConfig<ExpressRequest>
) => {
	const routeConfig: RouteConfig = {
		...defaultRouteConfig,
		...partialConfig?.route
	};

	const middlewareConfig: MiddlewareConfig<ExpressRequest> = {
		...defaultMiddlewareConfig,
		...partialConfig?.middleware,
		excludePaths: [
			...defaultMiddlewareConfig.excludePaths,
			...(partialConfig?.middleware?.excludePaths ?? []),
			routeConfig.endpoint
		]
	};

	app.use(logContextMiddleware(middlewareConfig));

	if (middlewareConfig.enableRequestLogging) {
		app.use(requestLifecycleLoggingMiddleware(logger, middlewareConfig));
	}

	if (partialConfig?.route) {
		app.post(routeConfig.endpoint, printClientLogs(logger, routeConfig));
	}
};
