import type {
	CallHandler,
	ExecutionContext,
	NestInterceptor
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { FastifyRequest, FastifyReply } from '../../types';
import type { Logger } from 'winston';
import type { MiddlewareConfig } from '../../types';
import { setRequestMetadata } from '../common';
import { attachLogContext } from '../../async_hooks';
import { applyNestLogger, getRequest } from '../common/nest';

/**
 * NestJS interceptor that establishes async context for Fastify requests.
 *
 * @internal
 */
export class FastifyLoggerInterceptor implements NestInterceptor {
	private middlewareConfig: MiddlewareConfig<FastifyRequest>;
	private logger: Logger;

	constructor(
		logger: Logger,
		middlewareConfig: MiddlewareConfig<FastifyRequest>
	) {
		this.logger = logger;
		this.middlewareConfig = middlewareConfig;
	}

	intercept(
		context: ExecutionContext,
		next: CallHandler
	): Observable<unknown> {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { Observable } = require('rxjs') as typeof import('rxjs');
		const req = getRequest<FastifyRequest>(context);

		if (!req || this.middlewareConfig.excludePaths.includes(req.url)) {
			return next.handle();
		}

		return new Observable((subscriber) => {
			attachLogContext(() => {
				setRequestMetadata(req, this.middlewareConfig);

				if (this.middlewareConfig.enableRequestLogging) {
					this.logger.info(
						this.middlewareConfig.customReceivedMessage
					);
				}

				const observable = next.handle();
				observable.subscribe({
					next: (value: unknown) => subscriber.next(value),
					error: (err: unknown) => subscriber.error(err),
					complete: () => {
						if (
							this.middlewareConfig.enableRequestLogging &&
							context.getType() === 'http'
						) {
							const res = context
								.switchToHttp()
								.getResponse<FastifyReply>();
							this.logger.info(
								this.middlewareConfig.customFinishedMessage,
								{
									response: {
										statusCode: res.statusCode,
										duration: res.elapsedTime
									}
								}
							);
						}
						subscriber.complete();
					}
				});
			});
		});
	}
}

/**
 * Integrates logger with a NestJS application using Fastify adapter.
 * Sets up request metadata tracking via interceptors for all execution phases.
 *
 * @param app - NestJS Fastify application instance
 * @param logger - Winston logger instance
 * @param partialConfig - Optional configuration for middleware and client logs route
 *
 * @example
 * ```ts
 * import { NestFactory } from '@nestjs/core';
 * import { createLogger, applyFastifyNestLogger, Logger } from '@yagelhayun/logger/server';
 * import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
 * import { AppModule } from './app.module';
 *
 * async function bootstrap() {
 *   const logger: Logger = createLogger();
 *   const app: NestFastifyApplication = await NestFactory.create(AppModule, new FastifyAdapter());
 *
 *   applyFastifyNestLogger(app, logger, {
 *     middleware: {
 *       customProps: (req) => ({ userId: req.user?.id })
 *     }
 *   });
 *
 *   await app.listen(3000);
 * }
 * bootstrap();
 * ```
 */
export const applyFastifyNestLogger = applyNestLogger(FastifyLoggerInterceptor);
