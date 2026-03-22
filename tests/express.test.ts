import { describe, it, expect, beforeEach } from 'vitest';
import express, { type Application } from 'express';
import request from 'supertest';
import { applyExpressLogger } from '../lib/server/handlers/express';
import { createTestLogger } from './helpers';

describe('applyExpressLogger', () => {
	let app: Application;
	let logger: ReturnType<typeof createTestLogger>['logger'];
	let capture: ReturnType<typeof createTestLogger>['capture'];

	beforeEach(() => {
		app = express();
		app.use(express.json());
		const testLogger = createTestLogger();
		logger = testLogger.logger;
		capture = testLogger.capture;
	});

	describe('request metadata', () => {
		it('sets requestId and request metadata on every log within a request', async () => {
			applyExpressLogger(app, logger, { middleware: { enableRequestLogging: false } });

			app.get('/test', (_req, res) => {
				logger.info('in-handler');
				res.status(200).send('ok');
			});

			await request(app).get('/test').expect(200);

			const log = capture.getLogs().find((l) => l.message === 'in-handler') as any;
			expect(log.requestId).toBeDefined();
			expect(log.request).toMatchObject({ method: 'GET', endpoint: '/test' });
		});

		it('uses a custom requestIdLogLabel', async () => {
			applyExpressLogger(app, logger, {
				middleware: { enableRequestLogging: false, requestIdLogLabel: 'traceId' }
			});

			app.get('/test', (_req, res) => {
				logger.info('handler');
				res.send('ok');
			});

			await request(app).get('/test').expect(200);

			const log = capture.getLogs().find((l) => l.message === 'handler') as any;
			expect(log.traceId).toBeDefined();
			expect(log.requestId).toBeUndefined();
		});

		it('uses a custom requestId from getRequestId', async () => {
			applyExpressLogger(app, logger, {
				middleware: {
					enableRequestLogging: false,
					getRequestId: (req) => req.headers['x-request-id'] as string
				}
			});

			app.get('/test', (_req, res) => {
				logger.info('handler');
				res.send('ok');
			});

			await request(app).get('/test').set('x-request-id', 'my-trace-id').expect(200);

			const log = capture.getLogs().find((l) => l.message === 'handler') as any;
			expect(log.requestId).toBe('my-trace-id');
		});

		it('includes customProps in all logs within the request', async () => {
			applyExpressLogger(app, logger, {
				middleware: {
					enableRequestLogging: false,
					customProps: (req) => ({ tenantId: req.headers['x-tenant-id'] })
				}
			});

			app.get('/test', (_req, res) => {
				logger.info('handler');
				res.send('ok');
			});

			await request(app).get('/test').set('x-tenant-id', 'tenant-abc').expect(200);

			const log = capture.getLogs().find((l) => l.message === 'handler') as any;
			expect(log.tenantId).toBe('tenant-abc');
		});

		it('omits request metadata when enableRequestMetadata is false', async () => {
			applyExpressLogger(app, logger, {
				middleware: { enableRequestLogging: false, enableRequestMetadata: false }
			});

			app.get('/test', (_req, res) => {
				logger.info('handler');
				res.send('ok');
			});

			await request(app).get('/test').expect(200);

			const log = capture.getLogs().find((l) => l.message === 'handler') as any;
			expect(log.request).toBeUndefined();
		});
	});

	describe('request lifecycle logging', () => {
		it('logs request start and finish with status code and duration', async () => {
			applyExpressLogger(app, logger, { middleware: { enableRequestLogging: true } });

			app.get('/test', (_req, res) => res.status(201).send('ok'));

			await request(app).get('/test').expect(201);

			const logs = capture.getLogs();
			const startLog = logs.find((l) => l.message === 'Request started');
			const finishLog = logs.find((l) => l.message === 'Request finished') as any;

			expect(startLog).toBeDefined();
			expect(finishLog).toBeDefined();
			expect(finishLog.response.statusCode).toBe(201);
			expect(typeof finishLog.response.duration).toBe('number');
		});

		it('uses custom received and finished messages', async () => {
			applyExpressLogger(app, logger, {
				middleware: {
					enableRequestLogging: true,
					customReceivedMessage: 'Incoming!',
					customFinishedMessage: 'Done!'
				}
			});

			app.get('/test', (_req, res) => res.send('ok'));

			await request(app).get('/test').expect(200);

			const messages = capture.getLogs().map((l) => l.message);
			expect(messages).toContain('Incoming!');
			expect(messages).toContain('Done!');
		});

		it('does not log lifecycle events when enableRequestLogging is false', async () => {
			applyExpressLogger(app, logger, { middleware: { enableRequestLogging: false } });

			app.get('/test', (_req, res) => res.send('ok'));

			await request(app).get('/test').expect(200);

			const messages = capture.getLogs().map((l) => l.message);
			expect(messages).not.toContain('Request started');
			expect(messages).not.toContain('Request finished');
		});

		it('excludes configured paths from lifecycle logging', async () => {
			applyExpressLogger(app, logger, {
				middleware: { excludePaths: ['/health'], enableRequestLogging: true }
			});

			app.get('/health', (_req, res) => res.send('ok'));
			app.get('/api', (_req, res) => res.send('ok'));

			await request(app).get('/health').expect(200);
			await request(app).get('/api').expect(200);

			const startLogs = capture.getLogs().filter((l) => l.message === 'Request started');
			expect(startLogs.length).toBe(1);
		});
	});

	describe('client logs route', () => {
		it('accepts a valid client log payload and returns 200', async () => {
			applyExpressLogger(app, logger, {
				route: { endpoint: '/custom/logs' },
				middleware: {}
			});

			const res = await request(app)
				.post('/custom/logs')
				.send([
					{
						level: 'info',
						message: 'client log',
						timestamp: new Date().toISOString(),
						metadata: {}
					}
				])
				.expect(200);

			expect(res.text).toBe('OK');
			expect(capture.getLogs().some((l) => l.message === 'client log')).toBe(true);
		});

		it('logs the validation error and still returns 200 for an invalid payload', async () => {
			applyExpressLogger(app, logger, {
				route: { endpoint: '/logs' },
				middleware: {}
			});

			await request(app).post('/logs').send([{ invalid: 'payload' }]).expect(200);

			// printClientLogs catches the ZodError and logs it — this is intentional.
			const errorLog = capture.getLogs().find((l) => l.level === 'error') as any;
			expect(errorLog).toBeDefined();
			expect(errorLog.name).toBe('ZodError');
		});
	});
});
