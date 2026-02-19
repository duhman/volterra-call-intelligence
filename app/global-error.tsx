'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Global application error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            Something went wrong
          </h1>
          <p style={{ marginBottom: '2rem', color: '#666' }}>
            An unexpected error occurred. Please try again.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#000',
                color: '#fff',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#fff',
                color: '#000',
                border: '1px solid #ccc',
                borderRadius: '0.25rem',
                cursor: 'pointer',
              }}
            >
              Go home
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && error.message && (
            <pre style={{
              marginTop: '2rem',
              padding: '1rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '0.25rem',
              fontSize: '0.875rem',
              maxWidth: '100%',
              overflow: 'auto',
            }}>
              {error.message}
              {error.digest && `\nError ID: ${error.digest}`}
            </pre>
          )}
        </div>
      </body>
    </html>
  )
}
