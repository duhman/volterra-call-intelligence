import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { authenticateAdmin } from '@/lib/auth/admin';
import { generateAISummary } from '@/lib/analysis/ai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    // Fetch recent completed calls (limit 20)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: calls, error } = await (supabase as any)
      .from('telavox_call_sessions')
      .select('id')
      .eq('transcription_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    let successCount = 0;
    let failedCount = 0;

    for (const call of calls || []) {
      const result = await generateAISummary(call.id, undefined, false);
      if (result.error) {
        console.error(`Failed to regenerate summary for ${call.id}:`, result.error);
        failedCount++;
      } else {
        successCount++;
        // Optionally trigger HubSpot sync here if needed
        // but let's keep it simple for now
      }
    }

    return NextResponse.json({
      message: `Processed ${successCount + failedCount} calls`,
      count: successCount + failedCount,
      successCount,
      failedCount
    });

  } catch (error) {
    console.error('Bulk regenerate error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
