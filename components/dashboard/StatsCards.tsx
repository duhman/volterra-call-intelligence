'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, CheckCircle, Clock, XCircle, CalendarDays, Share2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StatsCardsProps {
  stats?: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    today: number;
    hubspotSynced: number;
  };
  isLoading?: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  // Show loading state if explicitly loading OR if we don't have data yet
  const showLoading = isLoading || stats === undefined;

  const cards = [
    {
      title: 'Total Calls',
      value: stats?.total ?? 0,
      icon: Phone,
      testId: 'total-calls',
    },
    {
      title: 'Completed',
      value: stats?.completed ?? 0,
      icon: CheckCircle,
      testId: 'completed-calls',
    },
    {
      title: 'Pending',
      value: stats?.pending ?? 0,
      icon: Clock,
      testId: 'pending-calls',
    },
    {
      title: 'Failed',
      value: stats?.failed ?? 0,
      icon: XCircle,
      testId: 'failed-calls',
    },
    {
      title: 'Today',
      value: stats?.today ?? 0,
      icon: CalendarDays,
      testId: 'today-calls',
    },
    {
      title: 'Synced to CRM',
      value: stats?.hubspotSynced ?? 0,
      icon: Share2,
      description: 'Calls synced to CRM',
      testId: 'synced-calls',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6" data-testid="stats-container">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {showLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold" data-testid={card.testId}>{card.value}</div>
              )}
              {card.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
