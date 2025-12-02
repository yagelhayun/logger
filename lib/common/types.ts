import { levels } from './consts';

export type LogLevel = (typeof levels)[number];

export type DeepPartial<T> = T extends Function | FunctionConstructor
	? T
	: {
			[K in keyof T]?: DeepPartial<T[K]>;
	  };
