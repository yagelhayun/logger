import { z } from 'zod';

export const levels = ['verbose', 'debug', 'info', 'warn', 'error'] as const;

/**
 * @internal
 */
export const clientLogsSchema = z.array(
	z.object({
		level: z.enum(levels),
		message: z.string(),
		timestamp: z.coerce.date().optional(),
		info: z.record(z.any()).optional()
	})
);
