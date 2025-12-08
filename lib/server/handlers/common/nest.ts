import { Logger } from 'winston';
import type { FastifyRequest } from 'fastify';
import type { Request as ExpressRequest } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { ExecutionContext } from '@nestjs/common';
import { MiddlewareConfig, RouteConfig, WebFrameworkConfig } from '../../types';
import {
	defaultMiddlewareConfig,
	defaultRouteConfig,
	printClientLogs
} from '.';
import { ExpressLoggerInterceptor } from '../express/nest';
import { FastifyLoggerInterceptor } from '../fastify/nest';

/**
 * @internal
 */
export const getRequest = <TReq extends ExpressRequest | FastifyRequest>(
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
			const gqlContext = GqlExecutionContext.create(context);
			const ctx = gqlContext.getContext();
			// Apollo Server v3 stores the request in context.req
			return ctx?.req || ctx?.request || null;
		} catch {
			// If @nestjs/graphql is not available, try to extract from context directly
			const getArgs = (
				context as unknown as { getArgs?: () => unknown[] }
			).getArgs;
			const getContext = (
				context as unknown as {
					getContext?: () => {
						req?: TReq;
						request?: TReq;
					};
				}
			).getContext;
			const ctx =
				getContext?.() ||
				(getArgs?.()?.[2] as
					| { req?: TReq; request?: TReq }
					| undefined);
			return ctx?.req || ctx?.request || null;
		}
	}

	return null;
};

type AppForInterceptor<TInterceptor> =
	TInterceptor extends typeof ExpressLoggerInterceptor
		? NestExpressApplication
		: TInterceptor extends typeof FastifyLoggerInterceptor
		? NestFastifyApplication
		: never;

type RequestForInterceptor<TInterceptor> =
	TInterceptor extends typeof ExpressLoggerInterceptor
		? ExpressRequest
		: TInterceptor extends typeof FastifyLoggerInterceptor
		? FastifyRequest
		: never;

/**
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
