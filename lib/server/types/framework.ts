import {
	FastifyRequest,
	FastifyReply,
	HookHandlerDoneFunction as FastifyNextFunction
} from 'fastify';
import {
	Request as ExpressRequest,
	Response as ExpressResponse,
	NextFunction as ExpressNextFunction
} from 'express';

export type Request = ExpressRequest | FastifyRequest;
export type Response = ExpressResponse | FastifyReply;
export type NextFunction = ExpressNextFunction | FastifyNextFunction;
