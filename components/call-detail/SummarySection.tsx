'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ListChecks, TrendingUp, Heart } from 'lucide-react';

interface SummarySectionProps {
  summary?: string | null;
  keyPoints?: string[] | null;
  nextSteps?: string[] | null;
  sentiment?: string | null;
}

export function SummarySection({ summary, keyPoints, nextSteps, sentiment }: SummarySectionProps) {
  const hasSummaryData = summary || keyPoints || nextSteps || sentiment;

  if (!hasSummaryData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No AI summary available yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          AI Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {summary && (
          <div>
            <h4 className="font-medium mb-2">Summary</h4>
            <p className="text-sm text-muted-foreground">{summary}</p>
          </div>
        )}

        {keyPoints && keyPoints.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Key Points
            </h4>
            <ul className="list-disc list-inside space-y-1">
              {keyPoints.map((point, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {nextSteps && nextSteps.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Next Steps
            </h4>
            <ul className="list-disc list-inside space-y-1">
              {nextSteps.map((step, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {sentiment && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Sentiment
            </h4>
            <p className="text-sm text-muted-foreground capitalize">{sentiment}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
