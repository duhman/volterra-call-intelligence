'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PhoneIncoming, PhoneOutgoing, Clock, Calendar } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { getStatusBadgeVariant, getStatusLabel } from '@/lib/utils/call-status';

interface Call {
  from_number: string;
  to_number: string;
  direction?: 'inbound' | 'outbound';
  transcription_status: string;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  agent_user_id?: string;
}

interface CallHeaderProps {
  call: Call;
}

export function CallHeader({ call }: CallHeaderProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            {/* Direction and Numbers */}
            <div className="flex items-center gap-3">
              {call.direction === 'inbound' ? (
                <PhoneIncoming className="h-6 w-6 text-blue-600" />
              ) : (
                <PhoneOutgoing className="h-6 w-6 text-green-600" />
              )}
              <div>
                <h2 className="text-2xl font-bold">
                  {call.from_number} → {call.to_number}
                </h2>
                <p className="text-sm text-muted-foreground capitalize">
                  {call.direction || 'Unknown'} call
                </p>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {call.agent_user_id && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Agent:</span>
                  {call.agent_user_id}
                </div>
              )}
              {call.duration_seconds && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {Math.floor(call.duration_seconds / 60)}:
                    {(call.duration_seconds % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDistanceToNow(new Date(call.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>

            {/* Timestamps */}
            {(call.started_at || call.ended_at) && (
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {call.started_at && (
                  <div>
                    <span className="font-medium">Started:</span>{' '}
                    {format(new Date(call.started_at), 'PPp')}
                  </div>
                )}
                {call.ended_at && (
                  <div>
                    <span className="font-medium">Ended:</span>{' '}
                    {format(new Date(call.ended_at), 'PPp')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status Badge */}
          <Badge variant={getStatusBadgeVariant(call.transcription_status)} className="text-base px-3 py-1">
            {getStatusLabel(call.transcription_status)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
