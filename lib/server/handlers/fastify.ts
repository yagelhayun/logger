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
import { DeepPartial, WebFrameworkConfig, MiddlewareConfig } from '../types';
import { loggerRef } from '../logger';

const requestLoggingMiddleware = (
	app: FastifyInstance,
	config: MiddlewareConfig<FastifyRequest>
): void => {
	app.addHook(
		'onRequest',
		(
			_req: FastifyRequest,
			_res: FastifyReply,
			next: FastifyNextFunction
		) => {
			loggerRef?.info(config.customReceivedMessage);
			next();
		}
	).addHook(
		'onResponse',
		(
			_req: FastifyRequest,
			res: FastifyReply,
			next: FastifyNextFunction
		) => {
			loggerRef?.info(config.customFinishedMessage, {
				response: {
					statusCode: res.statusCode,
					duration: res.getResponseTime()
				}
			});
			next();
		}
	);
};

export const applyFastifyLogger = (
	app: FastifyInstance,
	partialConfig?: DeepPartial<WebFrameworkConfig<FastifyRequest>>
) => {
	const config: WebFrameworkConfig<FastifyRequest> = {
		middleware: {
			...defaultConfig.middleware,
			...partialConfig?.middleware
		},
		route: {
			...defaultConfig.route,
			...partialConfig?.route
		}
	};

	app.addHook('onRequest', requestLogContextMiddleware(config.middleware));

	if (config.middleware.enableRequestLogging) {
		requestLoggingMiddleware(app, config.middleware);
	}

	if (config.route.enabled) {
		app.post(config.route.endpoint, printExternalLogs(config.route));
	}
};
