import { z } from 'zod';
import { levels, clientLogsSchema } from '../consts';

export type LogLevel = (typeof levels)[number];

export type LogMetadata = Record<string, any>;

/**
 * @internal
 */
export type ClientLogs = z.infer<typeof clientLogsSchema>;
