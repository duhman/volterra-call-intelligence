import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { authenticateAdmin } from '@/lib/auth/admin';

// GET /api/admin/webhook-logs - Get webhook logs with filtering and pagination
export async function GET(request: NextRequest) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const search = searchParams.get('search') || '';
  const eventType = searchParams.get('event_type') || '';
  const processed = searchParams.get('processed') || '';
  const order = searchParams.get('order') || 'created_at.desc';

  try {
    const supabase = await createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('webhook_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`source_ip.ilike.%${search}%,payload->>LID.ilike.%${search}%,payload->>from.ilike.%${search}%,payload->>to.ilike.%${search}%`);
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (processed) {
      query = query.eq('processed', processed === 'true');
    }

    // Apply ordering
    const [orderField, orderDirection] = order.split('.');
    query = query.order(orderField, { ascending: orderDirection === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      data,
      count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching webhook logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook logs' },
      { status: 500 }
    );
  }
}
