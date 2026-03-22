import type {
	CallHandler,
	ExecutionContext,
	NestInterceptor
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { performance } from 'perf_hooks';
import type { ExpressRequest, ExpressResponse } from '../../types';
import type { Logger } from 'winston';
import type { MiddlewareConfig } from '../../types';
import { setRequestMetadata } from '../common';
import { attachLogContext } from '../../async_hooks';
import { applyNestLogger, getRequest } from '../common/nest';

/**
 * NestJS interceptor that establishes async context for Express requests.
 *
 * @internal
 */
export class ExpressLoggerInterceptor implements NestInterceptor {
	private middlewareConfig: MiddlewareConfig<ExpressRequest>;
	private logger: Logger;
	private startTimes: WeakMap<ExpressRequest, number> = new WeakMap();

	constructor(
		logger: Logger,
		middlewareConfig: MiddlewareConfig<ExpressRequest>
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
		const req = getRequest<ExpressRequest>(context);

		if (!req || this.middlewareConfig.excludePaths.includes(req.url)) {
			return next.handle();
		}

		return new Observable((subscriber) => {
			attachLogContext(() => {
				setRequestMetadata(req, this.middlewareConfig);

				if (this.middlewareConfig.enableRequestLogging) {
					const startTime = performance.now();
					this.startTimes.set(req, startTime);

					this.logger.info(
						this.middlewareConfig.customReceivedMessage
					);

					if (context.getType() === 'http') {
						const res = context
							.switchToHttp()
							.getResponse<ExpressResponse>();

						res.once('finish', () => {
							const startTime = this.startTimes.get(req);
							const duration = startTime
								? performance.now() - startTime
								: undefined;

							this.logger.info(
								this.middlewareConfig.customFinishedMessage,
								{
									response: {
										statusCode: res.statusCode,
										...(duration !== undefined && {
											duration
										})
									}
								}
							);
						});
					}
				}

				const observable = next.handle();
				observable.subscribe({
					next: (value: unknown) => subscriber.next(value),
					error: (err: unknown) => subscriber.error(err),
					complete: () => subscriber.complete()
				});
			});
		});
	}
}

/**
 * Integrates logger with a NestJS application using Express adapter.
 * Sets up request metadata tracking via interceptors for all execution phases.
 *
 * @param app - NestJS Express application instance
 * @param logger - Winston logger instance
 * @param partialConfig - Optional configuration for middleware and client logs route
 *
 * @example
 * ```ts
 * import { NestFactory } from '@nestjs/core';
 * import { applyExpressNestLogger, createLogger, Logger } from '@yagelhayun/logger/server';
 * import { AppModule } from './app.module';
 * import { NestExpressApplication } from '@nestjs/platform-express';
 *
 * async function bootstrap() {
 * 	const logger: Logger = createLogger();
 * 	const app: NestExpressApplication = await NestFactory.create(AppModule);
 *
 * 	applyExpressNestLogger(app, logger, {
 * 		middleware: {
 * 			customProps: (req) => ({
 * 				operationName: req.body?.operationName
 * 			})
 * 		}
 * 	});
 *
 * 	await app.listen(3000);
 * }
 * bootstrap();
 * ```
 */
export const applyExpressNestLogger = applyNestLogger(ExpressLoggerInterceptor);
