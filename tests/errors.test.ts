import { describe, it, expect } from 'vitest';
import { errorReplacer } from '../lib/server/logger/errors';
import { createTestLogger } from './helpers';

const serialize = (value: unknown) =>
	JSON.parse(JSON.stringify({ err: value }, errorReplacer)).err;

describe('errorReplacer', () => {
	it('passes through non-Error values unchanged', () => {
		expect(serialize('hello')).toBe('hello');
		expect(serialize(42)).toBe(42);
		expect(serialize(null)).toBeNull();
		expect(serialize({ foo: 'bar' })).toEqual({ foo: 'bar' });
	});

	it('serializes a basic Error with message, stack, and type', () => {
		const err = new Error('something failed');
		const result = serialize(err);

		expect(result.message).toBe('something failed');
		expect(result.stack).toContain('something failed');
		expect(result.type).toBe('Error');
	});

	it('uses the constructor name for the type field', () => {
		class DatabaseError extends Error {}
		const result = serialize(new DatabaseError('db failed'));
		expect(result.type).toBe('DatabaseError');
	});

	it('includes custom enumerable properties on the error', () => {
		const err = Object.assign(new Error('oops'), { code: 'ENOENT', statusCode: 404 });
		const result = serialize(err);

		expect(result.code).toBe('ENOENT');
		expect(result.statusCode).toBe(404);
	});

	it('serializes an AggregateError with child errors', () => {
		const child1 = new Error('child one');
		const child2 = new Error('child two');
		const agg = new AggregateError([child1, child2], 'multiple failures');
		const result = serialize(agg);

		expect(result.message).toBe('multiple failures');
		expect(result.type).toBe('AggregateError');
		expect(result.errors).toHaveLength(2);
		expect(result.errors[0].message).toBe('child one');
		expect(result.errors[0].stack).toBeDefined();
		expect(result.errors[0].type).toBe('Error');
		expect(result.errors[1].message).toBe('child two');
	});

	it('preserves custom properties on child errors of an AggregateError', () => {
		const child = Object.assign(new Error('child'), { code: 'TIMEOUT' });
		const agg = new AggregateError([child], 'agg');
		const result = serialize(agg);

		expect(result.errors[0].code).toBe('TIMEOUT');
	});

	it('recursively handles nested AggregateErrors', () => {
		const leaf = new Error('leaf');
		const inner = new AggregateError([leaf], 'inner agg');
		const outer = new AggregateError([inner], 'outer agg');
		const result = serialize(outer);

		expect(result.errors[0].type).toBe('AggregateError');
		expect(result.errors[0].errors[0].message).toBe('leaf');
	});

	it('handles an AggregateError with non-Error items in errors array', () => {
		const agg = new AggregateError(['string error', 42], 'mixed');
		const result = serialize(agg);

		expect(result.errors[0]).toBe('string error');
		expect(result.errors[1]).toBe(42);
	});

	it('does not serialize Error.cause (non-enumerable in V8)', () => {
		const cause = new Error('root cause');
		const err = new Error('outer', { cause });
		const result = serialize(err);

		// Error.cause is non-enumerable in V8, so it is not captured by { ...value }
		expect(result.cause).toBeUndefined();
	});
});

describe('errorFormatter (via logger)', () => {
	it('adds type and child errors when an AggregateError is passed directly to the logger', () => {
		const { logger, capture } = createTestLogger();

		const errors = [new Error('api is down'), new Error('body is missing')];
		const agg = new AggregateError(errors, 'switchover failed');
		logger.error('something happened', agg);

		const log = capture.getLogs()[0] as any;

		expect(log.type).toBe('AggregateError');
		expect(log.errors).toHaveLength(2);
		expect(log.errors[0].message).toBe('api is down');
		expect(log.errors[0].type).toBe('Error');
		expect(log.errors[1].message).toBe('body is missing');
	});

	it('adds type when a plain Error is passed directly to the logger', () => {
		const { logger, capture } = createTestLogger();

		logger.error('oops', new Error('something failed'));
		const log = capture.getLogs()[0] as any;

		expect(log.type).toBe('Error');
	});

	it('includes custom enumerable properties from the error', () => {
		const { logger, capture } = createTestLogger();

		const err = Object.assign(new Error('db failed'), { code: 'ECONNREFUSED' });
		logger.error('db error', err);
		const log = capture.getLogs()[0] as any;

		expect(log.code).toBe('ECONNREFUSED');
	});

	it('serializes errors nested inside metadata via errorReplacer', () => {
		const { logger, capture } = createTestLogger();

		logger.error('something happened', { cause: new Error('root cause') });

		// errorReplacer runs inside format.json — it affects the JSON string output,
		// not the raw info object. Parse the [MESSAGE] symbol to assert the result.
		const raw = capture.getLogs()[0] as any;
		const json = JSON.parse(raw[Symbol.for('message')]);

		expect(json.cause.message).toBe('root cause');
		expect(json.cause.type).toBe('Error');
	});
});
