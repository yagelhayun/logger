import { z } from 'zod';
import { clientLogSchema } from '../common/consts';

export type LoggerConfig = {
	bufferSize: number;
	bufferFlushInterval: number;
	logEndpoint: string;
	getUserData?: () => any | undefined;
};

/**
 * @internal
 */
export type Log = z.infer<typeof clientLogSchema>;
