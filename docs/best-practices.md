# Best Practices

## Server Logger

1. **Configure Default Metadata Early**: Set up `defaultMetadata` when creating the logger so it's available on every log entry:
   ```js
   const logger = createLogger({
       defaultMetadata: {
           serviceName: 'api-service',
           environment: process.env.NODE_ENV
       }
   });
   ```

2. **Use Meaningful Log Levels**: Choose the appropriate level for each log:
   - `error`: Critical failures that need attention
   - `warn`: Recoverable issues or unusual situations
   - `info`: Important event information (request start/end, user actions)
   - `debug`: Detailed information for development/debugging
   - `verbose`: Very detailed trace logs

3. **Redact Secrets Proactively**: Always configure `redactValues` for sensitive data:
   ```js
   const logger = createLogger({
       redactValues: [
           process.env.API_KEY,
           process.env.DATABASE_URL,
           process.env.JWT_SECRET
       ]
   });
   ```

4. **Use Request Context in Middleware**: Leverage framework integration to automatically attach request metadata across all logs, avoiding manual metadata passing.

5. **Set Metadata Once Per Request**: In web frameworks, use `customProps` to extract user/request info once in middleware rather than passing it to every log call.

## Client Logger

1. **Initialize Early**: Call `Logger.initialize()` in your application entry point before logging anything.

2. **Configure `getUserData` for Tracking**: Provide user-specific data for easier log analysis:
   ```js
   Logger.initialize('https://api.example.com', {
       getUserData: () => ({
           userId: getCurrentUserId(),
           sessionId: getSessionId(),
           userRole: getCurrentUserRole()
       })
   });
   ```

3. **Batch Size and Interval Trade-offs**:
   - Small `bufferSize` (e.g., 5): Lower latency, more requests
   - Large `bufferSize` (e.g., 50): Higher latency, fewer requests
   - Short `bufferFlushInterval` (e.g., 10): Lower latency, more frequent flushes
   - Long `bufferFlushInterval` (e.g., 60): Fewer requests, possible longer wait

4. **Structured Metadata**: Pass structured metadata with your logs for better analyzability:
   ```js
   Logger.error('Payment failed', {
       orderId: order.id,
       amount: order.total,
       processor: 'stripe',
       errorCode: error.code
   });
   ```

## NestJS-Specific Tips

1. **Use Constructor Injection**: Inject the logger into your services:
   ```ts
   export class UserService {
       constructor(private logger: Logger) {}

       async findUser(id: string) {
           this.logger.info('Finding user', { userId: id });
       }
   }
   ```

2. **Combine with Nest's Built-in Logger**: The integration works seamlessly with NestJS's logger module.

3. **GraphQL Support**: The logger works with both REST and GraphQL resolvers in NestJS.
