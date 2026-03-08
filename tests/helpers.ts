import Transport from 'winston-transport';
import type { Logger } from 'winston';
import { createLogger } from '../lib/server/logger';

/**
 * Transport that captures log info objects for assertions.
 */
class CaptureTransport extends Transport {
	logs: Record<string, unknown>[] = [];

	constructor(opts?: Transport.TransportStreamOptions) {
		super(opts);
	}

	log(info: Record<string, unknown>, callback: () => void) {
		this.logs.push({ ...info });
		callback();
	}

	getLogs() {
		return this.logs;
	}

	clear() {
		this.logs = [];
	}
}

/**
 * Creates a logger with a capture transport for testing.
 * Returns the logger and a transport instance to read captured logs.
 */
export function createTestLogger(
	config?: Parameters<typeof createLogger>[0]
): { logger: Logger; capture: CaptureTransport } {
	const capture = new CaptureTransport({ level: 'verbose' });
	const logger = createLogger(config);
	logger.add(capture);
	return { logger, capture };
}
