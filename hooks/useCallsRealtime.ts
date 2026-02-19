'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/hooks/use-toast';

/**
 * Real-time subscriptions hook for call updates
 *
 * Subscribes to telavox_call_sessions table changes and:
 * - Invalidates React Query cache for calls, stats, and recent calls
 * - Shows toast notifications for important status changes
 * - Supports optional callId filter for detail pages
 *
 * @param callId - Optional call ID to filter subscription (for detail pages)
 */
export function useCallsRealtime(callId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Use shared Supabase client with schema configuration
    const supabase = createClient();

    // Build subscription query
    const subscription = supabase
      .channel(`calls-realtime${callId ? `-${callId}` : ''}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'call_intelligence',
          table: 'telavox_call_sessions',
          filter: callId ? `id=eq.${callId}` : undefined,
        },
        (payload) => {
          console.log('[Realtime] Call update received:', payload);

          // Invalidate all call-related queries
          queryClient.invalidateQueries({ queryKey: ['calls'] });
          queryClient.invalidateQueries({ queryKey: ['stats'] });
          queryClient.invalidateQueries({ queryKey: ['recentCalls'] });

          // If filtering by callId, invalidate specific call query
          if (callId) {
            queryClient.invalidateQueries({ queryKey: ['call', callId] });
          }

          // Show toast notifications for important status changes
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newRecord = payload.new as any;
            const oldRecord = payload.old as any;

            // Only show notifications if status actually changed
            const statusChanged = !oldRecord || newRecord.transcription_status !== oldRecord.transcription_status;

            if (statusChanged && newRecord.transcription_status) {
              switch (newRecord.transcription_status) {
                case 'completed':
                  toast({
                    title: 'Transcription completed',
                    description: `Call from ${newRecord.from_number || 'unknown'} has been transcribed.`,
                  });
                  break;
                case 'failed':
                  toast({
                    title: 'Transcription failed',
                    description: newRecord.last_error || 'An error occurred during transcription.',
                    variant: 'destructive',
                  });
                  break;
                case 'processing':
                  // Only show for new calls, not updates
                  if (payload.eventType === 'INSERT') {
                    toast({
                      title: 'New call received',
                      description: `Processing call from ${newRecord.from_number || 'unknown'}...`,
                    });
                  }
                  break;
              }
            }

            // Show notification for HubSpot sync completion
            if (newRecord.hubspot_contact_id && (!oldRecord || !oldRecord.hubspot_contact_id)) {
              toast({
                title: 'HubSpot sync completed',
                description: 'Call has been synced to HubSpot CRM.',
              });
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to call updates', callId ? `for call ${callId}` : '(all calls)');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Subscription error:', err);
          // Log more details for debugging
          if (err) {
            console.error('[Realtime] Error details:', {
              message: err.message,
              error: err,
            });
          }
        } else if (status === 'TIMED_OUT') {
          console.warn('[Realtime] Subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('[Realtime] Subscription closed');
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('[Realtime] Unsubscribing from call updates');
      supabase.removeChannel(subscription);
    };
  }, [callId, queryClient]);
}
