import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'naio-partner-secret-jwt-key-2026-development-mode'
);

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, user: null },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        distributor: {
          include: {
            district: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, user: null },
        { status: 404 }
      );
    }

    const { password: _, ...userData } = user;

    return NextResponse.json({
      success: true,
      user: userData,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, user: null },
      { status: 401 }
    );
  }
}