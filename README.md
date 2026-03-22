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

| Name                     | Default | Description                                                                           |
| ------------------------ | ------- | ------------------------------------------------------------------------------------- |
| `isLocal`                | `false` | Human-readable, colorized logs. Use with caution in production                        |
| `minLogLevel`            | `info`  | Lowest log level to print (e.g., `warn` ignores `debug` and `info`)                   |
| `defaultMetadata`        | `{}`    | Default metadata appended to every log (e.g., `serviceName`, `systemName`)            |
| `redactValues`           | `[]`    | Sensitive strings to replace with `[REDACTED]` in logs (e.g., API keys, passwords)    |
| `logUnhandledExceptions` | `false` | Automatically capture uncaught exceptions and rejections, then exit for clean restart |

Features:

- Automatic `Error` serialization with stack traces
- Deep secret redaction in nested objects and arrays
- Request metadata tracking via framework integrations
- See [Advanced Usage](docs/advanced-usage.md) for metadata management and custom contexts

### Client Logger

Send logs from browser to server with automatic batching:

```js
import { Logger } from '@yagelhayun/logger/client';

Logger.initialize('https://api.example.com', {
	bufferSize: 10,
	bufferFlushInterval: 30,
	logEndpoint: '/logger/write',
	getUserData: () => ({
		userId: getCurrentUserId(),
		sessionId: getSessionId()
	})
});

Logger.info('User clicked button', { buttonId: 'submit-form' });
Logger.error('Failed to load data', { userId: '123' });
```

#### Configuration Options

| Name                  | Default           | Description                                                         |
| --------------------- | ----------------- | ------------------------------------------------------------------- |
| `bufferSize`          | `10`              | Max logs to buffer before sending                                   |
| `bufferFlushInterval` | `30`              | Interval (seconds) to auto-flush buffered logs                      |
| `logEndpoint`         | `'/logger/write'` | Server endpoint path for logs (full URL: `serverUrl + logEndpoint`) |
| `getUserData`         | `undefined`       | Function returning user-specific metadata for all logs              |

Features:

- Automatic `window.onerror` capture with full context
- Logs buffered and sent in batches to reduce network overhead
- Includes `credentials: 'include'` for authenticated requests
- Important: Initialize before logging anything

## Web Framework Usage

This logger provides full support for `express`, `fastify`, and `NestJS` web frameworks.

### Express Integration

```js
import { createLogger, applyExpressLogger } from '@yagelhayun/logger/server';
import express from 'express';

const app = express();
const logger = createLogger();

applyExpressLogger(app, logger, {
	middleware: {
		customProps: (req) => ({
			userId: req.user?.id,
			operationName: req.body?.operationName
		}),
		getRequestId: (req) => req.header('request-id')
	}
});
```

### Fastify Integration

```js
import { createLogger, applyFastifyLogger } from '@yagelhayun/logger/server';
import Fastify from 'fastify';

const app = Fastify();
const logger = createLogger();

applyFastifyLogger(app, logger, {
	middleware: {
		customProps: (req) => ({
			userId: req.user?.id,
			operationName: req.body?.operationName
		}),
		getRequestId: (req) => req.headers['request-id']
	}
});
```

### NestJS Integration

#### Express Adapter

```js
import { NestFactory } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import {
	applyExpressNestLogger,
	createLogger
} from '@yagelhayun/logger/server';

async function bootstrap() {
	const logger = createLogger();
	const app = await NestFactory.create(AppModule, {
		logger: WinstonModule.createLogger({ instance: logger })
	});

	applyExpressNestLogger(app, logger, {
		middleware: {
			customProps: (req) => ({ operationName: req.body?.operationName })
		}
	});

	await app.listen(3000);
}
```

#### Fastify Adapter

```js
import { applyFastifyNestLogger } from '@yagelhayun/logger/server';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

// Same setup as Express, but use applyFastifyNestLogger and NestFastifyApplication
```

**Important Notes:**

- NestJS integration uses interceptors to establish async context
- Compatible with NestJS v7.0.0+
- Works with both REST and GraphQL

### Framework Configuration

#### Middleware Options

| Name                    | Default              | Description                                                           |
| ----------------------- | -------------------- | --------------------------------------------------------------------- |
| `excludePaths`          | `[]`                 | Paths to exclude from logging                                         |
| `enableRequestMetadata` | `true`               | Append request metadata (method, endpoint) to logs                    |
| `enableRequestLogging`  | `true`               | Log request start/finish with duration                                |
| `customReceivedMessage` | `'Request started'`  | Message when request arrives                                          |
| `customFinishedMessage` | `'Request finished'` | Message when request completes                                        |
| `requestIdLogLabel`     | `'requestId'`        | Label for request ID in logs                                          |
| `customProps`           | `undefined`          | Function to extract custom properties from request                    |
| `getRequestId`          | `undefined`          | Function to extract/generate request ID (UUID generated if undefined) |

#### Client Logs Endpoint

Expose an endpoint to receive logs from client applications:

```js
applyExpressLogger(app, logger, {
	route: {
		endpoint: '/logs',
		origin: (req) => req.header('x-client-name') || 'unknown-client'
	}
});
```

| Name       | Default           | Description                                  |
| ---------- | ----------------- | -------------------------------------------- |
| `endpoint` | `'/logger/write'` | Endpoint path for client logs                |
| `origin`   | `'client'`        | String or function returning origin metadata |

#### Response Metadata

When request logging is enabled:

- `response.statusCode`: HTTP status code
- `response.duration`: Request duration in milliseconds

## Documentation

- **[Advanced Usage](docs/advanced-usage.md)** - `attachLogContext`, `setLogMetadata`, metadata merging, context retrieval
- **[Best Practices](docs/best-practices.md)** - Configuration tips, log level usage, secret redaction, framework patterns
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions
- **[TypeScript Types](docs/type-exports.md)** - Available type definitions

## Development

### Testing

Unit tests use [Vitest](https://vitest.dev/) and cover:

- `attachLogContext` – async context isolation and metadata propagation
- `setLogMetadata` – merging and context scoping
- `createLogger` – config, levels, default metadata
- `applyExpressLogger` / `applyFastifyLogger` – middleware, client logs route, exclude paths
- `applyExpressNestLogger` / `applyFastifyNestLogger` – interceptor registration

```bash
npm test            # run once
npm run test:watch  # watch mode
```

Full Nest integration tests (with real Nest apps) should be run in your application or in dedicated test projects (e.g. `F:\Codes\logger-tests`), since Vitest's esbuild-based transpiler does not support TypeScript's `emitDecoratorMetadata` required by Nest decorators.
