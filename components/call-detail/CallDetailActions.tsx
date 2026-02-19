'use client';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefreshCw, Upload } from 'lucide-react';
import { useReprocessCall, useHubSpotSync } from '@/hooks/useAdminQueries';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

interface CallDetailActionsProps {
  callId: string;
  status: string;
  isHubSpotContact: boolean;
  hubspotSynced: boolean;
}

export function CallDetailActions({ callId, status, isHubSpotContact, hubspotSynced }: CallDetailActionsProps) {
  const [showReprocessDialog, setShowReprocessDialog] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);

  const reprocessCall = useReprocessCall();
  const hubspotSync = useHubSpotSync();

  const handleReprocess = async () => {
    try {
      await reprocessCall.mutateAsync({ callId });
      toast({
        title: 'Processing started',
        description: 'Call is being reprocessed.',
      });
      setShowReprocessDialog(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reprocess call.',
        variant: 'destructive',
      });
    }
  };

  const handleSync = async () => {
    try {
      await hubspotSync.mutateAsync(callId);
      toast({
        title: 'Sync started',
        description: 'Call is being synced to HubSpot.',
      });
      setShowSyncDialog(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sync call to HubSpot.',
        variant: 'destructive',
      });
    }
  };

  const showReprocess = status === 'skipped' || status === 'failed';
  const showSync = status === 'completed' && isHubSpotContact && !hubspotSynced;

  if (!showReprocess && !showSync) {
    return null;
  }

  return (
    <>
      <div className="flex gap-2">
        {showReprocess && (
          <Button onClick={() => setShowReprocessDialog(true)} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reprocess Call
          </Button>
        )}
        {showSync && (
          <Button onClick={() => setShowSyncDialog(true)} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Sync to HubSpot
          </Button>
        )}
      </div>

      {/* Reprocess Dialog */}
      <AlertDialog open={showReprocessDialog} onOpenChange={setShowReprocessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprocess Call?</AlertDialogTitle>
            <AlertDialogDescription>
              This will attempt to reprocess this call. Any existing transcription data will be retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReprocess}
              disabled={reprocessCall.isPending}
            >
              {reprocessCall.isPending ? 'Processing...' : 'Reprocess'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sync Dialog */}
      <AlertDialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync to HubSpot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a call engagement in HubSpot for this contact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSync}
              disabled={hubspotSync.isPending}
            >
              {hubspotSync.isPending ? 'Syncing...' : 'Sync'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
