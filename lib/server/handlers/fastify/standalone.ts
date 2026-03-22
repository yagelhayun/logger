import type {
	FastifyRequest,
	FastifyReply,
	FastifyNextFunction,
	FastifyApp
} from '../../types';
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
	app: FastifyApp,
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

/**
 * Integrates logger with a Fastify application.
 * Sets up request metadata tracking and optional lifecycle logging.
 *
 * @param app - Fastify instance
 * @param logger - Winston logger instance
 * @param partialConfig - Optional configuration for middleware and client logs route
 *
 * @example
 * ```ts
 * import fastify, { FastifyInstance } from 'fastify';
 * import { createLogger, applyFastifyLogger, Logger } from '@yagelhayun/logger/server';
 *
 * const app: FastifyInstance = fastify();
 * const logger: Logger = createLogger();
 *
 * applyFastifyLogger(app, logger, {
 *   middleware: {
 *     customProps: (req) => ({ userId: req.user?.id })
 *   }
 * });
 * ```
 */
export const applyFastifyLogger = (
	app: FastifyApp,
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
