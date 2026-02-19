/**
 * HubSpot API Rate Limiter
 * Tracks rate limit state from API response headers and provides backoff guidance
 * Uses in-memory cache for header-based tracking (complements Upstash for request limiting)
 */
interface RateLimitInfo {
  remaining: number
  reset: number
  secondaryRemaining?: number
  secondaryReset?: number
}

class RateLimiter {
  private rateLimitInfo: Map<string, RateLimitInfo> = new Map()

  /**
   * Update rate limit info from API response headers
   */
  updateFromHeaders(headers: Record<string, string | undefined>): void {
    const remaining = parseInt(
      headers['x-hubspot-ratelimit-remaining'] || headers['ratelimit-remaining'] || '0',
      10
    )
    const reset = parseInt(
      headers['x-hubspot-ratelimit-reset'] || headers['ratelimit-reset'] || '0',
      10
    )
    const secondaryRemaining = parseInt(
      headers['x-hubspot-ratelimit-secondly-remaining'] || '0',
      10
    )
    const secondaryReset = parseInt(
      headers['x-hubspot-ratelimit-secondly-reset'] || '0',
      10
    )

    const endpoint = this.getCurrentEndpoint()

    this.rateLimitInfo.set(endpoint, {
      remaining,
      reset,
      secondaryRemaining: secondaryRemaining > 0 ? secondaryRemaining : undefined,
      secondaryReset: secondaryReset > 0 ? secondaryReset : undefined,
    })

    if (remaining < 10) {
      console.warn(
        `HubSpot rate limit warning: ${remaining} requests remaining until ${new Date(reset * 1000).toISOString()}`
      )
    }
  }

  /**
   * Check if rate limited based on cached header info
   */
  isRateLimited(): boolean {
    const endpoint = this.getCurrentEndpoint()
    const info = this.rateLimitInfo.get(endpoint)

    if (!info) {
      return false
    }

    const now = Math.floor(Date.now() / 1000)
    if (info.remaining > 0 && info.reset > now) {
      return false
    }

    // Check secondary rate limit (per-second)
    if (
      info.secondaryRemaining !== undefined &&
      info.secondaryRemaining <= 0 &&
      info.secondaryReset &&
      info.secondaryReset > now
    ) {
      return true
    }

    return info.remaining <= 0 && info.reset > now
  }

  /**
   * Get time until rate limit resets (in milliseconds)
   */
  getResetTime(): number {
    const endpoint = this.getCurrentEndpoint()
    const info = this.rateLimitInfo.get(endpoint)

    if (!info) {
      return 0
    }

    const now = Math.floor(Date.now() / 1000)
    const primaryResetMs = Math.max(0, (info.reset - now) * 1000)
    const secondaryResetMs = info.secondaryReset
      ? Math.max(0, (info.secondaryReset - now) * 1000)
      : 0

    return Math.max(primaryResetMs, secondaryResetMs) + 100 // Add small buffer
  }

  /**
   * Get recommended wait time before next request
   */
  getRecommendedWaitTime(): number {
    if (!this.isRateLimited()) {
      return 0
    }

    return this.getResetTime()
  }

  /**
   * Get current rate limit status
   */
  getStatus(endpoint?: string): { remaining: number; reset: number; isLimited: boolean } | null {
    const key = endpoint || this.getCurrentEndpoint()
    const info = this.rateLimitInfo.get(key)

    if (!info) {
      return null
    }

    return {
      remaining: info.remaining,
      reset: info.reset,
      isLimited: this.isRateLimited(),
    }
  }

  /**
   * Clear cached rate limit info
   */
  clear(): void {
    this.rateLimitInfo.clear()
  }

  /**
   * Get current endpoint (placeholder - would be enhanced in real implementation)
   */
  private getCurrentEndpoint(): string {
    return 'hubspot-api'
  }
}

export const rateLimiter = new RateLimiter()

/**
 * Helper to wait for rate limit to reset
 */
export async function waitForRateLimitReset(maxWaitMs: number = 60000): Promise<void> {
  const waitTime = Math.min(rateLimiter.getRecommendedWaitTime(), maxWaitMs)

  if (waitTime > 0) {
    console.info(`Rate limited. Waiting ${waitTime}ms before retrying...`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }
}

/**
 * Decorator/wrapper to handle rate limiting
 */
export async function withRateLimitHandling<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      const isRateLimit = (error as { statusCode?: number; status?: number })?.statusCode === 429 || (error as { statusCode?: number; status?: number })?.status === 429

      if (!isRateLimit || attempt === maxRetries) {
        throw error
      }

      // Calculate wait time
      const waitTime = (error as { headers?: Record<string, string> })?.headers?.['retry-after']
        ? parseInt((error as { headers?: Record<string, string> }).headers!['retry-after']) * 1000
        : Math.min(1000 * Math.pow(2, attempt - 1), 30000)

      console.warn(`Rate limited. Attempt ${attempt}/${maxRetries}. Waiting ${waitTime}ms...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  throw new Error('Max retries exceeded')
}

