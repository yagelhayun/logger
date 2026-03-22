import { describe, it, expect } from 'vitest';
import { createTestLogger } from './helpers';

const REDACTED = '[REDACTED]';

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

describe('redactValues', () => {
		it('redacts a known secret value in logs', () => {
			const { logger, capture } = createTestLogger({ redactValues: ['supersecret'] });

			logger.info('msg', { token: 'supersecret' });
			const log = capture.getLogs()[0];

			expect(log.token).toBe(REDACTED);
		});

		it('redacts a secret embedded within a string', () => {
			const { logger, capture } = createTestLogger({ redactValues: ['my-api-key'] });

			logger.info('msg', { url: 'https://api.example.com?key=my-api-key&foo=bar' });
			const log = capture.getLogs()[0] as any;

			expect(log.url).not.toContain('my-api-key');
			expect(log.url).toContain(REDACTED);
		});

		it('redacts secrets in nested objects', () => {
			const { logger, capture } = createTestLogger({ redactValues: ['topsecret'] });

			logger.info('msg', { auth: { bearer: 'topsecret' } });
			const log = capture.getLogs()[0] as any;

			expect(log.auth.bearer).toBe(REDACTED);
		});

		it('does not redact when values is empty', () => {
			const { logger, capture } = createTestLogger({ redactValues: [] });

			logger.info('msg', { token: 'supersecret' });
			const log = capture.getLogs()[0];

			expect(log.token).toBe('supersecret');
		});
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
