import type {
	CallHandler,
	ExecutionContext,
	NestInterceptor
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Logger } from 'winston';
import type { MiddlewareConfig } from '../../types';
import { setRequestMetadata } from '../common';
import { attachLogContext } from '../../async_hooks';
import { applyNestLogger, getRequest } from '../common/nest';

/**
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

export const applyFastifyNestLogger = applyNestLogger(FastifyLoggerInterceptor);
