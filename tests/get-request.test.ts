import { describe, it, expect } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import { getRequest } from '../lib/server/handlers/common/nest';

/**
 * Builds a minimal mock ExecutionContext.
 * @nestjs/graphql is not installed in this project, so graphql context always
 * falls through to the catch block — which is exactly what these tests cover.
 */
function makeContext(
	type: string,
	args: unknown[] = [],
	httpRequest?: unknown
): ExecutionContext {
	return {
		getType: () => type,
		getArgs: () => args,
		switchToHttp: () => ({
			getRequest: () => httpRequest
		})
	} as unknown as ExecutionContext;
}

describe('getRequest', () => {
	describe('http context', () => {
		it('returns the request from switchToHttp()', () => {
			const mockReq = { url: '/test' };
			const ctx = makeContext('http', [], mockReq);
			expect(getRequest(ctx)).toBe(mockReq);
		});
	});

	describe('graphql context (catch block — @nestjs/graphql not installed)', () => {
		it('returns req from context.getArgs()[2].req', () => {
			const mockReq = { url: '/graphql' };
			const ctx = makeContext('graphql', [null, {}, { req: mockReq }]);
			expect(getRequest(ctx)).toBe(mockReq);
		});

		it('falls back to .request when .req is absent', () => {
			const mockReq = { url: '/graphql' };
			const ctx = makeContext('graphql', [null, {}, { request: mockReq }]);
			expect(getRequest(ctx)).toBe(mockReq);
		});

		it('returns null when args[2] has neither req nor request', () => {
			const ctx = makeContext('graphql', [null, {}, {}]);
			expect(getRequest(ctx)).toBeNull();
		});

		it('returns null when args[2] is undefined (short args array)', () => {
			const ctx = makeContext('graphql', []);
			expect(getRequest(ctx)).toBeNull();
		});
	});

	describe('unknown context type', () => {
		it('returns null for non-http non-graphql context', () => {
			const ctx = makeContext('unhandled-type');
			expect(getRequest(ctx)).toBeNull();
		});
	});
});
