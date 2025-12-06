import { z } from 'zod';
import { clientLogSchema } from '../common/consts';

/**
 * @internal
 */
export const clientLogsSchema = z.array(clientLogSchema);
