import { z } from 'zod';

export const CLIENT_LOGS_ENDPOINT: string = '/logger/write';

export const levels = ['verbose', 'debug', 'info', 'warn', 'error'] as const;

/**
 * @internal
 */
export const clientLogSchema = z.object({
	level: z.enum(levels),
	message: z.string(),
	timestamp: z.coerce.date(),
	metadata: z.record(z.any()).optional()
});
