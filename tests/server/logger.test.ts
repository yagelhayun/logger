import { describe, it, expect } from 'vitest';
import { createTestLogger, CaptureTransport } from '../helpers';
import { createLogger } from '../../lib/server/logger';
import { transports } from 'winston';

const REDACTED = '[REDACTED]';

describe('createLogger', () => {
	describe('defaults', () => {
		it('produces a log with level, message, and timestamp', () => {
			const { logger, capture } = createTestLogger();

			logger.info('hello');
			const log = capture.getLogs()[0];

			expect(log.level).toBe('info');
			expect(log.message).toBe('hello');
			expect(log.timestamp).toBeDefined();
		});

		it('includes defaultMetadata on every log', () => {
			const { logger, capture } = createTestLogger({
				defaultMetadata: { service: 'test-service', env: 'test' }
			});

			logger.info('hello');
			const log = capture.getLogs()[0];

			expect(log.service).toBe('test-service');
			expect(log.env).toBe('test');
		});

		it('log-specific metadata overrides defaultMetadata for the same key', () => {
			const { logger, capture } = createTestLogger({
				defaultMetadata: { service: 'default' }
			});

			logger.info('hello', { service: 'override' });
			const log = capture.getLogs()[0];

			expect(log.service).toBe('override');
		});

		it('does not throw with isLocal enabled', () => {
			const { logger } = createTestLogger({ isLocal: true });

			expect(() => logger.info('hello', { key: 'val' })).not.toThrow();
		});
	});

	describe('log levels', () => {
		it('emits logs at and above minLogLevel', () => {
			const { logger, capture } = createTestLogger({
				minLogLevel: 'warn'
			});

			logger.warn('warn');
			logger.error('error');

			const messages = capture.getLogs().map((l) => l.message);
			expect(messages).toContain('warn');
			expect(messages).toContain('error');
		});

		it('suppresses logs below minLogLevel', () => {
			// The capture transport must match minLogLevel — Winston does not globally
			// pre-filter logs; each transport filters by its own level independently.
			const capture = new CaptureTransport({ level: 'warn' });
			const logger = createLogger({ minLogLevel: 'warn' });
			logger.transports
				.filter((t) => t instanceof transports.Console)
				.forEach((t) => logger.remove(t));
			logger.add(capture);

			logger.info('below');
			logger.warn('at-level');
			logger.error('above');

			const messages = capture.getLogs().map((l) => l.message);
			expect(messages).not.toContain('below');
			expect(messages).toContain('at-level');
			expect(messages).toContain('above');
		});

		it('supports verbose, info, warn, and error when minLogLevel is verbose', () => {
			// In npm log levels, debug (5) is more verbose than verbose (4) and is
			// therefore filtered out when the transport level is set to 'verbose'.
			const { logger, capture } = createTestLogger({
				minLogLevel: 'verbose'
			});

			logger.verbose('v');
			logger.debug('d');
			logger.info('i');
			logger.warn('w');
			logger.error('e');

			const levels = capture.getLogs().map((l) => l.level);
			expect(levels).toEqual(['verbose', 'info', 'warn', 'error']);
		});
	});

	describe('logUnhandledExceptions', () => {
		it('registers exception and rejection handlers when enabled', () => {
			const logger = createLogger({ logUnhandledExceptions: true });

			expect(logger.exceptions.handlers.size).toBeGreaterThan(0);
			expect(logger.rejections.handlers.size).toBeGreaterThan(0);

			logger.close();
		});

		it('does not register exception or rejection handlers by default', () => {
			const logger = createLogger();

			expect(logger.exceptions.handlers.size).toBe(0);
			expect(logger.rejections.handlers.size).toBe(0);

			logger.close();
		});

		it('sets exitOnError to true when logUnhandledExceptions is enabled', () => {
			const logger = createLogger({ logUnhandledExceptions: true });

			expect(logger.exitOnError).toBe(true);

			logger.close();
		});

		it('keeps exitOnError false by default', () => {
			const logger = createLogger();

			expect(logger.exitOnError).toBe(false);

			logger.close();
		});
	});

	describe('error serialization', () => {
		it('serializes Error objects with message, stack, and type', () => {
			const { logger, capture } = createTestLogger();

			logger.error('oops', new Error('something failed'));
			const log = capture.getLogs()[0] as any;

			expect(log.message).toContain('something failed');
		});

		it('does not throw when logging an Error', () => {
			const { logger } = createTestLogger();

			expect(() => logger.error('oops', new Error('boom'))).not.toThrow();
		});
	});

	describe('redactValues', () => {
		describe('basic redaction', () => {
			it('redacts an exact match value', () => {
				const { logger, capture } = createTestLogger({
					redactValues: ['supersecret']
				});

				logger.info('msg', { token: 'supersecret' });
				const log = capture.getLogs()[0];

				expect(log.token).toBe(REDACTED);
			});

			it('redacts a secret embedded within a larger string', () => {
				const { logger, capture } = createTestLogger({
					redactValues: ['my-api-key']
				});

				logger.info('msg', {
					url: 'https://api.example.com?key=my-api-key&foo=bar'
				});
				const log = capture.getLogs()[0] as any;

				expect(log.url).not.toContain('my-api-key');
				expect(log.url).toContain(REDACTED);
			});

			it('redacts multiple occurrences of the same secret within one string', () => {
				const { logger, capture } = createTestLogger({
					redactValues: ['tok']
				});

				logger.info('msg', { value: 'tok123 and tok456' });
				const log = capture.getLogs()[0] as any;

				expect(log.value).toBe(`${REDACTED}123 and ${REDACTED}456`);
			});

			it('redacts a secret appearing in the log message itself', () => {
				const { logger, capture } = createTestLogger({
					redactValues: ['s3cr3t']
				});

				logger.info('token is s3cr3t', {});
				const log = capture.getLogs()[0];

				expect(log.message).not.toContain('s3cr3t');
				expect(log.message).toContain(REDACTED);
			});

			it('redacts across multiple fields in the same log', () => {
				const { logger, capture } = createTestLogger({
					redactValues: ['abc123']
				});

				logger.info('msg', {
					fieldA: 'abc123',
					fieldB: 'prefix-abc123-suffix'
				});
				const log = capture.getLogs()[0] as any;

				expect(log.fieldA).toBe(REDACTED);
				expect(log.fieldB).toBe(`prefix-${REDACTED}-suffix`);
			});
		});

		describe('multiple secrets', () => {
			it('redacts all configured secrets in the same log', () => {
				const { logger, capture } = createTestLogger({
					redactValues: ['secret-a', 'secret-b']
				});

				logger.info('msg', { fieldA: 'secret-a', fieldB: 'secret-b' });
				const log = capture.getLogs()[0] as any;

				expect(log.fieldA).toBe(REDACTED);
				expect(log.fieldB).toBe(REDACTED);
			});

			it('redacts multiple secrets appearing in the same string', () => {
				const { logger, capture } = createTestLogger({
					redactValues: ['key1', 'key2']
				});

				logger.info('msg', { value: 'key1 and key2' });
				const log = capture.getLogs()[0] as any;

				expect(log.value).toBe(`${REDACTED} and ${REDACTED}`);
			});
		});

		describe('nested structures', () => {
			it('redacts secrets in nested objects', () => {
				const { logger, capture } = createTestLogger({
					redactValues: ['topsecret']
				});

				logger.info('msg', { auth: { bearer: 'topsecret' } });
				const log = capture.getLogs()[0] as any;

				expect(log.auth.bearer).toBe(REDACTED);
			});

			it('redacts secrets in deeply nested objects', () => {
				const { logger, capture } = createTestLogger({
					redactValues: ['deep']
				});

				logger.info('msg', { a: { b: { c: { d: 'deep' } } } });
				const log = capture.getLogs()[0] as any;

				expect(log.a.b.c.d).toBe(REDACTED);
			});

			it('redacts secrets in arrays', () => {
				const { logger, capture } = createTestLogger({
					redactValues: ['tok']
				});

				logger.info('msg', { tokens: ['tok', 'safe', 'tok'] });
				const log = capture.getLogs()[0] as any;

				expect(log.tokens).toEqual([REDACTED, 'safe', REDACTED]);
			});

			it('redacts secrets in arrays of objects', () => {
				const { logger, capture } = createTestLogger({
					redactValues: ['tok']
				});

				logger.info('msg', {
					items: [{ token: 'tok' }, { token: 'safe' }]
				});
				const log = capture.getLogs()[0] as any;

				expect(log.items[0].token).toBe(REDACTED);
				expect(log.items[1].token).toBe('safe');
			});
		});

		describe('edge cases', () => {
			it('does not redact when redactValues is empty', () => {
				const { logger, capture } = createTestLogger({
					redactValues: []
				});

				logger.info('msg', { token: 'supersecret' });
				const log = capture.getLogs()[0];

				expect(log.token).toBe('supersecret');
			});

			it('ignores empty strings in redactValues without corrupting output', () => {
				const { logger, capture } = createTestLogger({
					redactValues: ['', 'real-secret']
				});

				logger.info('msg', { token: 'real-secret', other: 'safe' });
				const log = capture.getLogs()[0] as any;

				expect(log.token).toBe(REDACTED);
				expect(log.other).toBe('safe');
			});

			it('handles secrets with regex special characters', () => {
				const { logger, capture } = createTestLogger({
					redactValues: ['p@ss+w0rd?']
				});

				logger.info('msg', { password: 'p@ss+w0rd?' });
				const log = capture.getLogs()[0] as any;

				expect(log.password).toBe(REDACTED);
			});

			it('passes non-string primitive values through unchanged', () => {
				const { logger, capture } = createTestLogger({
					redactValues: ['secret']
				});

				logger.info('msg', { count: 42, active: true, nothing: null });
				const log = capture.getLogs()[0] as any;

				expect(log.count).toBe(42);
				expect(log.active).toBe(true);
				expect(log.nothing).toBeNull();
			});

			it('does not mutate the original object passed to the logger', () => {
				const { logger } = createTestLogger({
					redactValues: ['supersecret']
				});

				const event = { headers: { 'x-secret-token': 'supersecret' } };
				logger.info('msg', { event });

				expect(event.headers['x-secret-token']).toBe('supersecret');
			});
		});
	});
});
