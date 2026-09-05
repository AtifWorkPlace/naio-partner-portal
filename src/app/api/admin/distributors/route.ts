import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserStatus } from '@prisma/client';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'naio-partner-secret-jwt-key-2026-development-mode'
);

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if ((payload.role as string)?.toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const distributors = await prisma.distributor.findMany({
      include: {
        user: true,
        district: true,
        sales: true,
        targets: true,
        payouts: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const districts = await prisma.district.findMany({ where: { active: true } });

    return NextResponse.json({ success: true, distributors, districts });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch distributors' }, { status: 500 });
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
    const { distributorId, status, districtId, targetUnits, targetRevenue } = body;

    if (!distributorId) {
      return NextResponse.json({ error: 'distributorId is required' }, { status: 400 });
    }

    const distributor = await prisma.distributor.findUnique({
      where: { id: distributorId },
    });

    if (!distributor) {
      return NextResponse.json({ error: 'Distributor not found' }, { status: 404 });
    }

    let districtName = distributor.districtName;
    if (districtId && districtId !== distributor.districtId) {
      const district = await prisma.district.findUnique({ where: { id: districtId } });
      if (district) {
        districtName = district.name;
      }
    }

    // Atomic update of user status & distributor details
    const updated = await prisma.$transaction(async (tx) => {
      const dist = await tx.distributor.update({
        where: { id: distributorId },
        data: {
          ...(status ? { status: status as UserStatus } : {}),
          ...(districtId ? { districtId, districtName } : {}),
        },
      });

      if (status) {
        await tx.user.update({
          where: { id: distributor.userId },
          data: { status: status as UserStatus },
        });
      }

      // Update target if provided
      if (targetUnits || targetRevenue) {
        const currentPeriod = new Date().toISOString().slice(0, 7);
        await tx.target.upsert({
          where: {
            distributorId_period: {
              distributorId,
              period: currentPeriod,
            },
          },
          update: {
            ...(targetUnits ? { targetUnits: parseInt(targetUnits, 10) } : {}),
            ...(targetRevenue ? { targetRevenue: parseFloat(targetRevenue) } : {}),
          },
          create: {
            distributorId,
            period: currentPeriod,
            targetUnits: targetUnits ? parseInt(targetUnits, 10) : 1500,
            targetRevenue: targetRevenue ? parseFloat(targetRevenue) : 75000,
          },
        });
      }

      return dist;
    });

    return NextResponse.json({
      success: true,
      message: `Distributor ${distributor.distributorCode} status updated to ${status || distributor.status}`,
      distributor: updated,
    });
  } catch (error) {
    console.error('Update distributor error:', error);
    return NextResponse.json({ error: 'Failed to update distributor' }, { status: 500 });
  }
}
