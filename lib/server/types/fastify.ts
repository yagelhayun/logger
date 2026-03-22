import type { BaseRequest } from './framework';

/**
 * Minimal Fastify request interface the logger accesses internally.
 * Structurally compatible with fastify.FastifyRequest.
 * @internal
 */
export interface FastifyRequest extends BaseRequest {}

/**
 * Minimal Fastify reply interface the logger accesses internally.
 * Structurally compatible with fastify.FastifyReply.
 * @internal
 */
export interface FastifyReply {
	statusCode: number;
	elapsedTime: number;
	status(code: number): { send(body: string): unknown };
}

/**
 * @internal
 */
export type FastifyNextFunction = (err?: Error) => void;

/**
 * Minimal Fastify instance interface the logger accesses internally.
 * Structurally compatible with fastify.FastifyInstance.
 * @internal
 */
export interface FastifyApp {
	addHook(event: string, handler: any): FastifyApp;
	post(path: string, handler: any): any;
}
