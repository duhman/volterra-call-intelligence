'use client';

import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useCall } from '@/hooks/useAdminQueries';
import { useCallsRealtime } from '@/hooks/useCallsRealtime';
import { CallHeader } from '@/components/call-detail/CallHeader';
import { TranscriptionSection } from '@/components/call-detail/TranscriptionSection';
import { SummarySection } from '@/components/call-detail/SummarySection';
import { HubSpotSection } from '@/components/call-detail/HubSpotSection';
import { ErrorSection } from '@/components/call-detail/ErrorSection';
import { CallDetailActions } from '@/components/call-detail/CallDetailActions';

export default function CallDetailPage() {
  const params = useParams();
  const callId = params.id as string;

  // Fetch call with TanStack Query
  const { data: call, isLoading, error } = useCall(callId);

  // Enable real-time updates for this specific call
  useCallsRealtime(callId);

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/calls">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Calls
            </Button>
          </Link>
        </div>
        <div className="text-center py-12">
          <p className="text-lg font-medium">Failed to load call</p>
          <p className="text-sm text-muted-foreground mt-2">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/calls">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Calls
            </Button>
          </Link>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/calls">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Calls
            </Button>
          </Link>
        </div>
        <div className="text-center py-12">
          <p className="text-lg font-medium">Call not found</p>
        </div>
      </div>
    );
  }

  // Extract summary data from call object
  const transcription = call.transcription || call.transcript || null;
  const summary = call.summary || call.ai_summary || null;
  const keyPoints = call.key_points || null;
  const nextSteps = call.next_steps || null;
  const sentiment = call.sentiment || null;

  return (
    <div className="space-y-8">
      {/* Header with Back Button and Actions */}
      <div className="flex items-center justify-between">
        <Link href="/calls">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calls
          </Button>
        </Link>
        <CallDetailActions
          callId={callId}
          status={call.transcription_status || call.status}
          isHubSpotContact={!!call.hubspot_contact_id}
          hubspotSynced={!!call.hubspot_synced_at}
        />
      </div>

      {/* Call Header */}
      <CallHeader call={call} />

      {/* Error Section (if any) */}
      <ErrorSection error={call.last_error || call.error} errorTimestamp={call.error_timestamp} />

      {/* Transcription */}
      <TranscriptionSection transcript={transcription} transcriptData={call.transcript_data} />

      {/* AI Summary */}
      <SummarySection
        summary={summary}
        keyPoints={keyPoints}
        nextSteps={nextSteps}
        sentiment={sentiment}
      />

      {/* HubSpot Contact Info */}
      <HubSpotSection
        contactId={call.hubspot_contact_id}
        contactName={call.hubspot_contact_name}
        syncedAt={call.hubspot_synced_at}
      />
    </div>
  );
}
