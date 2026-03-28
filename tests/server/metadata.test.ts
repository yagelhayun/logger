import { describe, it, expect } from 'vitest';
import { attachLogContext } from '../../lib/server/async_hooks';
import { setLogMetadata, getLogMetadata } from '../../lib/server/logger/metadata';
import { createTestLogger } from '../helpers';

describe('setLogMetadata', () => {
	it('merges metadata with existing values', () => {
		const { logger, capture } = createTestLogger({ isLocal: false });

		attachLogContext(() => {
			setLogMetadata('a', 1);
			setLogMetadata('b', 2);
			setLogMetadata('a', 3);
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
			setLogMetadata('nested', { b: 3, c: 4 });
			logger.info('nested');
		});

		const parsed = capture.getLogs()[0];
		expect(parsed.nested).toEqual({ a: 1, b: 3, c: 4 });
	});

	it('merges arrays by index (lodash.merge behavior)', () => {
		const { logger, capture } = createTestLogger();

		attachLogContext(() => {
			setLogMetadata('tags', ['a', 'b', 'c']);
			setLogMetadata('tags', ['x']); // only replaces index 0, keeps rest
			logger.info('test');
		});

		const log = capture.getLogs()[0] as any;
		// lodash.merge treats arrays like objects keyed by index
		expect(log.tags).toEqual(['x', 'b', 'c']);
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

	describe('getLogMetadata', () => {
		it('returns empty object when called outside any context', () => {
			const metadata = getLogMetadata();

			expect(metadata).toEqual({});
		});

		it('returns accumulated metadata within a context', () => {
			let metadata: Record<string, unknown> = {};

			attachLogContext(() => {
				setLogMetadata('key', 'value');
				setLogMetadata('other', 42);
				metadata = getLogMetadata();
			});

			expect(metadata).toMatchObject({ key: 'value', other: 42 });
		});
	});
});
