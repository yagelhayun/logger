import { describe, it, expect } from 'vitest';
import { attachLogContext } from '../lib/server/async_hooks';
import { setLogMetadata } from '../lib/server/logger/metadata';
import { createTestLogger } from './helpers';

describe('attachLogContext', () => {
	it('runs callback synchronously', () => {
		let executed = false;
		attachLogContext(() => {
			executed = true;
		});
		expect(executed).toBe(true);
	});

	it('isolates context between nested calls', () => {
		const outerValues: string[] = [];
		const innerValues: string[] = [];

		attachLogContext(() => {
			setLogMetadata('key', 'outer');
			outerValues.push('outer-set');

			attachLogContext(() => {
				setLogMetadata('key', 'inner');
				innerValues.push('inner-set');
			});

			outerValues.push('outer-after-inner');
		});

		expect(outerValues).toEqual(['outer-set', 'outer-after-inner']);
		expect(innerValues).toEqual(['inner-set']);
	});

	it('propagates metadata to logger within context', () => {
		const { logger, capture } = createTestLogger({ isLocal: false });

		attachLogContext(() => {
			setLogMetadata('requestId', 'test-123');
			setLogMetadata('custom', { foo: 'bar' });
			logger.info('test message');
		});

		expect(capture.getLogs().length).toBeGreaterThan(0);
		const parsed = capture.getLogs()[0];
		expect(parsed.requestId).toBe('test-123');
		expect(parsed.custom).toEqual({ foo: 'bar' });
		expect(parsed.message).toBe('test message');
	});
});
