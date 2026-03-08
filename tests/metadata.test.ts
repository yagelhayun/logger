import { describe, it, expect } from 'vitest';
import { attachLogContext } from '../lib/server/async_hooks';
import { setLogMetadata } from '../lib/server/logger/metadata';
import { createTestLogger } from './helpers';

describe('setLogMetadata', () => {
	it('merges metadata with existing values', () => {
		const { logger, capture } = createTestLogger({ isLocal: false });

		attachLogContext(() => {
			setLogMetadata('a', 1);
			setLogMetadata('b', 2);
			setLogMetadata('a', 3); // overwrite
			logger.info('merged');
		});

		const parsed = capture.getLogs()[0];
		expect(parsed.a).toBe(3);
		expect(parsed.b).toBe(2);
	});

	it('merges nested objects', () => {
		const { logger, capture } = createTestLogger({ isLocal: false });

		attachLogContext(() => {
			setLogMetadata('nested', { a: 1, b: 2 });
			setLogMetadata('nested', { b: 3, c: 4 }); // merge
			logger.info('nested');
		});

		const parsed = capture.getLogs()[0];
		expect(parsed.nested).toEqual({ a: 1, b: 3, c: 4 });
	});

	it('does not leak metadata outside context', () => {
		const { logger, capture } = createTestLogger({ isLocal: false });

		attachLogContext(() => {
			setLogMetadata('secret', 'inside');
			logger.info('inside');
		});

		logger.info('outside');

		expect(capture.getLogs().length).toBe(2);
		const inside = capture.getLogs()[0];
		const outside = capture.getLogs()[1];
		expect(inside.secret).toBe('inside');
		expect(outside.secret).toBeUndefined();
	});
});
