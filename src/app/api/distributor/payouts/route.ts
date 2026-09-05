import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PayoutStatus } from '@prisma/client';
import { jwtVerify } from 'jose';

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
      return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });
    }

    const body = await request.json();
    const { amount, paymentMethod = 'BANK_TRANSFER', notes } = body;
    const requestAmount = parseFloat(amount);

    if (isNaN(requestAmount) || requestAmount <= 0) {
      return NextResponse.json({ error: 'Please enter a valid payout amount.' }, { status: 400 });
    }

    if (requestAmount > distributor.balanceRupees) {
      return NextResponse.json(
        { error: `Payout amount ₹${requestAmount} exceeds available balance ₹${distributor.balanceRupees}.` },
        { status: 400 }
      );
    }

    // Atomic creation of payout ledger entry
    const payout = await prisma.$transaction(async (tx) => {
      const p = await tx.payout.create({
        data: {
          distributorId: distributor.id,
          userId,
          amount: requestAmount,
          amountCents: Math.round(requestAmount * 100),
          status: PayoutStatus.PENDING,
          paymentMethod,
          notes: notes || 'Distributor withdrawal request',
          createdBy: userId,
        },
      });

      return p;
    });

    return NextResponse.json({
      success: true,
      message: `Payout request for ₹${requestAmount} submitted successfully and is pending admin approval.`,
      payout,
    });
  } catch (error: any) {
    console.error('Payout request error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit payout request' }, { status: 500 });
  }
}
