import type {
	FastifyInstance,
	FastifyRequest,
	FastifyReply,
	HookHandlerDoneFunction as FastifyNextFunction
} from 'fastify';
import type { Logger } from 'winston';
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
 * Fastify hooks that log request start and finish with duration.
 *
 * @internal
 */
const requestLifecycleLoggingMiddleware = (
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

	app.addHook('onRequest', logContextMiddleware(middlewareConfig));

	if (middlewareConfig.enableRequestLogging) {
		requestLifecycleLoggingMiddleware(app, logger, middlewareConfig);
	}

	if (partialConfig?.route) {
		const routeConfig: RouteConfig = {
			...defaultRouteConfig,
			...partialConfig?.route
		};

		app.post(routeConfig.endpoint, printClientLogs(logger, routeConfig));
	}
};
