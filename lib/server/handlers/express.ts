import {
	Application as ExpressApplication,
	Request as ExpressRequest,
	Response as ExpressResponse,
	NextFunction as ExpressNextFunction
} from 'express';
import { performance } from 'perf_hooks';
import {
	defaultConfig,
	printExternalLogs,
	requestLogContextMiddleware
} from './common';
import { Logger } from '..';
import { WebFrameworkConfig, MiddlewareConfig, RouteConfig } from '../types';
import { DeepPartial } from '../../common/types';

const requestLoggingMiddleware =
	(logger: Logger, middlewareConfig: MiddlewareConfig<ExpressRequest>) =>
	(_req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
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

		next();
	};

export const applyExpressLogger = (
	app: ExpressApplication,
	logger: Logger,
	partialConfig?: DeepPartial<WebFrameworkConfig<ExpressRequest>>
) => {
	const middlewareConfig: MiddlewareConfig<ExpressRequest> = {
		...defaultConfig.middleware,
		...partialConfig?.middleware
	};

	const routeConfig: RouteConfig = {
		...defaultConfig.route,
		...partialConfig?.route
	};

	app.use(requestLogContextMiddleware(middlewareConfig));

	if (middlewareConfig.enableRequestLogging) {
		app.use(requestLoggingMiddleware(logger, middlewareConfig));
	}

	if (partialConfig?.route) {
		app.post(routeConfig.endpoint, printExternalLogs(logger, routeConfig));
	}
};
