import type {
	Application as ExpressApplication,
	Request as ExpressRequest,
	Response as ExpressResponse,
	NextFunction as ExpressNextFunction
} from 'express';
import { Logger } from 'winston';
import { performance } from 'perf_hooks';
import {
	defaultRouteConfig,
	defaultMiddlewareConfig,
	printClientLogs,
	requestLogContextMiddleware
} from '../common';
import { WebFrameworkConfig, MiddlewareConfig, RouteConfig } from '../../types';

const requestLoggingMiddleware =
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

export const applyExpressLogger = (
	app: ExpressApplication,
	logger: Logger,
	partialConfig?: WebFrameworkConfig<ExpressRequest>
) => {
	const middlewareConfig: MiddlewareConfig<ExpressRequest> = {
		...defaultMiddlewareConfig,
		...partialConfig?.middleware
	};

	app.use(requestLogContextMiddleware(middlewareConfig));

	if (middlewareConfig.enableRequestLogging) {
		app.use(requestLoggingMiddleware(logger, middlewareConfig));
	}

	if (partialConfig?.route) {
		const routeConfig: RouteConfig = {
			...defaultRouteConfig,
			...partialConfig?.route
		};

		app.post(routeConfig.endpoint, printClientLogs(logger, routeConfig));
	}
};
