# Troubleshooting

## Server Logger not capturing logs

1. Check `minLogLevel` - logs below this level are ignored
2. Verify the logger instance is being used consistently
3. Ensure middleware is applied before route handlers

## Client logs not reaching the server

1. Verify `Logger.initialize()` was called before any logging
2. Check network tab for failed fetch requests to the log endpoint
3. Ensure the server endpoint matches the `logEndpoint` configuration
4. Check for CORS issues - the logger uses `credentials: 'include'`

## Metadata not appearing in logs

1. Ensure a log context is established (via `attachLogContext` or framework integration)
2. Call `setLogMetadata()` within an active context
3. Verify metadata is set before logging (metadata is included at log time, not retroactively)

## Redacted values appearing in logs

1. Ensure secrets are in the `redactValues` array
2. Note that redaction is substring-based - make sure the exact string is configured
3. Empty strings in `redactValues` are filtered out automatically
