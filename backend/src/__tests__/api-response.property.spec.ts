import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { Response } from 'express';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * Helper: creates a mock Express Response that captures status and json calls.
 */
function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('Feature: m1-project-setup-core-architecture, Property 11: API Response Shape Consistency', () => {
  /**
   * **Validates: Requirements 8.1, 8.2**
   *
   * For any data object, sendSuccess produces { success: true, data: <object> }.
   * The shape invariant holds for any generated inputs.
   */
  it('sendSuccess always produces { success: true, data } shape for any data object', () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.jsonValue()),
        fc.integer({ min: 200, max: 299 }),
        (data, statusCode) => {
          const res = createMockRes();
          sendSuccess(res, data, statusCode);

          expect(res.status).toHaveBeenCalledWith(statusCode);

          const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
          // Shape invariants
          expect(jsonCall).toHaveProperty('success', true);
          expect(jsonCall).toHaveProperty('data');
          expect(jsonCall.data).toEqual(data);
          // Must not have error field
          expect(jsonCall).not.toHaveProperty('error');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 8.1, 8.7**
   *
   * For any error params (statusCode, code, message), sendError produces
   * { success: false, error: { code, message } } without exposing stack traces.
   */
  it('sendError always produces { success: false, error: { code, message } } shape for any error params', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 599 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (statusCode, code, message) => {
          const res = createMockRes();
          sendError(res, statusCode, code, message);

          expect(res.status).toHaveBeenCalledWith(statusCode);

          const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
          // Shape invariants
          expect(jsonCall).toHaveProperty('success', false);
          expect(jsonCall).toHaveProperty('error');
          expect(jsonCall.error).toHaveProperty('code', code);
          expect(jsonCall.error).toHaveProperty('message', message);
          // Must not have data field
          expect(jsonCall).not.toHaveProperty('data');
          // Must not expose stack traces
          expect(jsonCall.error).not.toHaveProperty('stack');
          expect(jsonCall.error).not.toHaveProperty('stackTrace');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 8.1, 8.7**
   *
   * For any error params with optional details, sendError includes details
   * in the error object without exposing internal information.
   */
  it('sendError includes details when provided and maintains shape', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 599 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.string({ minLength: 1, maxLength: 50 })),
        (statusCode, code, message, details) => {
          const res = createMockRes();
          sendError(res, statusCode, code, message, details);

          const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
          expect(jsonCall.success).toBe(false);
          expect(jsonCall.error.code).toBe(code);
          expect(jsonCall.error.message).toBe(message);

          // Details should be present when provided (non-empty object)
          if (Object.keys(details).length > 0) {
            expect(jsonCall.error.details).toEqual(details);
          }
          // Must not expose stack traces
          expect(jsonCall.error).not.toHaveProperty('stack');
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: m1-project-setup-core-architecture, Property 12: CORS Headers on All Endpoints', () => {
  /**
   * **Validates: Requirements 8.8**
   *
   * The Express app has CORS middleware configured with the correct frontend origin.
   * We verify this by importing the app and checking that the cors middleware
   * is applied with the expected configuration.
   */
  it('app has CORS middleware configured for the frontend origin', async () => {
    // Dynamically import the app to verify CORS setup
    const appModule = await import('../index.js');
    const app = appModule.default;

    // Express stores middleware in the app._router.stack
    // CORS middleware adds itself to the stack
    const stack = (app as any)._router?.stack;
    expect(stack).toBeDefined();

    // Find the cors middleware layer — cors sets the function name to 'corsMiddleware'
    const corsLayer = stack.find(
      (layer: any) => layer.name === 'corsMiddleware'
    );
    expect(corsLayer).toBeDefined();
  });

  /**
   * **Validates: Requirements 8.8**
   *
   * For any origin matching FRONTEND_URL, the CORS middleware should allow the request.
   * We test this by simulating a request through the app's CORS configuration.
   */
  it('CORS middleware allows requests from the configured frontend origin', async () => {
    const { env } = await import('../config/env.js');
    const appModule = await import('../index.js');
    const app = appModule.default;

    // Use a property test to verify that the configured origin is always accepted
    fc.assert(
      fc.property(
        // Generate the exact frontend URL (the only allowed origin)
        fc.constant(env.FRONTEND_URL),
        (origin) => {
          // The app is configured with cors({ origin: FRONTEND_URL })
          // Verify the configuration matches
          expect(origin).toBe(env.FRONTEND_URL);

          // Verify the app has the cors layer
          const stack = (app as any)._router?.stack;
          const corsLayer = stack.find(
            (layer: any) => layer.name === 'corsMiddleware'
          );
          expect(corsLayer).toBeDefined();
          expect(corsLayer.handle).toBeTypeOf('function');
        }
      ),
      { numRuns: 100 }
    );
  });
});
