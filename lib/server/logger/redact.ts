import { format } from 'winston';

const REDACTED = '[REDACTED]';

function replaceSecrets(str: string, secrets: string[]): string {
	for (const secret of secrets) {
		if (str.includes(secret)) {
			str = str.split(secret).join(REDACTED);
		}
	}
	return str;
}

function redactKnownValues(obj: unknown, secrets: string[]): void {
	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			if (typeof obj[i] === 'string') {
				obj[i] = replaceSecrets(obj[i], secrets);
			} else if (obj[i] !== null && typeof obj[i] === 'object') {
				redactKnownValues(obj[i], secrets);
			}
		}
	} else if (obj !== null && typeof obj === 'object') {
		const record = obj as Record<string, unknown>;
		for (const key of Object.keys(record)) {
			const val = record[key];
			if (typeof val === 'string') {
				record[key] = replaceSecrets(val, secrets);
			} else if (val !== null && typeof val === 'object') {
				redactKnownValues(val, secrets);
			}
		}
	}
}

/**
 * Creates a Winston formatter that replaces known secret values with `[REDACTED]`
 * anywhere they appear in a log — including nested fields and substrings within strings.
 *
 * @param values - The actual secret strings to scan for (e.g. API keys, tokens, passwords)
 */
export const createRedactValuesFormatter = (values: string[]) => {
	return format((info) => {
		redactKnownValues(info, values);
		return info;
	});
};
