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
    if ((payload.role as string)?.toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const districtFilter = url.searchParams.get('district');
    const productFilter = url.searchParams.get('product');

    // Run parallel database queries
    const [
      totalDistributors,
      activeDistributors,
      pendingDistributors,
      distributors,
      districts,
      products,
      sales,
      payouts,
    ] = await Promise.all([
      prisma.distributor.count(),
      prisma.distributor.count({ where: { status: 'ACTIVE' } }),
      prisma.distributor.count({ where: { status: 'PENDING' } }),
      prisma.distributor.findMany({
        include: {
          district: true,
          user: true,
          sales: true,
          earnings: true,
        },
      }),
      prisma.district.findMany({
        include: {
          distributors: {
            include: {
              sales: true,
              earnings: true,
            },
          },
        },
      }),
      prisma.product.findMany({
        include: {
          incentiveRules: {
            where: { active: true },
            orderBy: { createdAt: 'desc' },
          },
          sales: true,
        },
      }),
      prisma.sale.findMany({
        where: {
          ...(productFilter ? { productId: productFilter } : {}),
          ...(districtFilter ? { distributor: { districtId: districtFilter } } : {}),
        },
        include: {
          distributor: true,
          product: true,
          retailer: true,
          earnings: true,
        },
        orderBy: { soldAt: 'desc' },
      }),
      prisma.payout.findMany({
        include: {
          distributor: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Aggregate key metrics
    const totalUnitsSold = sales.reduce((sum, s) => sum + s.units, 0);
    const totalSalesValue = sales.reduce((sum, s) => sum + s.saleAmount, 0);
    const totalIncentivesValue = sales.reduce((sum, s) => sum + s.incentiveAmount, 0);

    const pendingPayoutsValue = payouts
      .filter((p) => p.status === 'PENDING' || p.status === 'PROCESSING' || p.status === 'APPROVED')
      .reduce((sum, p) => sum + p.amount, 0);

    const paidPayoutsValue = payouts
      .filter((p) => p.status === 'PAID' || p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);

    // District Performance Breakdown
    const districtPerformance = districts.map((d) => {
      const dists = d.distributors;
      const districtSales = dists.flatMap((dist) => dist.sales);
      const units = districtSales.reduce((sum, s) => sum + s.units, 0);
      const revenue = districtSales.reduce((sum, s) => sum + s.saleAmount, 0);
      const incentives = districtSales.reduce((sum, s) => sum + s.incentiveAmount, 0);

      return {
        id: d.id,
        name: d.name,
        code: d.code,
        state: d.state,
        distributorCount: dists.length,
        units,
        revenue,
        incentives,
      };
    });

    // Top Distributors Leaderboard
    const topDistributors = distributors
      .map((d) => {
        const units = d.sales.reduce((sum, s) => sum + s.units, 0);
        const revenue = d.sales.reduce((sum, s) => sum + s.saleAmount, 0);
        const earnings = d.sales.reduce((sum, s) => sum + s.incentiveAmount, 0);

        return {
          id: d.id,
          code: d.distributorCode,
          name: d.user.name,
          businessName: d.businessName,
          district: d.districtName || d.district?.name || 'Unassigned',
          status: d.status,
          units,
          revenue,
          earnings,
          balance: d.balanceRupees,
        };
      })
      .sort((a, b) => b.units - a.units)
      .slice(0, 10);

    // Product Performance Matrix
    const productPerformance = products.map((p) => {
      const productSales = p.sales;
      const units = productSales.reduce((sum, s) => sum + s.units, 0);
      const revenue = productSales.reduce((sum, s) => sum + s.saleAmount, 0);
      const incentives = productSales.reduce((sum, s) => sum + s.incentiveAmount, 0);
      const currentRate = p.incentiveRules[0]?.amountPerUnit || 0;

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        packSize: p.packSize,
        mrp: p.mrp,
        distributorPrice: p.distributorPrice,
        currentIncentiveRate: currentRate,
        units,
        revenue,
        incentives,
      };
    });

    return NextResponse.json({
      success: true,
      kpis: {
        totalDistributors,
        activeDistributors,
        pendingDistributors,
        totalUnitsSold,
        totalSalesValue,
        totalIncentivesValue,
        pendingPayoutsValue,
        paidPayoutsValue,
      },
      districtPerformance,
      topDistributors,
      productPerformance,
      recentSales: sales.slice(0, 20),
      payouts: payouts.slice(0, 20),
    });
  } catch (error) {
    console.error('Admin dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to load executive admin analytics' }, { status: 500 });
  }
}