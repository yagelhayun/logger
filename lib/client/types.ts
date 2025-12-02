import { LogLevel } from "../common/types";

export type LoggerConfig = {
	maxBufferSize: number;
	bufferFlushInterval: number;
	logEndpoint: string;
	getUserData?: () => any | undefined;
}

/**
 * @internal
 */
export type Log = {
	message: string;
	level: LogLevel;
	timestamp: Date;
	metadata: Record<string, any>;
}
