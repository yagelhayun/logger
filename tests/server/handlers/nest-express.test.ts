import { describe, it, expect } from 'vitest';
import { applyExpressNestLogger } from '../../../lib/server/handlers/express';
import { createTestLogger } from '../../helpers';

/**
 * Nest integration tests require emitDecoratorMetadata (Jest/ts-jest).
 * Vitest uses esbuild which doesn't support it.
 * Full Nest integration tests: run in F:\Codes\logger-tests projects.
 */
describe('applyExpressNestLogger', () => {
	it('registers interceptor on mock Nest app without throwing', () => {
		const { logger } = createTestLogger();
		const useGlobalInterceptors = (interceptor: unknown) => {
			expect(interceptor).toBeDefined();
			expect(typeof (interceptor as { intercept?: unknown }).intercept).toBe('function');
		};
		const getHttpAdapter = () => ({
			post: () => {}
		});

		const mockApp = {
			useGlobalInterceptors,
			getHttpAdapter
		} as Parameters<typeof applyExpressNestLogger>[0];

		expect(() =>
			applyExpressNestLogger(mockApp, logger, {
				middleware: { customProps: (req) => ({ url: req.url }) }
			})
		).not.toThrow();
	});
});
