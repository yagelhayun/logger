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
