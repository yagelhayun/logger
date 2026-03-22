import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { applyFastifyLogger } from '../lib/server/handlers/fastify';
import { createTestLogger } from './helpers';

describe('applyFastifyLogger', () => {
	let app: FastifyInstance;
	let logger: ReturnType<typeof createTestLogger>['logger'];
	let capture: ReturnType<typeof createTestLogger>['capture'];

	beforeEach(async () => {
		app = Fastify();
		const testLogger = createTestLogger();
		logger = testLogger.logger;
		capture = testLogger.capture;
	});

	afterEach(async () => {
		await app.close();
	});

	describe('request metadata', () => {
		it('sets requestId and request metadata on every log within a request', async () => {
			applyFastifyLogger(app, logger, { middleware: { enableRequestLogging: false } });

			app.get('/test', async (_request, reply) => {
				logger.info('in-handler');
				return reply.status(200).send('ok');
			});

			const res = await app.inject({ method: 'GET', url: '/test' });
			expect(res.statusCode).toBe(200);

			const log = capture.getLogs().find((l) => l.message === 'in-handler') as any;
			expect(log.requestId).toBeDefined();
			expect(log.request).toMatchObject({ method: 'GET', endpoint: '/test' });
		});

		it('uses a custom requestIdLogLabel', async () => {
			applyFastifyLogger(app, logger, {
				middleware: { enableRequestLogging: false, requestIdLogLabel: 'traceId' }
			});

			app.get('/test', async (_request, reply) => {
				logger.info('handler');
				return reply.send('ok');
			});

			await app.inject({ method: 'GET', url: '/test' });

			const log = capture.getLogs().find((l) => l.message === 'handler') as any;
			expect(log.traceId).toBeDefined();
			expect(log.requestId).toBeUndefined();
		});

		it('uses a custom requestId from getRequestId', async () => {
			applyFastifyLogger(app, logger, {
				middleware: {
					enableRequestLogging: false,
					getRequestId: (req) => req.headers['x-request-id'] as string
				}
			});

			app.get('/test', async (_request, reply) => {
				logger.info('handler');
				return reply.send('ok');
			});

			await app.inject({
				method: 'GET',
				url: '/test',
				headers: { 'x-request-id': 'my-trace-id' }
			});

			const log = capture.getLogs().find((l) => l.message === 'handler') as any;
			expect(log.requestId).toBe('my-trace-id');
		});

		it('includes customProps in all logs within the request', async () => {
			applyFastifyLogger(app, logger, {
				middleware: {
					enableRequestLogging: false,
					customProps: (req) => ({ tenantId: req.headers['x-tenant-id'] })
				}
			});

			app.get('/test', async (_request, reply) => {
				logger.info('handler');
				return reply.send('ok');
			});

			await app.inject({
				method: 'GET',
				url: '/test',
				headers: { 'x-tenant-id': 'tenant-abc' }
			});

			const log = capture.getLogs().find((l) => l.message === 'handler') as any;
			expect(log.tenantId).toBe('tenant-abc');
		});

		it('omits request metadata when enableRequestMetadata is false', async () => {
			applyFastifyLogger(app, logger, {
				middleware: { enableRequestLogging: false, enableRequestMetadata: false }
			});

			app.get('/test', async (_request, reply) => {
				logger.info('handler');
				return reply.send('ok');
			});

			await app.inject({ method: 'GET', url: '/test' });

			const log = capture.getLogs().find((l) => l.message === 'handler') as any;
			expect(log.request).toBeUndefined();
		});
	});

	describe('request lifecycle logging', () => {
		it('logs request start and finish with status code and duration', async () => {
			applyFastifyLogger(app, logger, { middleware: { enableRequestLogging: true } });

			app.get('/test', async (_request, reply) => reply.status(201).send('ok'));

			await app.inject({ method: 'GET', url: '/test' });

			const logs = capture.getLogs();
			const startLog = logs.find((l) => l.message === 'Request started');
			const finishLog = logs.find((l) => l.message === 'Request finished') as any;

			expect(startLog).toBeDefined();
			expect(finishLog).toBeDefined();
			expect(finishLog.response.statusCode).toBe(201);
			expect(typeof finishLog.response.duration).toBe('number');
		});

		it('uses custom received and finished messages', async () => {
			applyFastifyLogger(app, logger, {
				middleware: {
					enableRequestLogging: true,
					customReceivedMessage: 'Incoming!',
					customFinishedMessage: 'Done!'
				}
			});

			app.get('/test', async (_request, reply) => reply.send('ok'));

			await app.inject({ method: 'GET', url: '/test' });

			const messages = capture.getLogs().map((l) => l.message);
			expect(messages).toContain('Incoming!');
			expect(messages).toContain('Done!');
		});

		it('does not log lifecycle events when enableRequestLogging is false', async () => {
			applyFastifyLogger(app, logger, { middleware: { enableRequestLogging: false } });

			app.get('/test', async (_request, reply) => reply.send('ok'));

			await app.inject({ method: 'GET', url: '/test' });

			const messages = capture.getLogs().map((l) => l.message);
			expect(messages).not.toContain('Request started');
			expect(messages).not.toContain('Request finished');
		});

		it('excludes configured paths from lifecycle logging', async () => {
			applyFastifyLogger(app, logger, {
				middleware: { excludePaths: ['/health'], enableRequestLogging: true }
			});

			app.get('/health', async (_request, reply) => reply.send('ok'));
			app.get('/api', async (_request, reply) => reply.send('ok'));

			await app.inject({ method: 'GET', url: '/health' });
			await app.inject({ method: 'GET', url: '/api' });

			const startLogs = capture.getLogs().filter((l) => l.message === 'Request started');
			expect(startLogs.length).toBe(1);
		});
	});

	describe('client logs route', () => {
		it('accepts a valid client log payload and returns 200', async () => {
			applyFastifyLogger(app, logger, {
				route: { endpoint: '/custom/logs' },
				middleware: {}
			});

			const res = await app.inject({
				method: 'POST',
				url: '/custom/logs',
				payload: [
					{
						level: 'info',
						message: 'client log',
						timestamp: new Date().toISOString(),
						metadata: {}
					}
				],
				headers: { 'content-type': 'application/json' }
			});

			expect(res.statusCode).toBe(200);
			expect(res.payload).toBe('OK');
			expect(capture.getLogs().some((l) => l.message === 'client log')).toBe(true);
		});

		it('logs the validation error and still returns 200 for an invalid payload', async () => {
			applyFastifyLogger(app, logger, {
				route: { endpoint: '/logs' },
				middleware: {}
			});

			const res = await app.inject({
				method: 'POST',
				url: '/logs',
				payload: [{ invalid: 'payload' }],
				headers: { 'content-type': 'application/json' }
			});

			expect(res.statusCode).toBe(200);

			// printClientLogs catches the ZodError and logs it — this is intentional.
			const errorLog = capture.getLogs().find((l) => l.level === 'error') as any;
			expect(errorLog).toBeDefined();
			expect(errorLog.name).toBe('ZodError');
		});
	});
});
