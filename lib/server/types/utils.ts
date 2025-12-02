export type DeepPartial<T> = T extends Function | FunctionConstructor
	? T
	: {
			[K in keyof T]?: DeepPartial<T[K]>;
	  };
