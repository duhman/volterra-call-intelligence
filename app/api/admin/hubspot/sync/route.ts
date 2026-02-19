import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth/admin';
import { createServiceClient } from '@/lib/supabase/server';

const isE2ETestMode = process.env.E2E_TEST_MODE === 'true';

// POST /api/admin/hubspot/sync - Sync call to HubSpot
export async function POST(request: NextRequest) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { callId, forceResync = false } = await request.json();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // E2E Test Mode: skip HubSpot API, write deterministic data directly
    if (isE2ETestMode) {
      const supabase = await createServiceClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any;

      // Set deterministic HubSpot fields
      const { error: updateError } = await sb.from('calls').update({
        hubspot_contact_id: 'e2e_test_contact_123',
        hubspot_call_id: 'e2e_test_call_456',
        hubspot_synced_at: new Date().toISOString(),
      }).eq('id', callId);

      if (updateError) throw updateError;

      return NextResponse.json({
        status: 'synced',
        hubspot_call_id: 'e2e_test_call_456',
        hubspot_contact_id: 'e2e_test_contact_123',
        contact_name: 'E2E Test Contact',
        contact_email: 'e2e@test.local',
        e2e_test_mode: true,
      });
    }

    // Production: Trigger hubspot-sync edge function
    if (supabaseUrl && supabaseServiceKey) {
      const response = await fetch(`${supabaseUrl}/functions/v1/hubspot-sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callId, forceResync }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    throw new Error('Supabase configuration missing');
  } catch (error) {
    console.error('Error syncing to HubSpot:', error);
    return NextResponse.json(
      { error: 'Failed to sync to HubSpot' },
      { status: 500 }
    );
  }
}
