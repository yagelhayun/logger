import type { Log, LoggerConfig } from './types';
import type { LogLevel } from '../common/types';
import { CLIENT_LOGS_ENDPOINT } from '../common/consts';

const defaultConfig: LoggerConfig = {
	logEndpoint: CLIENT_LOGS_ENDPOINT,
	bufferFlushInterval: 30,
	bufferSize: 10
};

export class Logger {
	private static isInitialized: boolean = false;
	private static config: LoggerConfig;
	private static logsBuffer: Log[] = [];

	private static mapConfig = (
		serverUrl: string,
		clientConfig: LoggerConfig
	): LoggerConfig => ({
		...clientConfig,
		logEndpoint: serverUrl + clientConfig.logEndpoint
	});

	public static initialize(appUrl: string, config?: Partial<LoggerConfig>) {
		if (Logger.isInitialized) {
			console.warn(
				"If you're seeing this, you probably initialized your logger multiple times. You should call the 'initialize' method once👋"
			);
			return;
		}

		Logger.isInitialized = true;
		Logger.config = Logger.mapConfig(appUrl, {
			...defaultConfig,
			...config
		});

		window.onerror = (
			message: string | Event,
			source?: string,
			lineno?: number,
			colno?: number,
			error?: Error
		): OnErrorEventHandler => {
			if (error) {
				const errorJson: string = JSON.stringify(error);
				Logger.error(<string>message, {
					error: errorJson,
					source,
					lineno,
					colno
				});
			}

			return null;
		};

		setInterval(() => {
			if (Logger.logsBuffer.length) {
				Logger.sendToServer();
			}
		}, Logger.config.bufferFlushInterval * 1000);
	}

	public static verbose = (
		message: string,
		payload?: Record<string, any>
	): void => Logger.processLog('verbose')(message, payload);
	public static debug = (
		message: string,
		payload?: Record<string, any>
	): void => Logger.processLog('debug')(message, payload);
	public static info = (
		message: string,
		payload?: Record<string, any>
	): void => Logger.processLog('info')(message, payload);
	public static warn = (
		message: string,
		payload?: Record<string, any>
	): void => Logger.processLog('warn')(message, payload);
	public static error = (
		message: string,
		payload?: Record<string, any>
	): void => Logger.processLog('error')(message, payload);
	public static log = (
		level: LogLevel,
		message: string,
		payload?: Record<string, any>
	): void => Logger.processLog(level)(message, payload);

	private static processLog =
		(level: LogLevel) =>
		(message: string, payload?: Record<string, any>): void => {
			if (!Logger.isInitialized) {
				console.error(
					"Your logger is not initialized yet, therefore this log won't be sent to the server",
					message,
					payload
				);
				return;
			}

			const metadata: Log['metadata'] = {
				...payload,
				...(Logger.config.getUserData && {
					userData: Logger.config.getUserData()
				})
			};

			Logger.logsBuffer.push({
				level,
				message,
				timestamp: new Date(),
				...(Object.keys(metadata).length && { metadata })
			});

			if (Logger.logsBuffer.length > Logger.config.bufferSize) {
				Logger.sendToServer();
			}
		};

	private static sendToServer(): void {
		const bufferJson: string = JSON.stringify(Logger.logsBuffer);

		fetch(Logger.config.logEndpoint, {
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			method: 'POST',
			body: bufferJson
		})
			.then(() => {
				Logger.logsBuffer = [];
			})
			.catch((error: Error) => {
				console.error(
					`An error has occured while sending logs to the server`,
					error
				);
			});
	}
}
