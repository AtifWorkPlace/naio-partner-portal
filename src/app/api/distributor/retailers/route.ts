import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

import { getJwtSecret } from '@/lib/jwt';

const JWT_SECRET = getJwtSecret();

export async function GET(request: NextRequest) {
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

    const retailers = await prisma.retailer.findMany({
      where: { distributorId: distributor.id, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, retailers });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch retailers' }, { status: 500 });
  }
}

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
    const { name, phone, businessName, address, district } = body;

    if (!name) {
      return NextResponse.json({ error: 'Retailer contact name is required' }, { status: 400 });
    }

    const retailer = await prisma.retailer.create({
      data: {
        distributorId: distributor.id,
        name,
        phone: phone || null,
        businessName: businessName || `${name} Store`,
        address: address || null,
        district: district || distributor.districtName || 'Kamrup Metro',
      },
    });

    return NextResponse.json({ success: true, retailer });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add retailer' }, { status: 500 });
  }
}
