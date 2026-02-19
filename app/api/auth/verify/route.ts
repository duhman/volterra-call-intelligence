import { NextRequest, NextResponse } from 'next/server';
import { validateAdminPassword } from '@/lib/auth/admin';

export async function POST(req: NextRequest) {
  try {
    const adminPassword = req.headers.get('x-admin-password');

    if (!adminPassword) {
      console.log('No password provided - returning 401');
      return NextResponse.json(
        { error: 'Unauthorized', valid: false },
        { status: 401 }
      );
    }

    const isValid = validateAdminPassword(adminPassword);

    console.log('Received password:', adminPassword);
    console.log('Password valid:', isValid);

    if (!isValid) {
      console.log('Password mismatch - returning 401');
      return NextResponse.json(
        { error: 'Unauthorized', valid: false },
        { status: 401 }
      );
    }

    console.log('Password matched - returning success');

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Verify API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
    },
  });
}
