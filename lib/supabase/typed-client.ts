/**
 * Typed Supabase Client Helper
 * Provides type-safe access to Supabase tables with custom schema
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

type Schema = Database['call_intelligence']

/**
 * Get typed table accessor for a Supabase client
 * This allows us to access tables with proper typing while using custom schema
 */
export function getTypedTable<T extends keyof Schema['Tables']>(
  client: SupabaseClient<Database>,
  tableName: T
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from(tableName)
}

/**
 * Type-safe Supabase client wrapper
 * Provides typed access to tables in the call_intelligence schema
 */
export type TypedSupabaseClient = SupabaseClient<Database> & {
  from<T extends keyof Schema['Tables']>(
    table: T
  ): ReturnType<SupabaseClient<Database>['from']>
}

/**
 * Helper to create a typed query builder
 * This is a workaround for Supabase's schema typing limitations
 */
export function typedQuery<T extends keyof Schema['Tables']>(
  client: SupabaseClient<Database>,
  table: T
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (client as any).from(table)
}
