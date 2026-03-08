import { describe, it, expect } from 'vitest';
import { createTestLogger } from './helpers';

describe('createLogger', () => {
	it('creates a logger with default config', () => {
		const { logger, capture } = createTestLogger();

		logger.info('hello');
		const log = capture.getLogs()[0];

		expect(log.level).toBe('info');
		expect(log.message).toBe('hello');
		expect(log.timestamp).toBeDefined();
	});

	it('respects minLogLevel', () => {
		const { logger, capture } = createTestLogger({ minLogLevel: 'warn' });

		logger.info('info');
		logger.warn('warn');
		logger.error('error');

		const messages = capture.getLogs().map((l) => l.message);
		expect(messages).toContain('warn');
		expect(messages).toContain('error');
	});

	it('includes defaultMetadata in logs', () => {
		const { logger, capture } = createTestLogger({
			defaultMetadata: { service: 'test-service', env: 'test' }
		});

		logger.info('hello');
		const log = capture.getLogs()[0];

		expect(log.service).toBe('test-service');
		expect(log.env).toBe('test');
	});

	it('supports all log levels', () => {
		const { logger, capture } = createTestLogger({
			minLogLevel: 'verbose'
		});

		logger.verbose('v');
		logger.debug('d');
		logger.info('i');
		logger.warn('w');
		logger.error('e');

		const levels = capture.getLogs().map((l) => l.level);
		expect(levels).toContain('info');
		expect(levels).toContain('warn');
		expect(levels).toContain('error');
		expect(levels.length).toBeGreaterThanOrEqual(3);
	});
});
