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
import { DeepPartial, WebFrameworkConfig, MiddlewareConfig } from '../types';
import { loggerRef } from '../logger';

const requestLoggingMiddleware =
	(middlewareConfig: MiddlewareConfig<ExpressRequest>) =>
	(_req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
		const startTime: number = performance.now();
		loggerRef?.info(middlewareConfig.customReceivedMessage);

		res.once('finish', () => {
			loggerRef?.info(middlewareConfig.customFinishedMessage, {
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
	partialConfig?: DeepPartial<WebFrameworkConfig<ExpressRequest>>
) => {
	const config: WebFrameworkConfig<ExpressRequest> = {
		middleware: {
			...defaultConfig.middleware,
			...partialConfig?.middleware
		},
		route: {
			...defaultConfig.route,
			...partialConfig?.route
		}
	};

	app.use(requestLogContextMiddleware(config.middleware));

	if (config.middleware.enableRequestLogging) {
		app.use(requestLoggingMiddleware(config.middleware));
	}

	if (config.route.enabled) {
		app.post(config.route.endpoint, printExternalLogs(config.route));
	}
};
