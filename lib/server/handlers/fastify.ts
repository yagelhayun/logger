import type {
	FastifyInstance,
	FastifyRequest,
	FastifyReply,
	HookHandlerDoneFunction as FastifyNextFunction
} from 'fastify';
import {
	defaultRouteConfig,
	defaultMiddlewareConfig,
	printClientLogs,
	requestLogContextMiddleware
} from './common';
import { Logger } from '..';
import { WebFrameworkConfig, MiddlewareConfig, RouteConfig } from '../types';

const requestLoggingMiddleware = (
	app: FastifyInstance,
	logger: Logger,
	middlewareConfig: MiddlewareConfig<FastifyRequest>
): void => {
	app.addHook(
		'onRequest',
		(
			req: FastifyRequest,
			_res: FastifyReply,
			next: FastifyNextFunction
		) => {
			if (!middlewareConfig.excludePaths.includes(req.url)) {
				logger.info(middlewareConfig.customReceivedMessage);
			}

			next();
		}
	).addHook(
		'onResponse',
		(req: FastifyRequest, res: FastifyReply, next: FastifyNextFunction) => {
			if (!middlewareConfig.excludePaths.includes(req.url)) {
				logger.info(middlewareConfig.customFinishedMessage, {
					response: {
						statusCode: res.statusCode,
						duration: res.elapsedTime
					}
				});
			}

			next();
		}
	);
};

export const applyFastifyLogger = (
	app: FastifyInstance,
	logger: Logger,
	partialConfig?: WebFrameworkConfig<FastifyRequest>
) => {
	const middlewareConfig: MiddlewareConfig<FastifyRequest> = {
		...defaultMiddlewareConfig,
		...partialConfig?.middleware
	};

	app.addHook('onRequest', requestLogContextMiddleware(middlewareConfig));

	if (middlewareConfig.enableRequestLogging) {
		requestLoggingMiddleware(app, logger, middlewareConfig);
	}

	if (partialConfig?.route) {
		const routeConfig: RouteConfig = {
			...defaultRouteConfig,
			...partialConfig?.route
		};

		app.post(routeConfig.endpoint, printClientLogs(logger, routeConfig));
	}
};
