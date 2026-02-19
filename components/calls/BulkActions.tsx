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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import {
  useBulkReprocessSkipped,
  useBulkReprocessFailed,
  useBulkRegenerateSummaries,
} from '@/hooks/useAdminQueries';
import { toast } from '@/hooks/use-toast';

export function BulkActions() {
  const reprocessSkipped = useBulkReprocessSkipped();
  const reprocessFailed = useBulkReprocessFailed();
  const regenerateSummaries = useBulkRegenerateSummaries();

  const handleReprocessSkipped = async () => {
    try {
      await reprocessSkipped.mutateAsync();
      toast({
        title: 'Processing started',
        description: 'Skipped calls are being reprocessed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reprocess skipped calls.',
        variant: 'destructive',
      });
    }
  };

  const handleReprocessFailed = async () => {
    try {
      await reprocessFailed.mutateAsync();
      toast({
        title: 'Processing started',
        description: 'Failed calls are being reprocessed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reprocess failed calls.',
        variant: 'destructive',
      });
    }
  };

  const handleRegenerateSummaries = async () => {
    try {
      await regenerateSummaries.mutateAsync();
      toast({
        title: 'Processing started',
        description: 'AI summaries are being regenerated for completed calls.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to regenerate summaries.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={reprocessSkipped.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reprocess Skipped
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprocess Skipped Calls?</AlertDialogTitle>
            <AlertDialogDescription>
              This will attempt to reprocess all calls that were previously skipped.
              The operation may take several minutes depending on the number of calls.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReprocessSkipped}>
              Reprocess
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={reprocessFailed.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reprocess Failed
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprocess Failed Calls?</AlertDialogTitle>
            <AlertDialogDescription>
              This will attempt to reprocess all calls that previously failed.
              The operation may take several minutes depending on the number of calls.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReprocessFailed}>
              Reprocess
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={regenerateSummaries.isPending}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Regenerate Summaries
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate AI Summaries?</AlertDialogTitle>
            <AlertDialogDescription>
              This will regenerate AI-powered summaries for all completed calls with transcripts.
              The operation may take several minutes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerateSummaries}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
