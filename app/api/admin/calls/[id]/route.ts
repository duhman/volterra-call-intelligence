import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { authenticateAdmin } from '@/lib/auth/admin';

const isE2ETestMode = process.env.E2E_TEST_MODE === 'true';

// GET /api/admin/calls/[id] - Get single call details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = await createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('calls')
      .select(`
        *,
        transcriptions (
          id,
          full_text,
          summary,
          speaker_labels,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching call:', error);
    return NextResponse.json(
      { error: 'Failed to fetch call' },
      { status: 500 }
    );
  }
}

// POST /api/admin/calls/[id]/reprocess - Reprocess a call
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = await createServiceClient();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Reset call status to pending
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('calls')
      .update({ 
        status: 'pending',
        hubspot_call_id: null,
        hubspot_synced_at: null
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // E2E Test Mode: skip edge function, write deterministic data directly
    if (isE2ETestMode) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;
      
      // Delete existing transcription for this call (if any)
      await sb.from('transcriptions').delete().eq('call_id', id);
      
      // Create deterministic transcription
      const { error: transcriptionError } = await sb
        .from('transcriptions')
        .insert({
          call_id: id,
          full_text: '[E2E Test] Mock transcription for call ' + id,
          summary: '[E2E Test] Mock summary: Customer inquiry about product.',
          speaker_labels: { speaker_0: ['Agent'], speaker_1: ['Customer'] },
        });

      if (transcriptionError) console.error('E2E transcription insert error:', transcriptionError);

      // Mark call as completed
      await sb.from('calls').update({
        status: 'completed',
        duration_seconds: 120,
      }).eq('id', id);

      return NextResponse.json({ success: true, e2e_test_mode: true });
    }

    // Production: Trigger process-call edge function
    if (supabaseUrl && supabaseServiceKey) {
      await fetch(`${supabaseUrl}/functions/v1/process-call`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callId: id }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reprocessing call:', error);
    return NextResponse.json(
      { error: 'Failed to reprocess call' },
      { status: 500 }
    );
  }
}
