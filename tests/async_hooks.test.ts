import { describe, it, expect } from 'vitest';
import { attachLogContext } from '../lib/server/async_hooks';
import { setLogMetadata, getLogMetadata } from '../lib/server/logger/metadata';
import { createTestLogger } from './helpers';

describe('attachLogContext', () => {
	it('runs callback synchronously', () => {
		let executed = false;
		attachLogContext(() => {
			executed = true;
		});
		expect(executed).toBe(true);
	});

	it('propagates context across await boundaries', async () => {
		let value: unknown;

		await new Promise<void>((resolve) => {
			attachLogContext(async () => {
				setLogMetadata('asyncKey', 'asyncValue');
				await new Promise((r) => setTimeout(r, 0));
				value = getLogMetadata().asyncKey;
				resolve();
			});
		});

		expect(value).toBe('asyncValue');
	});

	it('isolates nested contexts — inner changes do not affect outer', () => {
		let outerMetadataAfterInner: Record<string, unknown> = {};

		attachLogContext(() => {
			setLogMetadata('shared', 'outer-value');

			attachLogContext(() => {
				setLogMetadata('shared', 'inner-value');
			});

			outerMetadataAfterInner = getLogMetadata();
		});

		expect(outerMetadataAfterInner.shared).toBe('outer-value');
	});

	it('outer context metadata is not visible inside nested context', () => {
		let innerMetadata: Record<string, unknown> = {};

		attachLogContext(() => {
			setLogMetadata('outerOnly', 'exists');

			attachLogContext(() => {
				innerMetadata = getLogMetadata();
			});
		});

		expect(innerMetadata.outerOnly).toBeUndefined();
	});

	it('propagates metadata to logger within context', () => {
		const { logger, capture } = createTestLogger({ isLocal: false });

		attachLogContext(() => {
			setLogMetadata('requestId', 'test-123');
			setLogMetadata('custom', { foo: 'bar' });
			logger.info('test message');
		});

		const parsed = capture.getLogs()[0];
		expect(parsed.requestId).toBe('test-123');
		expect(parsed.custom).toEqual({ foo: 'bar' });
		expect(parsed.message).toBe('test message');
	});

	it('metadata does not appear in logs outside of context', () => {
		const { logger, capture } = createTestLogger();

		attachLogContext(() => {
			setLogMetadata('requestId', 'abc');
		});

		logger.info('outside');
		const log = capture.getLogs()[0];

		expect(log.requestId).toBeUndefined();
	});
});
