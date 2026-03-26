import type { Logger } from 'winston';
import type { FastifyRequest } from 'fastify';
import type { Request as ExpressRequest } from 'express';
import type { ExecutionContext } from '@nestjs/common';
import type {
	MiddlewareConfig,
	RouteConfig,
	WebFrameworkConfig,
	Request,
	NestExpressLike,
	NestFastifyLike
} from '../../types';
import {
	defaultMiddlewareConfig,
	defaultRouteConfig,
	printClientLogs
} from '.';
import { ExpressLoggerInterceptor } from '../express/nest';
import { FastifyLoggerInterceptor } from '../fastify/nest';

/**
 * Extracts request object from NestJS execution context (HTTP or GraphQL).
 *
 * @internal
 */
export const getRequest = <TReq extends Request>(
	context: ExecutionContext
): TReq | null => {
	const contextType = context.getType<'http' | 'graphql'>();

	if (contextType === 'http') {
		return context.switchToHttp().getRequest<TReq>();
	}

	if (contextType === 'graphql') {
		try {
			// Dynamic import to avoid requiring @nestjs/graphql as a hard dependency
			const { GqlExecutionContext } = require('@nestjs/graphql');
			const ctx = GqlExecutionContext.create(context).getContext();
			return ctx?.req || ctx?.request || null;
		} catch {
			// GraphQL resolvers receive (root, args, context, info) — context is at index 2.
			const ctx = context.getArgs()[2] as
				| { req?: TReq; request?: TReq }
				| undefined;
			return ctx?.req || ctx?.request || null;
		}
	}

	return null;
};

type AppForInterceptor<TInterceptor> =
	TInterceptor extends typeof ExpressLoggerInterceptor
		? NestExpressLike
		: TInterceptor extends typeof FastifyLoggerInterceptor
			? NestFastifyLike
			: never;

type RequestForInterceptor<TInterceptor> =
	TInterceptor extends typeof ExpressLoggerInterceptor
		? ExpressRequest
		: TInterceptor extends typeof FastifyLoggerInterceptor
			? FastifyRequest
			: never;

/**
 * Factory function that creates NestJS logger integration.
 *
 * @internal
 */
export const applyNestLogger =
	<
		TInterceptor extends
			| typeof ExpressLoggerInterceptor
			| typeof FastifyLoggerInterceptor
	>(
		Interceptor: TInterceptor
	) =>
	<
		TApp extends AppForInterceptor<TInterceptor>,
		TReq extends RequestForInterceptor<TInterceptor>
	>(
		app: TApp,
		logger: Logger,
		partialConfig?: WebFrameworkConfig<TReq>
	) => {
		const middlewareConfig: MiddlewareConfig = {
			...defaultMiddlewareConfig,
			...partialConfig?.middleware
		};

		const interceptor = new Interceptor(logger, middlewareConfig);
		app.useGlobalInterceptors(interceptor);

		if (partialConfig?.route) {
			const routeConfig: RouteConfig = {
				...defaultRouteConfig,
				...partialConfig.route
			};

			const httpAdapter = app.getHttpAdapter();
			httpAdapter.post(
				routeConfig.endpoint,
				printClientLogs(logger, routeConfig)
			);
		}
	};
