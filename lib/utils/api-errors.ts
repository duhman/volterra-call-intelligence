/**
 * Standardized API error handling utilities
 * Provides consistent error responses across all API routes
 */

export interface ApiError {
  message: string
  code?: string
  details?: unknown
  statusCode: number
}

export class ApiErrorResponse extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'ApiErrorResponse'
  }

  toJSON(): ApiError {
    return {
      message: this.message,
      code: this.code,
      details: this.details,
      statusCode: this.statusCode,
    }
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  statusCode: number,
  message: string,
  code?: string,
  details?: unknown
): ApiErrorResponse {
  return new ApiErrorResponse(statusCode, message, code, details)
}

/**
 * Common error responses
 */
export const ApiErrors = {
  badRequest: (message = 'Bad request', details?: unknown) =>
    createErrorResponse(400, message, 'BAD_REQUEST', details),
  unauthorized: (message = 'Unauthorized', details?: unknown) =>
    createErrorResponse(401, message, 'UNAUTHORIZED', details),
  forbidden: (message = 'Forbidden', details?: unknown) =>
    createErrorResponse(403, message, 'FORBIDDEN', details),
  notFound: (message = 'Not found', details?: unknown) =>
    createErrorResponse(404, message, 'NOT_FOUND', details),
  conflict: (message = 'Conflict', details?: unknown) =>
    createErrorResponse(409, message, 'CONFLICT', details),
  rateLimited: (message = 'Rate limit exceeded', details?: unknown) =>
    createErrorResponse(429, message, 'RATE_LIMITED', details),
  internalServerError: (message = 'Internal server error', details?: unknown) =>
    createErrorResponse(500, message, 'INTERNAL_SERVER_ERROR', details),
  badGateway: (message = 'Bad gateway', details?: unknown) =>
    createErrorResponse(502, message, 'BAD_GATEWAY', details),
  serviceUnavailable: (message = 'Service unavailable', details?: unknown) =>
    createErrorResponse(503, message, 'SERVICE_UNAVAILABLE', details),
  gatewayTimeout: (message = 'Gateway timeout', details?: unknown) =>
    createErrorResponse(504, message, 'GATEWAY_TIMEOUT', details),
}

/**
 * Handle errors in API routes and return appropriate responses
 */
export function handleApiError(error: unknown): {
  statusCode: number
  body: ApiError
} {
  // Handle our custom API errors
  if (error instanceof ApiErrorResponse) {
    return {
      statusCode: error.statusCode,
      body: error.toJSON(),
    }
  }

  // Handle known error types
  if (error instanceof Error) {
    // Check for HTTP status codes in error messages or properties
    const statusCodeMatch = error.message.match(/status[:\s]+(\d{3})/i)
    const statusCode = statusCodeMatch
      ? parseInt(statusCodeMatch[1], 10)
      : 500

    return {
      statusCode,
      body: {
        message: error.message,
        code: error.name,
        statusCode,
      },
    }
  }

  // Unknown error type
  return {
    statusCode: 500,
    body: {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
    },
  }
}

/**
 * Log error with context for debugging
 */
export function logApiError(
  error: unknown,
  context?: {
    route?: string
    method?: string
    userId?: string
    [key: string]: unknown
  }
): void {
  const errorDetails = error instanceof Error ? {
    message: error.message,
    stack: error.stack,
    name: error.name,
  } : { error: String(error) }

  console.error('[API Error]', {
    ...errorDetails,
    ...context,
    timestamp: new Date().toISOString(),
  })
}
