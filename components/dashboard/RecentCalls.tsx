'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { getStatusBadgeVariant, getStatusLabel } from '@/lib/utils/call-status';

interface Call {
  id: string;
  from_number: string;
  to_number: string;
  agent_user_id?: string;
  transcription_status: string;
  created_at: string;
}

interface RecentCallsProps {
  calls?: Call[];
  isLoading?: boolean;
}

export function RecentCalls({ calls, isLoading }: RecentCallsProps) {
  // Show loading state if explicitly loading OR if we don't have data yet
  const showLoading = isLoading || calls === undefined;

  return (
    <Card data-testid="recent-calls">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Calls</CardTitle>
        <Link
          href="/calls"
          className="text-sm text-accent hover:text-accent font-medium"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {showLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : calls && calls.length > 0 ? (
          <div className="space-y-4">
            {calls.map((call) => (
              <Link
                key={call.id}
                href={`/calls/${call.id}`}
                className="flex items-center justify-between hover:bg-accent/50 rounded-lg p-2 -mx-2 transition-colors"
                data-testid="call-row"
              >
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium" data-testid="call-from">
                    {call.from_number} → <span data-testid="call-to">{call.to_number}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {call.agent_user_id || 'Unknown agent'} •{' '}
                    {formatDistanceToNow(new Date(call.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <Badge variant={getStatusBadgeVariant(call.transcription_status)} data-testid="call-status">
                  {getStatusLabel(call.transcription_status)}
                </Badge>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm font-medium text-muted-foreground">No calls recorded yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a call from HubSpot to see activity here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
