import { Log, LoggerConfig } from './types';
import { LogLevel } from '../common/types';

const defaultConfig: LoggerConfig = {
	logEndpoint: '/api/logger/write',
	bufferFlushInterval: 30,
	maxBufferSize: 10
};

export class ClientLogger {
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
		if (ClientLogger.isInitialized) {
			console.warn(
				"If you're seeing this, you probably initialized your logger multiple times. You should only call the 'initialize' method once👋"
			);
			return;
		}

		ClientLogger.isInitialized = true;
		ClientLogger.config = ClientLogger.mapConfig(appUrl, {
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
				ClientLogger.error(<string>message, {
					error: errorJson,
					source,
					lineno,
					colno
				});
			}

			return null;
		};

		setInterval(() => {
			if (ClientLogger.logsBuffer.length) {
				ClientLogger.sendToServer();
			}
		}, ClientLogger.config.bufferFlushInterval * 1000);
	}

	public static verbose = (
		message: string,
		payload?: Record<string, any>
	): void => ClientLogger.log('verbose')(message, payload);
	public static debug = (
		message: string,
		payload?: Record<string, any>
	): void => ClientLogger.log('debug')(message, payload);
	public static info = (
		message: string,
		payload?: Record<string, any>
	): void => ClientLogger.log('info')(message, payload);
	public static warn = (
		message: string,
		payload?: Record<string, any>
	): void => ClientLogger.log('warn')(message, payload);
	public static error = (
		message: string,
		payload?: Record<string, any>
	): void => ClientLogger.log('error')(message, payload);

	private static log =
		(level: LogLevel) =>
		(message: string, payload?: Record<string, any>): void => {
			if (!ClientLogger.isInitialized) {
				console.error(
					"Your logger is not initialized yet, therefore this log won't be sent to the server",
					message,
					payload
				);
				return;
			}

			ClientLogger.logsBuffer.push({
				message,
				level,
				timestamp: new Date(),
				metadata: {
					...payload,
					userData: ClientLogger.config.getUserData?.()
				}
			});

			if (
				ClientLogger.logsBuffer.length >
				ClientLogger.config.maxBufferSize
			) {
				ClientLogger.sendToServer();
			}
		};

	private static sendToServer(): void {
		const bufferJson: string = JSON.stringify(ClientLogger.logsBuffer);

		fetch(ClientLogger.config.logEndpoint, {
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include',
			method: 'POST',
			body: bufferJson
		})
			.then(() => {
				ClientLogger.logsBuffer = [];
			})
			.catch((error: Error) => {
				console.error(
					`An error has occured while sending logs to the server`,
					error
				);
			});
	}
}
