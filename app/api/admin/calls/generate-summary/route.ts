import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/auth/admin';
import { generateAISummary } from '@/lib/analysis/ai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const isAuthenticated = await authenticateAdmin(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { callId, previewOnly, customPrompt } = await request.json();

    if (!callId) {
      return NextResponse.json({ error: 'callId is required' }, { status: 400 });
    }

    const result = await generateAISummary(callId, customPrompt, previewOnly);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      summary: result.summary,
      callId,
      previewOnly
    });

  } catch (error) {
    console.error('Generate summary error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
