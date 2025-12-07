import type {
	FastifyRequest,
	FastifyReply,
	HookHandlerDoneFunction as FastifyNextFunction
} from 'fastify';
import type {
	Request as ExpressRequest,
	Response as ExpressResponse,
	NextFunction as ExpressNextFunction
} from 'express';

/**
 * @internal
 */
export type Request = ExpressRequest | FastifyRequest;

/**
 * @internal
 */
export type Response = ExpressResponse | FastifyReply;

/**
 * @internal
 */
export type NextFunction = ExpressNextFunction | FastifyNextFunction;
