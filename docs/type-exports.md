# TypeScript Type Exports

The logger provides type definitions for your application:

## Server Types

```ts
import type {
	Logger,              // Winston logger instance type
	LogLevel,            // Union of log levels: 'verbose' | 'debug' | 'info' | 'warn' | 'error'
	LoggerConfig,        // Configuration for createLogger
	LogMetadata,         // Metadata object type
	MiddlewareConfig,    // Middleware configuration options
	RouteConfig,         // Client logs endpoint configuration
	WebFrameworkConfig   // Complete framework integration configuration
} from '@yagelhayun/logger/server';
```

## Client Types

```ts
import type { LoggerConfig } from '@yagelhayun/logger/client';
```

## Usage Example

```ts
import type { Logger, LoggerConfig, MiddlewareConfig } from '@yagelhayun/logger/server';

const config: LoggerConfig = {
	isLocal: process.env.NODE_ENV === 'development',
	minLogLevel: 'info',
	defaultMetadata: { serviceName: 'api' },
	redactValues: [process.env.SECRET_KEY],
	logUnhandledExceptions: true
};

const middlewareConfig: MiddlewareConfig = {
	excludePaths: ['/health'],
	enableRequestMetadata: true,
	enableRequestLogging: true
};
```
