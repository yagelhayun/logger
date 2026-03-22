/**
 * Minimal request interface the logger accesses internally.
 * Structurally compatible with express.Request and fastify.FastifyRequest.
 * @internal
 */
export interface BaseRequest {
	url: string;
	method: string;
	body?: unknown;
}

/**
 * Minimal response interface for the client logs route.
 * Structurally compatible with express.Response and fastify.FastifyReply.
 * @internal
 */
export interface BaseResponse {
	status(code: number): { send(body: string): unknown };
}

/** @internal */
export type NextFunction = (err?: Error) => void;

/** @internal */
export type Request = BaseRequest;

/** @internal */
export type Response = BaseResponse;

/**
 * Minimal structural type for NestJS Express applications.
 * Uses Express-specific methods (`set`, `engine`) that Fastify apps don't have,
 * so TypeScript rejects Fastify apps at call sites without needing
 * `@nestjs/platform-express` installed in the consumer project.
 */
export interface NestExpressLike {
	set(...args: any[]): this;
	engine(...args: any[]): this;
	useGlobalInterceptors(...interceptors: any[]): this;
	getHttpAdapter(): any;
}

/**
 * Minimal structural type for NestJS Fastify applications.
 * Uses Fastify-specific methods (`register`, `inject`) that Express apps don't have,
 * so TypeScript rejects Express apps at call sites without needing
 * `@nestjs/platform-fastify` installed in the consumer project.
 */
export interface NestFastifyLike {
	register(...args: any[]): Promise<any>;
	inject(...args: any[]): any;
	useGlobalInterceptors(...interceptors: any[]): this;
	getHttpAdapter(): any;
}
