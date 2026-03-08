import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['tests/**/*.test.ts'],
		globals: false
	},
	resolve: {
		alias: {
			'@yagelhayun/logger/server': path.resolve(__dirname, 'lib/server/index.ts'),
			'@yagelhayun/logger/client': path.resolve(__dirname, 'lib/client/index.ts')
		}
	}
});
