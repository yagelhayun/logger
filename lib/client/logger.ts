import type { Log, LoggerConfig, Logger, PayloadBuilder } from './types';
import type { LogLevel } from '../common/types';
import { CLIENT_LOGS_ENDPOINT } from '../common/consts';

const AUTO_FLUSH_LEVELS: LogLevel[] = ['warn', 'error'];

const defaultConfig: LoggerConfig = {
	bufferSize: 10,
	bufferFlushInterval: 30,
	logEndpoint: CLIENT_LOGS_ENDPOINT
};

const createDebouncedFlush = (flush: () => void): (() => void) => {
	let pending = false;
	return () => {
		if (pending) return;
		pending = true;
		Promise.resolve().then(() => {
			pending = false;
			flush();
		});
	};
};

export const createLogger = (
	appUrl: string,
	config?: Partial<LoggerConfig>
): Logger => {
	const { bufferSize, bufferFlushInterval, logEndpoint } = {
		...defaultConfig,
		...config
	};

	const endpoint = appUrl + logEndpoint;
	const buffer: Log[] = [];
	const payloadBuilders: PayloadBuilder[] = [];

	const flush = (): void => {
		if (!buffer.length) return;
		const logs: Log[] = buffer.splice(0);

		fetch(endpoint, {
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			method: 'POST',
			body: JSON.stringify(logs)
		}).catch((error: Error) => {
			buffer.unshift(...logs);
			console.error(
				'An error has occurred while sending logs to the server',
				error
			);
		});
	};

	const debouncedFlush = createDebouncedFlush(flush);

	const push = (
		level: LogLevel,
		message: string,
		payload?: Record<string, any>
	): void => {
		const ambientPayload = payloadBuilders.reduce<Record<string, any>>(
			(acc, builder) => ({ ...acc, ...builder() }),
			{}
		);

		const metadata = { ...ambientPayload, ...payload };

		buffer.push({
			level,
			message,
			timestamp: new Date(),
			...(Object.keys(metadata).length && { metadata })
		});

		if (buffer.length > bufferSize) {
			flush();
		} else if (AUTO_FLUSH_LEVELS.includes(level)) {
			debouncedFlush();
		}
	};

	if (typeof window !== 'undefined') {
		const previousOnError = window.onerror;
		window.onerror = (message, source, lineno, colno, error) => {
			previousOnError?.(message, source, lineno, colno, error);
			if (error) {
				push('error', String(message), {
					error: JSON.stringify(error),
					source,
					lineno,
					colno
				});
			}
			return null;
		};

		window.addEventListener(
			'unhandledrejection',
			(event: PromiseRejectionEvent) => {
				push('error', event.reason?.message ?? 'Unhandled rejection', {
					error: JSON.stringify(event.reason)
				});
			}
		);

		window.addEventListener('beforeunload', () => {
			if (buffer.length) {
				navigator.sendBeacon(
					endpoint,
					new Blob([JSON.stringify(buffer.splice(0))], { type: 'application/json' })
				);
			}
		});

		setInterval(() => {
			if (buffer.length) flush();
		}, bufferFlushInterval * 1000);
	}

	return {
		verbose: (message: string, payload?: Record<string, any>) =>
			push('verbose', message, payload),
		debug: (message: string, payload?: Record<string, any>) =>
			push('debug', message, payload),
		info: (message: string, payload?: Record<string, any>) =>
			push('info', message, payload),
		warn: (message: string, payload?: Record<string, any>) =>
			push('warn', message, payload),
		error: (message: string, payload?: Record<string, any>) =>
			push('error', message, payload),
		log: (
			level: LogLevel,
			message: string,
			payload?: Record<string, any>
		) => push(level, message, payload),
		addPayloadBuilder: (builder: PayloadBuilder) => {
			payloadBuilders.push(builder);
		},
		flush
	};
};
