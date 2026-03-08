import { describe, it, expect, beforeEach } from 'vitest';
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

	it('registers hooks and request metadata is set in context', async () => {
		applyFastifyLogger(app, logger);

		app.get('/test', async (_request, reply) => {
			logger.info('in-handler');
			return reply.status(200).send('ok');
		});

		const res = await app.inject({ method: 'GET', url: '/test' });
		expect(res.statusCode).toBe(200);

		const logs = capture.getLogs();
		expect(logs.some((l) => l.message === 'in-handler')).toBe(true);
		const handlerLog = logs.find((l) => l.message === 'in-handler');
		expect(handlerLog?.request).toBeDefined();
		expect(handlerLog?.requestId).toBeDefined();
	});

	it('registers client logs route and accepts POST', async () => {
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

	it('excludes paths from logging when configured', async () => {
		applyFastifyLogger(app, logger, {
			middleware: { excludePaths: ['/health'], enableRequestLogging: true }
		});

		app.get('/health', async (_request, reply) => reply.send('ok'));
		app.get('/api', async (_request, reply) => {
			logger.info('api-handler');
			return reply.send('ok');
		});

		await app.inject({ method: 'GET', url: '/health' });
		await app.inject({ method: 'GET', url: '/api' });

		const receivedLogs = capture.getLogs().filter((l) => l.message === 'Request started');
		expect(receivedLogs.length).toBe(1);
	});
});
