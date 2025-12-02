# Fire & Attack Logger

## Motivation

This logger is intended to be an extension to the `winston` logger, with a few additions that can help you log better.<br>
With a simplified configuration and a set of flexible tools designed for web frameworks usage, you'll be able to shape your logs while still using the basic `winston` API.<br>
Here we'll be covering everything that is exclusive to this library. For basic usage of the `winston` logger, we recommend you go over [their docs](https://www.npmjs.com/package/winston).

## Basic Usage

### Creating your own Logger

You get started by creating a logger using `createLogger`:

```js
import { createLogger, Logger } from '@fireattack/logger';

const logger: Logger = createLogger({
	isLocal: process.env.NODE_ENV === 'development',
	minLogLevel: process.env.MIN_LOG_LEVEL || 'info',
	defaultMetadata: { serviceName: 'user-service' }
});
```

A logger accepts the following parameters:

| Name              | Default | Description                                                                                                                      |
| ----------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `isLocal`         | `false` | If set to `true`, will print human readable logs. Be cautious setting this, as it can break your logs in production              |
| `minLogLevel`     | `info`  | Lowest level of printing logs. For example, when setting this to `warn`, any `debug`/`info` logs will be ignored and not printed |
| `defaultMetadata` | `{}`    | Default metadata to be appended to every log. Common use cases are: `systemName (Warrior)`, `serviceName (user-service)`         |

## Web Framework Usage

This logger comes with full support for `express` and `fastify` web frameworks.
The configurations themselves are identical for both the frameworks, but we'll use the `express` handler in our examples.

### Logs Middleware

A middleware is provided for appending metadata unique to each request that is processed.
This can help distinguish between logs per request, which can eventually help you analyze your logs faster and overall better.

#### Appending metadata scoped to a request

Using `customProps` you can extract properties from anywhere in the request object and map it however you like.

```js
import { applyExpressLogger } from '@fireattack/logger';

const app: Application = express();

applyExpressLogger(app, {
	middleware: {
		customProps: (req) => ({
			realityId: req.header('reality-id'),
			operationName: req.body.operationName
		})
	}
});
```

In the above example we've mapped `realityId` from the headers and `operationName` from the request body.

#### Appending request ID

A function to specifically set a unique request ID.
Just like `customProps` you have the request object available to use, so you can extract your data from it or simply create a new one yourself.
If `generateRequestId` not provided or resolves to `undefined`, a new `uuid` will be generated as a fallback.

```js
import { applyExpressLogger } from '@fireattack/logger';

const app: Application = express();

applyExpressLogger(app, {
	middleware: {
		generateRequestId: (req) => req.header('request-id')
	}
});
```

#### API

| Name                    | Default              | Description                                                                                                                                                    |
| ----------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enableRequestMetadata` | `true`               | Enables request metadata to be appended to every log. Includes HTTP method (GET/POST etc.) and endpoint                                                        |
| `enableRequestLogging`  | `true`               | Enables internal request logs. Includes a response message that specifies the requests duration                                                                |
| `customReceivedMessage` | `'Request started'`  | Override the default message printed when a request arrives to the server. Will be silenced if `enableInternalLogs` is off                                     |
| `customFinishedMessage` | `'Request finished'` | Override the default message printed when a request is finished. Will be silenced if `enableInternalLogs` is off                                               |
| `requestIdLogLabel`     | `'requestId'`        | Override the default request id label in each log                                                                                                              |
| `customProps`           | `{}`                 | Appends all properties to every log throughout the whole request lifecycle. Can be useful for things like `realityId`, `userDetails`, `operationName` and more |
| `generateRequestId`     | `uuid`               | Appends request id to every log throughout the whole request lifecycle                                                                                         |

### Logs endpoint

A logs endpoint is available for printing logs from external source.<br>
This is most beneficial for client applications, but you may use it in other ways.
Each time you fetch this endpoint, it checks a strict schema and will not print out your logs if the criterions is not met.

```js
import { applyExpressLogger } from '@fireattack/logger';

const app: Application = express();

applyExpressLogger(app, {
	route: {
		enabled: true,
		endpoint: '/logs',
		origin: 'warrior-client'
	}
});
```

#### API

| Name       | Default           | Description                                                                         |
| ---------- | ----------------- | ----------------------------------------------------------------------------------- |
| `enabled`  | `false`           | Enables and exposes the route                                                       |
| `endpoint` | `'/logger/write'` | The endpoint to be exposed for client logs                                          |
| `origin`   | `'client'`        | Function that resolves to an `origin` metadata, to be appended to each external log |

#### Logs schema

| Name        | Is Mandatory | type                                                      |
| ----------- | ------------ | --------------------------------------------------------- |
| `level`     | `true`       | `'verbose'` / `'debug'` / `'info'` / `'warn'` / `'error'` |
| `message`   | `true`       | `string`                                                  |
| `info`      | `false`      | `object`                                                  |
| `timestamp` | `false`      | `Date`                                                    |

## Advanced Usage

Here are some core features that are available for more custom usage.
These are being used under the hood in any [web framework feature](#web-framework-usage).

### Initializing a new log metadata context

To start accumulating metadata for your logs, you first have to specify a starting point of your logic.
This is done by wrapping your logic inside a function and passing it to `attachLogContext`.<br>
Each time your logic gets executed, a new unique state is created. That state is attached to the current event in the event loop, so each event has its own state. When that event ends, its state is safely disposed.

```js
import { attachLogContext } from '@fireattack/logger';

const main = () => {
    ...
};

attachLogContext(main);
```

<b>NOTE!</b><br>
You should use this feature only if necessary!<br>
The only use case for this is when your service is not served as a web service (it doesn't receive HTTP requests at all).<br>
If you use one of `applyExpressLogger` or `applyFastifyLogger` then you shouldn't use this feature, as both options already apply it behind the scenes.

### Adding new metadata dynamically

Now after you've used one of these ( `attachLogContext` / `applyExpressLogger` / `applyFastifyLogger` )
you can start adding new metadata by using `setLogMetadata`:

```js
import { v4 } from 'uuid';
import { attachLogContext, setLogMetadata } from '@fireattack/logger';
import { logger } from './logger';

const main = () => {
	setLogMetadata('uuid', v4());

	logger.info('start');
	logger.warn('middle');
	logger.error('end');
};

attachLogContext(main);
```

The output of this example will look like:

```jsonl
{"uuid":"facf386f-9e63-446c-8844-3f2be9d85ee8","level":"info","message":"start","service":"cronjob","timestamp":"2024-03-22T15:57:39.490Z"}
{"uuid":"facf386f-9e63-446c-8844-3f2be9d85ee8","level":"warn","message":"middle","service":"cronjob","timestamp":"2024-03-22T15:57:39.492Z"}
{"uuid":"facf386f-9e63-446c-8844-3f2be9d85ee8","level":"error","message":"end","service":"cronjob","timestamp":"2024-03-22T15:57:39.493Z"}
```

This can be useful for many cases:

-   Adding results from a database query:

```js
const realities = await query('SELECT reality from realities');
setLogMetadata('realities', { realities });
```

-   Adding results from an HTTP request:

```js
const realities = await fetch('https://some_api/api/realities');
setLogMetadata('realities', { realities });
```

-   Simply adding static data, but in a further point of your logic. For example after your code reaches a specific class, you would like to mark which entity is being processed.
