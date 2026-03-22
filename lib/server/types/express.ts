import type { BaseRequest } from './framework';

/**
 * Minimal Express request interface the logger accesses internally.
 * Structurally compatible with express.Request.
 * @internal
 */
export interface ExpressRequest extends BaseRequest {}

/**
 * Minimal Express response interface the logger accesses internally.
 * Structurally compatible with express.Response.
 * @internal
 */
export interface ExpressResponse {
	statusCode: number;
	once(event: 'finish', listener: () => void): void;
	status(code: number): { send(body: string): unknown };
}

/**
 * @internal
 */
export type ExpressNextFunction = () => void;

/**
 * Minimal structural type for Express applications.
 * Uses Express-specific methods (`use`) that Fastify apps don't have,
 * so TypeScript rejects Fastify apps at call sites without needing
 * `express` installed in the consumer project.
 */
export interface ExpressApp {
	use(...handlers: any[]): any;
	post(path: string, ...handlers: any[]): any;
}
