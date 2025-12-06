import {
	FastifyInstance,
	FastifyRequest,
	FastifyReply,
	HookHandlerDoneFunction as FastifyNextFunction
} from 'fastify';
import {
	defaultConfig,
	printExternalLogs,
	requestLogContextMiddleware
} from './common';
import { Logger } from '..';
import { WebFrameworkConfig, MiddlewareConfig, RouteConfig } from '../types';
import { DeepPartial } from '../../common/types';

const requestLoggingMiddleware = (
	app: FastifyInstance,
	logger: Logger,
	config: MiddlewareConfig<FastifyRequest>
): void => {
	app.addHook(
		'onRequest',
		(
			_req: FastifyRequest,
			_res: FastifyReply,
			next: FastifyNextFunction
		) => {
			logger.info(config.customReceivedMessage);
			next();
		}
	).addHook(
		'onResponse',
		(
			_req: FastifyRequest,
			res: FastifyReply,
			next: FastifyNextFunction
		) => {
			logger.info(config.customFinishedMessage, {
				response: {
					statusCode: res.statusCode,
					duration: res.elapsedTime
				}
			});
			next();
		}
	);
};

export const applyFastifyLogger = (
	app: FastifyInstance,
	logger: Logger,
	partialConfig?: DeepPartial<WebFrameworkConfig<FastifyRequest>>
) => {
	const middlewareConfig: MiddlewareConfig<FastifyRequest> = {
		...defaultConfig.middleware,
		...partialConfig?.middleware
	};

	const routeConfig: RouteConfig = {
		...defaultConfig.route,
		...partialConfig?.route
	};

	app.addHook('onRequest', requestLogContextMiddleware(middlewareConfig));

	if (middlewareConfig.enableRequestLogging) {
		requestLoggingMiddleware(app, logger, middlewareConfig);
	}

	if (partialConfig?.route) {
		app.post(routeConfig.endpoint, printExternalLogs(logger, routeConfig));
	}
};
