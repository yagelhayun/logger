import { format } from 'winston';

const SPLAT = Symbol.for('splat');

const isAggregateError = (
	value: Error
): value is Error & { errors: unknown[] } =>
	'errors' in value && Array.isArray((value as { errors?: unknown }).errors);

const serializeError = (value: Error): Record<string, unknown> => ({
	...value,
	message: value.message,
	stack: value.stack,
	type: Object.getPrototypeOf(value).constructor.name,
	...(isAggregateError(value) && {
		errors: value.errors.map((e) =>
			e instanceof Error ? serializeError(e) : e
		)
	})
});

/**
 * Winston formatter that serializes Error objects passed directly to logger methods
 * (e.g. `logger.error('msg', error)`). Winston extracts only `message` and `stack`
 * from the error internally, so this formatter runs before `format.json()` to add
 * the missing fields — `type`, custom properties, and `errors` for AggregateError.
 *
 * @internal
 */
export const errorFormatter = format((info) => {
	const splat = (info as Record<symbol, unknown>)[SPLAT];
	if (!Array.isArray(splat) || !(splat[0] instanceof Error)) return info;

	const err = splat[0] as Error;

	(info as Record<string, unknown>).type =
		Object.getPrototypeOf(err).constructor.name;
	Object.assign(info, err);

	if (isAggregateError(err)) {
		(info as Record<string, unknown>).errors = err.errors.map((e) =>
			e instanceof Error ? serializeError(e) : e
		);
	}

	return info;
});

/**
 * JSON replacer that serializes Error objects that appear as values inside
 * metadata objects (e.g. `logger.error('msg', { cause: someError })`).
 *
 * @internal
 */
export const errorReplacer = (_key: string, value: unknown): unknown => {
	if (value instanceof Error) return serializeError(value);
	return value;
};
