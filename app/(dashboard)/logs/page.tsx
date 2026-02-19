'use client';

import { useState } from 'react';
import { useLogs } from '@/hooks/useAdminQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollText, CheckCircle, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Pagination } from '@/components/ui/pagination';

interface Log {
  id: string;
  event_type: string;
  processed: boolean;
  created_at: string;
  source_ip?: string;
  error_message?: string;
  payload: Record<string, unknown>;
}

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const limit = 50;

  const { data, isLoading } = useLogs(page, limit);

  // Handle different data structures if necessary (e.g. if useLogs returns { data: [], count: 0 } or just { logs: [], total: 0 })
  // Based on useAdminQueries.ts, useLogs calls /logs endpoint.
  // We need to verify the response structure of /logs.
  // Assuming it matches the reference or we adapt.
  // In LogsViewer.tsx it accessed `data?.data` and `data?.count`.
  // In reference Logs.tsx it accessed `data?.logs` and `data?.total`.
  // I should check LogsViewer again to be safe.
  
  // Checking LogsViewer.tsx again...
  // const logs = data?.data || [];
  // const totalCount = data?.count || 0;
  
  const logs = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-serif">Webhook Logs</h1>
        <p className="text-muted-foreground">
          View all incoming webhook events from Telavox
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{totalCount} Events</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ScrollText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No webhook events yet</p>
              <p className="text-sm">Events will appear here when Telavox sends webhooks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log: Log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="w-full flex items-center justify-between rounded-lg border p-4 hover:bg-accent transition-colors text-left"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {log.event_type}
                      </Badge>
                      {log.processed ? (
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Processed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{format(new Date(log.created_at), 'PPp')}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
                      {log.source_ip && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{log.source_ip}</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
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

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Webhook Event Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Event Type</p>
                  <Badge variant="outline" className="capitalize">
                    {selectedLog.event_type}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {selectedLog.processed ? (
                    <Badge variant="default">Processed</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Received</p>
                  <p className="font-medium">{format(new Date(selectedLog.created_at), 'PPpp')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Source IP</p>
                  <p className="font-mono">{selectedLog.source_ip || 'Unknown'}</p>
                </div>
              </div>

              {selectedLog.error_message && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
                  <p className="text-sm font-medium">Error</p>
                  <p className="text-sm">{selectedLog.error_message}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Payload</p>
                <pre className="p-4 rounded-lg bg-muted text-sm overflow-x-auto font-mono">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
