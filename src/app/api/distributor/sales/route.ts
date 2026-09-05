import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { IncentiveEngine } from '@/lib/incentives';
import { jwtVerify } from 'jose';
import crypto from 'crypto';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'naio-partner-secret-jwt-key-2026-development-mode'
);

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;

    const distributor = await prisma.distributor.findUnique({
      where: { userId },
    });

    if (!distributor) {
      return NextResponse.json({ error: 'Distributor account not found' }, { status: 404 });
    }

    if (distributor.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Your distributor account is not active. Sales recording is disabled.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { retailerId, productId, units, soldAt, notes, clientRef } = body;

    if (!productId || !units || units <= 0) {
      return NextResponse.json(
        { error: 'Valid Product and Units count (>0) are required.' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.active) {
      return NextResponse.json({ error: 'Selected product is inactive or not found.' }, { status: 400 });
    }

    // Generate unique reference code (e.g. SALE-2026-000123 or from clientRef)
    const datePrefix = new Date().getFullYear();
    const randomSeq = crypto.randomBytes(3).toString('hex').toUpperCase();
    const referenceCode = clientRef || `SALE-${datePrefix}-${randomSeq}`;

    const saleDate = soldAt ? new Date(soldAt) : new Date();

    // Invoke Incentive Engine (Calculates incentive, handles idempotency, creates sale & earning atomically)
    const result = await IncentiveEngine.recordSaleWithIncentive({
      distributorId: distributor.id,
      retailerId,
      productId: product.id,
      units: parseInt(units, 10),
      unitPrice: product.mrp,
      source: 'DIRECT',
      referenceCode,
      notes,
      soldAt: saleDate,
    });

    return NextResponse.json({
      success: true,
      message: `Sale recorded successfully! ${result.sale.units} units × ₹${result.sale.perUnitIncentiveRate} = ₹${result.sale.incentiveAmount} Earning`,
      sale: result.sale,
      earning: result.earning,
      incentiveResult: result.incentiveResult,
    });
  } catch (error: any) {
    console.error('Record sale error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record sale' },
      { status: 400 }
    );
  }
}
