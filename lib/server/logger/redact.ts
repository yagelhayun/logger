import { format } from 'winston';

const REDACTED = '[REDACTED]';

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Recursively redacts secrets using copy-on-write: nested objects are only shallow-cloned
 * when a secret is actually found, so the happy path (nothing to redact) is allocation-free.
 * Returns the same reference if nothing changed, a new object/array if something was redacted.
 */
function redactValue(val: unknown, pattern: RegExp): unknown {
	if (typeof val === 'string') {
		pattern.lastIndex = 0;
		if (!pattern.test(val)) return val;
		pattern.lastIndex = 0;
		return val.replace(pattern, REDACTED);
	}
	if (Array.isArray(val)) {
		return redactArray(val, pattern);
	}
	if (val !== null && typeof val === 'object') {
		return redactObject(val as Record<string, unknown>, pattern);
	}
	return val;
}

function redactArray(arr: unknown[], pattern: RegExp): unknown[] {
	let result: unknown[] | null = null;
	for (let i = 0; i < arr.length; i++) {
		const redacted = redactValue(arr[i], pattern);
		if (redacted !== arr[i]) {
			if (!result) result = arr.slice();
			result[i] = redacted;
		}
	}
	return result ?? arr;
}

function redactObject(
	obj: Record<string, unknown>,
	pattern: RegExp
): Record<string, unknown> {
	let result: Record<string, unknown> | null = null;
	for (const key of Object.keys(obj)) {
		const val = obj[key];
		const redacted = redactValue(val, pattern);
		if (redacted !== val) {
			if (!result) result = { ...obj };
			result[key] = redacted;
		}
	}
	return result ?? obj;
}

/**
 * Creates a Winston formatter that replaces known secret values with `[REDACTED]`
 * anywhere they appear in a log — including nested fields and substrings within strings.
 *
 * Compiles all secrets into a single regex at creation time, so each string in a log
 * is scanned exactly once regardless of how many secrets are configured.
 * Uses copy-on-write: nested objects are only cloned when a secret is actually found,
 * so logs with nothing to redact incur traversal cost only — no allocations.
 *
 * @param values - The actual secret strings to scan for (e.g. API keys, tokens, passwords)
 * @internal
 */
export const createRedactValuesFormatter = (values: string[]) => {
	// Compiled once at logger creation — zero regex overhead per log entry.
	// Filter empty strings: an empty pattern matches every position and would corrupt all logs.
	const meaningful = values.filter((v) => v.length > 0);
	if (meaningful.length === 0) return format((info) => info);
	const pattern = new RegExp(meaningful.map(escapeRegex).join('|'), 'g');

	return format((info) => {
		// Mutate info's own keys in-place so Winston's Symbol properties are preserved,
		// but replace nested object values with copy-on-write clones when needed.
		const record = info as Record<string, unknown>;
		for (const key of Object.keys(record)) {
			const val = record[key];
			const redacted = redactValue(val, pattern);
			if (redacted !== val) {
				record[key] = redacted;
			}
		}
		return info;
	});
};
