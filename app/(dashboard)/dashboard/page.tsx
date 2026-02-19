'use client';

import { useStats, useRecentCalls } from '@/hooks/useAdminQueries';
import { useCallsRealtime } from '@/hooks/useCallsRealtime';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { RecentCalls } from '@/components/dashboard/RecentCalls';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { isAuthenticated, isHydrated } = useAuth();
  const router = useRouter();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: recentCallsData, isLoading: callsLoading } = useRecentCalls(10);

  // Redirect to login if not authenticated (after hydration)
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push('/login?redirectTo=/dashboard');
    }
  }, [isHydrated, isAuthenticated, router]);

  // Enable real-time updates for all calls
  useCallsRealtime();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-serif">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your call transcription system
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} isLoading={statsLoading} />

      {/* Recent Calls */}
      <RecentCalls calls={recentCallsData?.data} isLoading={callsLoading} />
    </div>
  );
}
