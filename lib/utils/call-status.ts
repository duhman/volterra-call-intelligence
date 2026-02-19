/**
 * Shared utilities for call status handling
 */

export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'completed':
      return 'default';
    case 'in_progress':
    case 'processing':
      return 'secondary';
    case 'pending':
      return 'outline';
    case 'failed':
    case 'skipped':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'in_progress':
      return 'Processing';
    case 'completed':
      return 'Completed';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    case 'skipped':
      return 'Skipped';
    default:
      return status;
  }
}
