import { z } from 'zod';

export const levels = ['verbose', 'debug', 'info', 'warn', 'error'] as const;

export const clientLogSchema = z.object({
	level: z.enum(levels),
	message: z.string(),
	timestamp: z.coerce.date(),
	metadata: z.record(z.any())
});
