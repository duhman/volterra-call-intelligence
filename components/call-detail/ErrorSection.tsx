'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ErrorSectionProps {
  error?: string | null;
  errorTimestamp?: string | null;
}

export function ErrorSection({ error, errorTimestamp }: ErrorSectionProps) {
  if (!error) {
    return null;
  }

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          Error Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm">{error}</p>
        {errorTimestamp && (
          <p className="text-xs text-muted-foreground">
            {format(new Date(errorTimestamp), 'PPp')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
