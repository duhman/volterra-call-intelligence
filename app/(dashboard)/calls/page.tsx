'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Search,
  Users,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useCalls } from '@/hooks/useAdminQueries';
import { useCallsRealtime } from '@/hooks/useCallsRealtime';
import { BulkActions } from '@/components/calls/BulkActions';
import { CallActions } from '@/components/calls/CallActions';
import { useDebounce } from '@/hooks/useDebounce';
import { getStatusBadgeVariant, getStatusLabel } from '@/lib/utils/call-status';
import { Pagination } from '@/components/ui/pagination';

interface Call {
  id: string;
  from_number: string;
  to_number: string;
  direction?: 'inbound' | 'outbound';
  transcription_status: string;
  created_at: string;
  duration_seconds?: number;
  agent_user_id?: string;
  hubspot_contact_id?: string;
  hubspot_synced_at?: string;
}

export default function CallsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  // Debounce search to avoid too many requests
  const debouncedSearch = useDebounce(search, 300);

  // Fetch calls with TanStack Query
  const { data, isLoading, error } = useCalls(page, 50, debouncedSearch, status);

  // Enable real-time updates
  useCallsRealtime();

  const calls = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 50);

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-serif">Calls</h1>
          <p className="text-muted-foreground">
            Manage and monitor all call transcriptions
          </p>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p>Failed to load calls</p>
              <p className="text-sm mt-2">{(error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-serif">Calls</h1>
          <p className="text-muted-foreground">
            Manage and monitor all call transcriptions
          </p>
        </div>
        <BulkActions />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by phone number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>

            <Select value={status || "all"} onValueChange={(val) => setStatus(val === "all" ? "" : val)}>
              <SelectTrigger className="w-full md:w-48" data-testid="status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Calls List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {isLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : (
                `${calls.length} of ${totalCount} calls`
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No calls found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {search || status
                  ? 'Try adjusting your filters'
                  : 'When calls are received, they will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-4" data-testid="calls-table">
              {calls.map((call: Call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors group"
                  data-testid="call-row"
                >
                  <div
                    className="flex items-center gap-4 flex-1 cursor-pointer"
                    onClick={() => router.push(`/calls/${call.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/calls/${call.id}`);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for call from ${call.from_number} to ${call.to_number}`}
                  >
                    {/* Direction Icon */}
                    <div className="flex-shrink-0">
                      {call.direction === 'inbound' ? (
                        <PhoneIncoming className="h-5 w-5 text-blue-600" />
                      ) : (
                        <PhoneOutgoing className="h-5 w-5 text-green-600" />
                      )}
                    </div>

                    {/* Call Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" data-testid="header-from">
                        {call.from_number} → <span data-testid="header-to">{call.to_number}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {call.agent_user_id || 'Unknown agent'} •{' '}
                          {formatDistanceToNow(new Date(call.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                        {call.duration_seconds && (
                          <p className="text-xs text-muted-foreground">
                            • {Math.floor(call.duration_seconds / 60)}:
                            {(call.duration_seconds % 60).toString().padStart(2, '0')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(call.transcription_status)} data-testid="header-status">
                        {getStatusLabel(call.transcription_status)}
                      </Badge>
                      {call.hubspot_contact_id && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          <Users className="h-3 w-3 mr-1" />
                          HubSpot
                        </Badge>
                      )}
                      {call.hubspot_synced_at && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Synced
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <CallActions
                      callId={call.id}
                      status={call.transcription_status}
                      isHubSpotContact={!!call.hubspot_contact_id}
                      hubspotSynced={!!call.hubspot_synced_at}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="mt-6"
          />
        </CardContent>
      </Card>
    </div>
  );
}
