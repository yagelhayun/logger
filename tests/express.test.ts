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

	it('registers middleware and request metadata is set in context', async () => {
		applyExpressLogger(app, logger);

		app.get('/test', (_req, res) => {
			logger.info('in-handler');
			res.status(200).send('ok');
		});

		await request(app).get('/test').expect(200);

		const logs = capture.getLogs();
		expect(logs.some((l) => l.message === 'in-handler')).toBe(true);
		const handlerLog = logs.find((l) => l.message === 'in-handler');
		expect(handlerLog?.request).toBeDefined();
		expect(handlerLog?.requestId).toBeDefined();
	});

	it('registers client logs route and accepts POST', async () => {
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

	it('excludes paths from logging when configured', async () => {
		applyExpressLogger(app, logger, {
			middleware: { excludePaths: ['/health'], enableRequestLogging: true }
		});

		app.get('/health', (_req, res) => res.send('ok'));
		app.get('/api', (_req, res) => {
			logger.info('api-handler');
			res.send('ok');
		});

		await request(app).get('/health').expect(200);
		await request(app).get('/api').expect(200);

		// /health should not trigger request logging; /api should
		const receivedLogs = capture.getLogs().filter((l) => l.message === 'Request started');
		expect(receivedLogs.length).toBe(1);
	});
});
