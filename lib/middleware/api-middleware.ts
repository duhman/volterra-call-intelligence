/**
 * API Route Middleware
 * Provides rate limiting, request validation, and consistent response formatting
 */

import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { ApiErrors, handleApiError, logApiError } from '@/lib/utils/api-errors'

// Initialize rate limiter (only if Redis is configured)
let rateLimiter: Ratelimit | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  rateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
    analytics: true,
    prefix: '@call-intelligence/api',
  })
}

/**
 * Rate limiting middleware
 * Returns null if request should proceed, or NextResponse if rate limited
 */
export async function withRateLimit(
  request: NextRequest,
  identifier?: string
): Promise<NextResponse | null> {
  // Skip rate limiting if not configured
  if (!rateLimiter) {
    return null
  }

  // Use provided identifier or fall back to IP address from headers
  const id = identifier || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'

  try {
    const { success, limit, remaining, reset } = await rateLimiter.limit(id)

    if (!success) {
      const error = ApiErrors.rateLimited('Rate limit exceeded', {
        limit,
        remaining,
        reset: new Date(reset).toISOString(),
      })

      return NextResponse.json(error.toJSON(), {
        status: error.statusCode,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      })
    }

    // Add rate limit headers to successful requests
    return null // Request can proceed
  } catch (error) {
    // If rate limiting fails, log but don't block the request
    logApiError(error, { middleware: 'rate-limit' })
    return null
  }
}

/**
 * Error handling wrapper for API routes
 */
export function withErrorHandling<T>(
  handler: (request: NextRequest, ...args: unknown[]) => Promise<T>
) {
  return async (request: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    try {
      const result = await handler(request, ...args)

      // If handler returns a NextResponse, return it directly
      if (result instanceof NextResponse) {
        return result
      }

      // Otherwise, wrap in JSON response
      return NextResponse.json(result)
    } catch (error) {
      logApiError(error, {
        route: request.nextUrl.pathname,
        method: request.method,
      })

      const { statusCode, body } = handleApiError(error)

      return NextResponse.json(body, {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }
  }
}

/**
 * Request validation helper
 */
export function validateRequest<T>(
  request: NextRequest,
  _validator: (body: unknown) => body is T
): T | NextResponse {
  try {
    // Note: This assumes JSON body, adjust for other content types
    const contentType = request.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      return NextResponse.json(
        ApiErrors.badRequest('Content-Type must be application/json').toJSON(),
        { status: 400 }
      )
    }

    // Body parsing will be done by the route handler
    // This is just a type guard helper
    return null as unknown as T // Placeholder - actual validation happens in route
  } catch (error) {
    return NextResponse.json(
      ApiErrors.badRequest('Invalid request body').toJSON(),
      { status: 400 }
    )
  }
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  reset: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString())
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  response.headers.set('X-RateLimit-Reset', reset.toString())
  return response
}
