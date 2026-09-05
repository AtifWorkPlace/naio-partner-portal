import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PayoutStatus, EarningStatus } from '@prisma/client';
import { jwtVerify } from 'jose';

import { getJwtSecret } from '@/lib/jwt';

const JWT_SECRET = getJwtSecret();

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if ((payload.role as string)?.toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const payouts = await prisma.payout.findMany({
      include: {
        distributor: {
          include: {
            user: true,
            district: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, payouts });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if ((payload.role as string)?.toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { payoutId, status, transactionReference, notes } = body;

    if (!payoutId || !status) {
      return NextResponse.json({ error: 'payoutId and status are required' }, { status: 400 });
    }

    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      return NextResponse.json({ error: 'Payout record not found' }, { status: 404 });
    }

    const newStatus = status as PayoutStatus;

    // Atomic update of payout status and distributor balance
    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payout.update({
        where: { id: payoutId },
        data: {
          status: newStatus,
          ...(transactionReference ? { transactionReference } : {}),
          ...(notes ? { notes } : {}),
          ...(newStatus === 'PAID' ? { paidAt: new Date() } : {}),
          ...(newStatus === 'PROCESSING' || newStatus === 'APPROVED' ? { processedAt: new Date() } : {}),
        },
      });

      // Deduct balance from distributor's wallet if approved/paid and not already deducted
      if ((newStatus === 'PAID' || newStatus === 'APPROVED') && payout.distributorId) {
        await tx.distributor.update({
          where: { id: payout.distributorId },
          data: {
            balanceRupees: {
              decrement: payout.amount,
            },
          },
        });

        // Mark associated earnings as PAID
        await tx.earning.updateMany({
          where: { distributorId: payout.distributorId, status: EarningStatus.APPROVED },
          data: { status: EarningStatus.PAID, payoutId: payout.id },
        });
      }

      return p;
    });

    return NextResponse.json({
      success: true,
      message: `Payout marked as ${newStatus}`,
      payout: updated,
    });
  } catch (error) {
    console.error('Update payout error:', error);
    return NextResponse.json({ error: 'Failed to update payout' }, { status: 500 });
  }
}
