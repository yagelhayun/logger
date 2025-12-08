# Logger

A powerful JSON logger, designed for both server-side and client-side applications.

## Installation

```bash
npm install @yagelhayun/logger
```

## Motivation

This logger builds on `winston`, adding features that make logging simpler and more powerful. With easy configuration, flexible utilities for web frameworks—like automatic request metadata tracking—and seamless integration with popular frameworks, you can structure your logs effectively while continuing to use the familiar `winston` API.

This documentation covers everything that is exclusive to this library. For basic `winston` usage, refer to [their documentation](https://www.npmjs.com/package/winston).

## Basic Usage

### Server Logger

Create a logger instance using `createLogger`:

```js
import { createLogger, Logger } from '@yagelhayun/logger/server';

const logger: Logger = createLogger({
	isLocal: process.env.NODE_ENV === 'development',
	minLogLevel: process.env.MIN_LOG_LEVEL || 'info',
	defaultMetadata: { serviceName: 'user-service' }
});
```

#### Configuration Options

| Name              | Default | Description                                                                                                                              |
| ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `isLocal`         | `false` | If set to `true`, prints human-readable, colorized logs. Use with caution in production as it can break log parsing                      |
| `minLogLevel`     | `info`  | Lowest log level to print. For example, setting this to `warn` will ignore any `debug` or `info` logs                                    |
| `defaultMetadata` | `{}`    | Default metadata appended to every log. Common use cases include `systemName` (e.g., `TodoList`) or `serviceName` (e.g., `user-service`) |

#### Error Serialization

The logger automatically serializes `Error` objects, including their message, stack trace, and type. Nested errors in arrays are also properly handled, making debugging easier.

### Client Logger

The client logger allows you to send logs from browser applications to your server. It batches logs and sends them efficiently to reduce network overhead.

#### Initialization

First, initialize the client logger with your server URL:

```js
import { Logger } from '@yagelhayun/logger/client';

Logger.initialize('https://api.example.com', {
	bufferSize: 10,
	bufferFlushInterval: 30,
	logEndpoint: '/logger/write',
	getUserData: () => {
		// Return user-specific data to append to all logs
		return {
			userId: getCurrentUserId(),
			sessionId: getSessionId()
		};
	}
});
```

#### Configuration Options

| Name                  | Default           | Description                                                                                                                              |
| --------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `bufferSize`          | `10`              | Maximum number of logs to buffer before sending. When reached, logs are immediately sent to the server                                   |
| `bufferFlushInterval` | `30`              | Interval in seconds for automatically flushing buffered logs to the server                                                               |
| `logEndpoint`         | `'/logger/write'` | The endpoint path on your server where logs will be sent. The full URL is constructed as `serverUrl + logEndpoint`                       |
| `getUserData`         | `undefined`       | Optional function that returns user-specific metadata to append to all logs. Useful for tracking user IDs, session IDs, or other context |

#### Usage

Once initialized, use the logger methods to send logs:

```js
Logger.info('User clicked button', { buttonId: 'submit-form' });
Logger.warn('API request took longer than expected', { duration: 5000 });
Logger.error('Failed to load user data', { userId: '123' });
Logger.debug('Component rendered', { componentName: 'UserProfile' });
Logger.verbose('Detailed trace information', { trace: '...' });

// Or use the generic log method
Logger.log('info', 'Custom log message', { customData: 'value' });
```

#### Automatic Error Handling

The client logger automatically captures unhandled errors via `window.onerror`, logging them with full context including the error message, stack trace, source file, line number, and column number.

#### Important Notes

-   The logger must be initialized before use. Logs created before initialization will be printed to the console with a warning
-   Logs are buffered and sent in batches to reduce network requests
-   The logger sends logs using `fetch` with `credentials: 'include'` to support authenticated requests

## Web Framework Usage

This logger provides full support for `express`, `fastify`, and `NestJS` web frameworks. The configuration is identical across all frameworks.

### Express Integration

For standalone Express applications:

```js
import {
	Logger,
	createLogger,
	applyExpressLogger
} from '@yagelhayun/logger/server';
import express, { Application } from 'express';

const app: Application = express();
const logger: Logger = createLogger();

applyExpressLogger(app, logger, {
	middleware: {
		customProps: (req) => ({
			entityId: req.header('entity-id'),
			operationName: req.body.operationName
		}),
		getRequestId: (req) => req.header('request-id')
	}
});
```

### NestJS Integration

For NestJS applications, use the framework-specific functions. The logger integrates seamlessly with NestJS's execution context, ensuring request metadata is available throughout the entire request lifecycle.

#### Express Adapter

```js
import { NestFactory } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import {
	applyExpressNestLogger,
	createLogger
} from '@yagelhayun/logger/server';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
	const logger = createLogger();

	const app: NestExpressApplication = await NestFactory.create(AppModule, {
		logger: WinstonModule.createLogger({
			instance: logger
		})
	});

	applyExpressNestLogger(app, logger, {
		middleware: {
			customProps: (req) => ({
				operationName: req.body?.operationName
			})
		}
	});

	await app.listen(3000);
}
bootstrap();
```

**Important Notes:**

-   NestJS integration uses interceptors to establish async context, ensuring metadata is available in all execution phases
-   Compatible with NestJS v7.0.0+
-   Works with both REST controllers and GraphQL resolvers
-   The interceptor runs early in the execution pipeline, before guards, pipes, and controllers

### Framework Configuration

The logger automatically appends request-specific metadata to all logs within a request lifecycle, helping you distinguish and analyze logs per request. This works identically across Express, Fastify, and NestJS integrations.

#### Appending Custom Metadata

Use `customProps` to extract and map properties from the request object:

```js
applyExpressLogger(app, logger, {
	middleware: {
		customProps: (req) => ({
			entityId: req.header('entity-id'),
			operationName: req.body?.operationName,
			userId: req.user?.id
		})
	}
});
```

#### Request ID

Configure how request IDs are generated or extracted:

```js
applyExpressLogger(app, logger, {
	middleware: {
		getRequestId: (req) =>
			req.header('request-id') || req.body?.correlationId
	}
});
```

If `getRequestId` is not provided or returns `undefined`, a new UUID will be automatically generated.

#### Excluding Paths

You can exclude specific paths from logging and metadata attachment:

```js
applyExpressLogger(app, logger, {
	middleware: {
		excludePaths: ['/health', '/metrics', '/favicon.ico']
	}
});
```

#### Middleware API

| Name                    | Default              | Description                                                                                                                                  |
| ----------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `excludePaths`          | `[]`                 | Array of URL paths to exclude from logging and metadata attachment                                                                           |
| `enableRequestMetadata` | `true`               | Enables automatic request metadata (HTTP method and endpoint) to be appended to every log                                                    |
| `enableRequestLogging`  | `true`               | Enables automatic request/response logging. Includes request start, finish, response status code, and request duration                       |
| `customReceivedMessage` | `'Request started'`  | Custom message printed when a request arrives. Silenced if `enableRequestLogging` is `false`                                                 |
| `customFinishedMessage` | `'Request finished'` | Custom message printed when a request completes. Silenced if `enableRequestLogging` is `false`                                               |
| `requestIdLogLabel`     | `'requestId'`        | Custom label for the request ID in logs                                                                                                      |
| `customProps`           | `undefined`          | Function that extracts custom properties from the request to append to all logs. Useful for `entityId`, `userDetails`, `operationName`, etc. |
| `getRequestId`          | `undefined`          | Function that extracts or generates a request ID. If not provided or returns `undefined`, a UUID is automatically generated                  |

#### Response Metadata

When `enableRequestLogging` is enabled, the logger automatically includes response metadata in the finish log:

-   `response.statusCode`: HTTP status code
-   `response.duration`: Request duration in milliseconds

### Client Logs Endpoint

The logger can expose an endpoint for receiving logs from client applications. This is particularly useful for collecting browser-side logs on your server.

#### Basic Setup

```js
applyExpressLogger(app, logger, {
	route: {
		endpoint: '/logs',
		origin: 'todolist-client'
	}
});
```

#### Dynamic Origin

The `origin` can be a function that extracts the origin from the request:

```js
applyExpressLogger(app, logger, {
	route: {
		endpoint: '/logs',
		origin: (req) => req.header('x-client-name') || 'unknown-client'
	}
});
```

#### Route Configuration

| Name       | Default           | Description                                                                      |
| ---------- | ----------------- | -------------------------------------------------------------------------------- |
| `endpoint` | `'/logger/write'` | The endpoint path to expose for client logs                                      |
| `origin`   | `'client'`        | String or function that returns an `origin` metadata value for each external log |

#### Log Schema

The endpoint validates incoming logs against a strict schema. Logs that don't meet the criteria are rejected. The expected schema:

| Name        | Required | Type                                                      |
| ----------- | -------- | --------------------------------------------------------- |
| `level`     | `true`   | `'verbose'` / `'debug'` / `'info'` / `'warn'` / `'error'` |
| `message`   | `true`   | `string`                                                  |
| `metadata`  | `false`  | `object`                                                  |
| `timestamp` | `false`  | `Date` (will be coerced from string if provided)          |

## Advanced Usage

These core features are available for custom usage scenarios and are used internally by the web framework integrations.

### Initializing a Log Metadata Context

To start accumulating metadata for your logs, you need to establish a context boundary. This is done by wrapping your logic in a function and passing it to `attachLogContext`.

Each time your logic executes, a new unique state is created and attached to the current event loop context. This ensures each event has its own isolated state, which is automatically disposed when the event completes.

```js
import { attachLogContext } from '@yagelhayun/logger/server';

const main = () => {
	// Your application logic here
};

attachLogContext(main);
```

**Important:** Only use this feature when necessary! The primary use case is for services that don't receive HTTP requests (e.g., cron jobs, background workers). If you're using `applyExpressLogger`, `applyFastifyLogger`, `applyExpressNestLogger`, or `applyFastifyNestLogger`, you don't need this—they already set up the context automatically.

### Adding Metadata Dynamically

After establishing a log context (via `attachLogContext`, `applyExpressLogger`, `applyFastifyLogger`, `applyExpressNestLogger`, or `applyFastifyNestLogger`), you can add metadata dynamically using `setLogMetadata`:

```js
import { v4 } from 'uuid';
import {
	attachLogContext,
	setLogMetadata,
	createLogger,
	Logger
} from '@yagelhayun/logger/server';

const logger: Logger = createLogger();

const main = () => {
	setLogMetadata('uuid', v4());

	logger.info('start');
	logger.warn('middle');
	logger.error('end');
};

attachLogContext(main);
```

The output will look like:

```jsonl
{"uuid":"facf386f-9e63-446c-8844-3f2be9d85ee8","level":"info","message":"start","service":"cronjob","timestamp":"2024-03-22T15:57:39.490Z"}
{"uuid":"facf386f-9e63-446c-8844-3f2be9d85ee8","level":"warn","message":"middle","service":"cronjob","timestamp":"2024-03-22T15:57:39.492Z"}
{"uuid":"facf386f-9e63-446c-8844-3f2be9d85ee8","level":"error","message":"end","service":"cronjob","timestamp":"2024-03-22T15:57:39.493Z"}
```

#### Metadata Merging

When you set metadata with the same key multiple times, the values are merged (not replaced) using deep merging. This allows you to progressively build up metadata:

```js
setLogMetadata('user', { id: '123', name: 'John' });
setLogMetadata('user', { email: 'john@example.com' });
// Result: { user: { id: '123', name: 'John', email: 'john@example.com' } }
```

#### Common Use Cases

-   **Adding database query results:**

    ```js
    const entities = await query('SELECT entity_name from entities');
    setLogMetadata('entities', { count: entities.length, entities });
    ```

-   **Adding HTTP request results:**

    ```js
    const response = await fetch('https://api.example.com/entities');
    const data = await response.json();
    setLogMetadata('apiResponse', { status: response.status, data });
    ```

-   **Adding context at specific points in your code:**
    ```js
    // Later in your code flow
    setLogMetadata('processingEntity', { entityId: '456', entityType: 'user' });
    ```
