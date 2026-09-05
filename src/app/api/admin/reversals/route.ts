import { NextRequest, NextResponse } from 'next/server';
import { IncentiveEngine } from '@/lib/incentives';
import { jwtVerify } from 'jose';

import { getJwtSecret } from '@/lib/jwt';

const JWT_SECRET = getJwtSecret();

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if ((payload.role as string)?.toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { saleId, unitsReturned, reason } = body;

    if (!saleId || !unitsReturned || unitsReturned <= 0) {
      return NextResponse.json(
        { error: 'Valid saleId and unitsReturned (>0) are required' },
        { status: 400 }
      );
    }

    const result = await IncentiveEngine.processReturnReversal(
      saleId,
      parseInt(unitsReturned, 10),
      reason || 'Product Return / Damaged Goods',
      payload.userId as string
    );

    return NextResponse.json({
      success: true,
      message: `Return reversal processed! ${result.unitsReturned} units returned. ₹${result.reversalAmount} deducted from distributor balance.`,
      result,
    });
  } catch (error: any) {
    console.error('Process reversal error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process return reversal' }, { status: 400 });
  }
}
