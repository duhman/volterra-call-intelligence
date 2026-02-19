import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { authenticateAdmin } from '@/lib/auth/admin';

// GET /api/admin/blocked-numbers - Get all blocked numbers
export async function GET(request: NextRequest) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('blocked_numbers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching blocked numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blocked numbers' },
      { status: 500 }
    );
  }
}

// POST /api/admin/blocked-numbers - Add new blocked number
export async function POST(request: NextRequest) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { phone_number, reason } = await request.json();
    const supabase = await createServiceClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('blocked_numbers')
      .insert({
        phone_number,
        reason: reason || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error adding blocked number:', error);
    return NextResponse.json(
      { error: 'Failed to add blocked number' },
      { status: 500 }
    );
  }
}
