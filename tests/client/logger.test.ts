// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from '../../lib/client/logger';

const APP_URL = 'https://api.example.com';
const ENDPOINT = `${APP_URL}/logger/write`;

const flushMicrotasks = () => Promise.resolve();

beforeEach(() => {
	vi.useFakeTimers();
	vi.spyOn(global, 'fetch').mockResolvedValue(
		new Response('OK', { status: 200 })
	);
	Object.defineProperty(navigator, 'sendBeacon', {
		value: vi.fn().mockReturnValue(true),
		writable: true,
		configurable: true
	});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
	window.onerror = null;
});

const getPostedLogs = (callIndex = 0) => {
	const body = (fetch as ReturnType<typeof vi.fn>).mock.calls[callIndex][1]
		.body;
	return JSON.parse(body);
};

describe('createLogger', () => {
	describe('buffering', () => {
		it('does not flush immediately on info/debug/verbose', () => {
			const logger = createLogger(APP_URL);

			logger.info('hello');
			logger.debug('world');
			logger.verbose('foo');

			expect(fetch).not.toHaveBeenCalled();
		});

		it('flushes when buffer reaches bufferSize', () => {
			const logger = createLogger(APP_URL, { bufferSize: 2 });

			logger.info('one');
			expect(fetch).not.toHaveBeenCalled();

			logger.info('two');
			expect(fetch).toHaveBeenCalledTimes(1);
		});

		it('sends all buffered logs in a single request', () => {
			const logger = createLogger(APP_URL, { bufferSize: 3 });

			logger.info('one');
			logger.info('two');
			logger.info('three');

			const logs = getPostedLogs();
			expect(logs).toHaveLength(3);
		});

		it('clears the buffer after flushing', () => {
			const logger = createLogger(APP_URL, { bufferSize: 3 });

			logger.info('one');
			logger.info('two');
			logger.info('three');

			logger.info('four');
			logger.info('five');
			logger.info('six');

			expect(fetch).toHaveBeenCalledTimes(2);
			expect(getPostedLogs(1)).toHaveLength(3);
		});
	});

	describe('interval flush', () => {
		it('flushes buffered logs after the interval elapses', async () => {
			const logger = createLogger(APP_URL, { bufferFlushInterval: 10 });

			logger.info('hello');
			expect(fetch).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(10_000);

			expect(fetch).toHaveBeenCalledTimes(1);
			expect(getPostedLogs()[0].message).toBe('hello');
		});

		it('does not flush on interval when buffer is empty', async () => {
			createLogger(APP_URL, { bufferFlushInterval: 10 });

			await vi.advanceTimersByTimeAsync(10_000);

			expect(fetch).not.toHaveBeenCalled();
		});
	});

	describe('auto-flush on warn/error', () => {
		it('flushes after a warn even if buffer is not full', async () => {
			const logger = createLogger(APP_URL, { bufferSize: 10 });

			logger.info('context');
			logger.warn('something went wrong');

			await flushMicrotasks();

			expect(fetch).toHaveBeenCalledTimes(1);
			const logs = getPostedLogs();
			expect(logs).toHaveLength(2);
		});

		it('flushes after an error even if buffer is not full', async () => {
			const logger = createLogger(APP_URL, { bufferSize: 10 });

			logger.error('boom');

			await flushMicrotasks();

			expect(fetch).toHaveBeenCalledTimes(1);
		});

		it('debounces multiple rapid errors into a single flush', async () => {
			const logger = createLogger(APP_URL, { bufferSize: 10 });

			logger.error('err 1');
			logger.error('err 2');
			logger.error('err 3');

			await flushMicrotasks();

			expect(fetch).toHaveBeenCalledTimes(1);
			expect(getPostedLogs()).toHaveLength(3);
		});
	});

	describe('log shape', () => {
		it('includes level, message, and timestamp on every log', () => {
			const logger = createLogger(APP_URL, { bufferSize: 1 });

			logger.info('test message');
			logger.info('trigger flush');

			const log = getPostedLogs()[0];
			expect(log.level).toBe('info');
			expect(log.message).toBe('test message');
			expect(log.timestamp).toBeDefined();
		});

		it('includes payload as metadata', () => {
			const logger = createLogger(APP_URL, { bufferSize: 1 });

			logger.info('msg', { userId: 42 });
			logger.info('trigger flush');

			const log = getPostedLogs()[0];
			expect(log.metadata.userId).toBe(42);
		});

		it('omits metadata when no payload is provided', () => {
			const logger = createLogger(APP_URL, { bufferSize: 1 });

			logger.info('msg');
			logger.info('trigger flush');

			const log = getPostedLogs()[0];
			expect(log.metadata).toBeUndefined();
		});

		it('supports all log levels', async () => {
			const logger = createLogger(APP_URL, { bufferSize: 10 });

			logger.verbose('v');
			logger.debug('d');
			logger.info('i');
			logger.warn('w');
			logger.error('e');
			logger.log('info', 'l');

			await flushMicrotasks();
			const levels = getPostedLogs().map((l: any) => l.level);
			expect(levels).toEqual([
				'verbose',
				'debug',
				'info',
				'warn',
				'error',
				'info'
			]);
		});
	});

	describe('manual flush', () => {
		it('sends buffered logs immediately when flush() is called', () => {
			const logger = createLogger(APP_URL);

			logger.info('hello');
			expect(fetch).not.toHaveBeenCalled();

			logger.flush();
			expect(fetch).toHaveBeenCalledTimes(1);
		});

		it('does nothing when buffer is empty', () => {
			const logger = createLogger(APP_URL);

			logger.flush();

			expect(fetch).not.toHaveBeenCalled();
		});
	});

	describe('network failure', () => {
		it('restores logs to the buffer when the request fails', async () => {
			vi.spyOn(global, 'fetch').mockRejectedValueOnce(
				new Error('Network error')
			);
			vi.spyOn(console, 'error').mockImplementation(() => {});

			const logger = createLogger(APP_URL, { bufferSize: 1 });

			logger.info('important log');

			await flushMicrotasks(); // let the rejected promise settle

			logger.flush();
			expect(fetch).toHaveBeenCalledTimes(2);
			const secondCallLogs = getPostedLogs(1);
			expect(
				secondCallLogs.some((l: any) => l.message === 'important log')
			).toBe(true);
		});
	});

	describe('addPayloadBuilder', () => {
		it('merges builder output into every log', () => {
			const logger = createLogger(APP_URL, { bufferSize: 1 });
			logger.addPayloadBuilder(() => ({ sessionId: 'abc123' }));

			logger.info('msg');
			logger.info('trigger flush');

			const log = getPostedLogs()[0];
			expect(log.metadata.sessionId).toBe('abc123');
		});

		it('merges multiple builders in registration order', () => {
			const logger = createLogger(APP_URL, { bufferSize: 1 });
			logger.addPayloadBuilder(() => ({ a: 1 }));
			logger.addPayloadBuilder(() => ({ b: 2 }));

			logger.info('msg');
			logger.info('trigger flush');

			const log = getPostedLogs()[0];
			expect(log.metadata.a).toBe(1);
			expect(log.metadata.b).toBe(2);
		});

		it('call-site payload takes precedence over builder output', () => {
			const logger = createLogger(APP_URL, { bufferSize: 1 });
			logger.addPayloadBuilder(() => ({ userId: 'from-builder' }));

			logger.info('msg', { userId: 'from-callsite' });
			logger.info('trigger flush');

			const log = getPostedLogs()[0];
			expect(log.metadata.userId).toBe('from-callsite');
		});

		it('later builder overwrites earlier builder for the same key', () => {
			const logger = createLogger(APP_URL, { bufferSize: 1 });
			logger.addPayloadBuilder(() => ({ env: 'first' }));
			logger.addPayloadBuilder(() => ({ env: 'second' }));

			logger.info('msg');
			logger.info('trigger flush');

			const log = getPostedLogs()[0];
			expect(log.metadata.env).toBe('second');
		});
	});

	describe('window.onerror capture', () => {
		it('pushes an error log when window.onerror fires', async () => {
			createLogger(APP_URL, { bufferSize: 10 });

			window.onerror!(
				'Something broke',
				'app.js',
				10,
				5,
				new Error('Something broke')
			);

			await flushMicrotasks();

			const allLogs = (
				fetch as ReturnType<typeof vi.fn>
			).mock.calls.flatMap((call: any) => JSON.parse(call[1].body));
			const log = allLogs.find(
				(l: any) => l.message === 'Something broke'
			);
			expect(log.level).toBe('error');
			expect(log.metadata.source).toBe('app.js');
		});

		it('does not push a log when error object is absent', async () => {
			createLogger(APP_URL, { bufferSize: 10 });

			window.onerror!(
				'Script error',
				undefined,
				undefined,
				undefined,
				undefined
			);

			await flushMicrotasks();

			expect(fetch).not.toHaveBeenCalled();
		});

		it('chains onto a previously registered window.onerror', () => {
			const previous = vi.fn();
			window.onerror = previous;

			createLogger(APP_URL, { bufferSize: 10 });

			window.onerror!('msg', 'file.js', 1, 1, new Error('msg'));

			expect(previous).toHaveBeenCalledTimes(1);
		});
	});

	describe('unhandledrejection capture', () => {
		it('pushes an error log on unhandled promise rejection', async () => {
			createLogger(APP_URL, { bufferSize: 10 });

			const event = new PromiseRejectionEvent('unhandledrejection', {
				promise: Promise.resolve(),
				reason: { message: 'Promise failed' }
			});
			window.dispatchEvent(event);

			await flushMicrotasks();

			const allLogs = (
				fetch as ReturnType<typeof vi.fn>
			).mock.calls.flatMap((call: any) => JSON.parse(call[1].body));
			const log = allLogs.find(
				(l: any) => l.message === 'Promise failed'
			);
			expect(log.level).toBe('error');
		});

		it('uses fallback message when reason has no message', async () => {
			createLogger(APP_URL, { bufferSize: 10 });

			const event = new PromiseRejectionEvent('unhandledrejection', {
				promise: Promise.resolve(),
				reason: null
			});
			window.dispatchEvent(event);

			await flushMicrotasks();

			const allLogs = (
				fetch as ReturnType<typeof vi.fn>
			).mock.calls.flatMap((call: any) => JSON.parse(call[1].body));
			const log = allLogs.find(
				(l: any) => l.message === 'Unhandled rejection'
			);
			expect(log).toBeDefined();
		});
	});

	describe('beforeunload flush', () => {
		it('sends buffered logs via sendBeacon on page unload', () => {
			const logger = createLogger(APP_URL);

			logger.info('buffered log');
			window.dispatchEvent(new Event('beforeunload'));

			expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
			const [url, blob] = (
				navigator.sendBeacon as ReturnType<typeof vi.fn>
			).mock.calls[0];
			expect(url).toBe(ENDPOINT);
			expect(blob).toBeInstanceOf(Blob);
			expect((blob as Blob).type).toBe('application/json');
		});

		it('does not call sendBeacon when buffer is empty', () => {
			createLogger(APP_URL);

			window.dispatchEvent(new Event('beforeunload'));

			expect(navigator.sendBeacon).not.toHaveBeenCalled();
		});

		it('clears the buffer after sendBeacon', () => {
			createLogger(APP_URL);

			const logger = createLogger(APP_URL);
			logger.info('log');
			window.dispatchEvent(new Event('beforeunload'));

			logger.flush();
			expect(fetch).not.toHaveBeenCalled();
		});
	});
});
