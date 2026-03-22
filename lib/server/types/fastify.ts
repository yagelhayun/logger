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
 * Minimal structural type for Fastify applications.
 * Uses Fastify-specific methods (`addHook`) that Express apps don't have,
 * so TypeScript rejects Express apps at call sites without needing
 * `fastify` installed in the consumer project.
 */
export interface FastifyApp {
	addHook(event: string, handler: any): FastifyApp;
	post(path: string, handler: any): any;
}
