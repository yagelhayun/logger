import { z } from 'zod';
import { clientLogsSchema } from '../consts';

export type LogMetadata = Record<string, any>;

/**
 * @internal
 */
export type ClientLogs = z.infer<typeof clientLogsSchema>;
