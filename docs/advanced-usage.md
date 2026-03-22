# Advanced Usage

## Initializing a Log Metadata Context

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

## Adding Metadata Dynamically

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

## Metadata Merging

When you set metadata with the same key multiple times, the values are merged (not replaced) using deep merging. This allows you to progressively build up metadata:

```js
setLogMetadata('user', { id: '123', name: 'John' });
setLogMetadata('user', { email: 'john@example.com' });
// Result: { user: { id: '123', name: 'John', email: 'john@example.com' } }
```

## Common Use Cases

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

## Retrieving Current Log Metadata

To retrieve the current metadata associated with the active log context, you can import the internal `getLogMetadata` function via a direct import:

```js
import { getLogMetadata } from '@yagelhayun/logger/server/logger/metadata';

const main = () => {
	setLogMetadata('userId', '123');
	setLogMetadata('action', 'login');

	// Get all accumulated metadata
	const metadata = getLogMetadata();
	console.log(metadata); // { userId: '123', action: 'login' }
};

attachLogContext(main);
```

**Note:** This function is intended for advanced scenarios. Most use cases should rely on logging directly via `logger.info()` etc., which automatically includes all context metadata.
