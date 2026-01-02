import { NextResponse } from 'next/server';

/**
 * Custom API Error class for consistent error handling
 *
 * Usage:
 * ```typescript
 * throw new APIError(400, 'Invalid input');
 * ```
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Centralized error handler for API routes
 *
 * Handles different error types and returns appropriate responses:
 * - APIError: Custom errors with status codes
 * - 'UNAUTHORIZED' errors: 401 responses
 * - 'FORBIDDEN' errors: 403 responses
 * - Other errors: 500 Internal Server Error
 *
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   try {
 *     // Route logic here
 *   } catch (error) {
 *     return handleAPIError(error);
 *   }
 * }
 * ```
 *
 * @param error - Error object to handle
 * @returns NextResponse with appropriate status code and message
 */
export function handleAPIError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // Handle custom API errors
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.message,
        statusCode: error.statusCode
      },
      { status: error.statusCode }
    );
  }

  // Handle auth/permission errors from api-auth helpers
  if (error instanceof Error) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Authentication required'
        },
        { status: 401 }
      );
    }

    if (error.message === 'FORBIDDEN') {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Insufficient permissions'
        },
        { status: 403 }
      );
    }

    // Handle other known errors
    return NextResponse.json(
      {
        error: 'Server Error',
        message: error.message
      },
      { status: 500 }
    );
  }

  // Handle unknown errors
  return NextResponse.json(
    {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    },
    { status: 500 }
  );
}

/**
 * Validation error factory
 *
 * Usage:
 * ```typescript
 * if (!imei) {
 *   throw validationError('IMEI is required');
 * }
 * ```
 */
export function validationError(message: string): APIError {
  return new APIError(400, message);
}

/**
 * Not found error factory
 *
 * Usage:
 * ```typescript
 * if (!device) {
 *   throw notFoundError('Device not found');
 * }
 * ```
 */
export function notFoundError(message: string = 'Resource not found'): APIError {
  return new APIError(404, message);
}

/**
 * Conflict error factory
 *
 * Usage:
 * ```typescript
 * if (existingDevice) {
 *   throw conflictError('Device with this IMEI already exists');
 * }
 * ```
 */
export function conflictError(message: string): APIError {
  return new APIError(409, message);
}

/**
 * Unauthorized error factory
 *
 * Usage:
 * ```typescript
 * if (!isValidToken) {
 *   throw unauthorizedError('Invalid authentication token');
 * }
 * ```
 */
export function unauthorizedError(message: string = 'Authentication required'): APIError {
  return new APIError(401, message);
}

/**
 * Forbidden error factory
 *
 * Usage:
 * ```typescript
 * if (!userHasPermission) {
 *   throw forbiddenError('You do not have permission to perform this action');
 * }
 * ```
 */
export function forbiddenError(message: string = 'Access denied'): APIError {
  return new APIError(403, message);
}
