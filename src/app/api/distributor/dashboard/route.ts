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
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;

    const distributor = await prisma.distributor.findUnique({
      where: { userId },
      include: {
        district: true,
        user: true,
      },
    });

    if (!distributor) {
      return NextResponse.json({ error: 'Distributor profile not found' }, { status: 404 });
    }

    const currentPeriod = new Date().toISOString().slice(0, 7);

    // Fetch target, sales, earnings, payouts, retailers, and products in parallel
    const [
      target,
      sales,
      earnings,
      payouts,
      retailers,
      products,
    ] = await Promise.all([
      prisma.target.findUnique({
        where: {
          distributorId_period: {
            distributorId: distributor.id,
            period: currentPeriod,
          },
        },
      }),
      prisma.sale.findMany({
        where: { distributorId: distributor.id },
        include: {
          product: true,
          retailer: true,
          reversals: true,
        },
        orderBy: { soldAt: 'desc' },
        take: 50,
      }),
      prisma.earning.findMany({
        where: { distributorId: distributor.id },
      }),
      prisma.payout.findMany({
        where: { distributorId: distributor.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.retailer.findMany({
        where: { distributorId: distributor.id, status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      }),
      prisma.product.findMany({
        where: { active: true },
        include: {
          incentiveRules: {
            where: { active: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Aggregate monthly stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthSales = sales.filter((s) => new Date(s.soldAt) >= startOfMonth);
    const monthUnits = monthSales.reduce((sum, s) => sum + s.units, 0);
    const monthRevenue = monthSales.reduce((sum, s) => sum + s.saleAmount, 0);
    const monthEarnings = monthSales.reduce((sum, s) => sum + s.incentiveAmount, 0);

    const totalEarningsAllTime = earnings.reduce((sum, e) => sum + e.amount, 0);
    const pendingPayoutAmount = payouts
      .filter((p) => p.status === 'PENDING' || p.status === 'PROCESSING' || p.status === 'APPROVED')
      .reduce((sum, p) => sum + p.amount, 0);

    const targetUnits = target?.targetUnits || 1500;
    const achievementPercent = targetUnits > 0 ? Math.min(100, Math.round((monthUnits / targetUnits) * 1000) / 10) : 0;

    // Attach current active incentive rate to each product
    const productsWithRates = products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      unit: p.unit,
      packSize: p.packSize,
      mrp: p.mrp,
      distributorPrice: p.distributorPrice,
      activeIncentiveRate: p.incentiveRules[0]?.amountPerUnit || 0,
      campaignName: p.incentiveRules[0]?.campaignName || 'Standard Incentive',
    }));

    return NextResponse.json({
      success: true,
      distributor: {
        id: distributor.id,
        distributorCode: distributor.distributorCode,
        businessName: distributor.businessName,
        districtName: distributor.districtName || distributor.district?.name || 'Assam',
        phone: distributor.phone || distributor.user.phone,
        address: distributor.address,
        gstin: distributor.gstin,
        status: distributor.status,
        balanceRupees: distributor.balanceRupees,
        joinedAt: distributor.joinedAt,
      },
      metrics: {
        monthUnits,
        monthRevenue,
        monthEarnings,
        targetUnits,
        achievementPercent,
        availableBalance: distributor.balanceRupees,
        pendingPayoutAmount,
        totalEarningsAllTime,
      },
      sales,
      payouts,
      retailers,
      products: productsWithRates,
    });
  } catch (error) {
    console.error('Distributor dashboard error:', error);
    return NextResponse.json({ error: 'Server error loading distributor dashboard' }, { status: 500 });
  }
}
