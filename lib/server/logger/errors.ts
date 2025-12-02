const normalizeError = (value: any) => {
	if (value instanceof Error) {
		const { message, stack } = value;

		return {
			message,
			stack,
			type: Object.getPrototypeOf(value).constructor.name
		};
	}

	return value;
};

export const errorReplacer = (_key: string, value: any) => {
	if (value instanceof Error) {
		return {
			...value,
			...normalizeError(value),
			// @ts-ignore
			...(Array.isArray(value?.errors) && {
				// @ts-ignore
				errors: value.errors.map(normalizeError)
			})
		};
	} else {
		return value;
	}
};
