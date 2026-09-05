import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'naio-partner-secret-jwt-key-2026-development-mode'
);

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    const products = await prisma.product.findMany({
      include: {
        incentiveRules: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, products });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if ((payload.role as string)?.toUpperCase() !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { sku, name, category, unit = 'pack', packSize, mrp, distributorPrice, incentiveRate, campaignName } = body;

    if (!sku || !name || !mrp || !distributorPrice) {
      return NextResponse.json({ error: 'SKU, Name, MRP, and Distributor Price are required.' }, { status: 400 });
    }

    const rate = parseFloat(incentiveRate) || 15.0;

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sku: sku.toUpperCase().trim(),
          name,
          category: category || 'General',
          unit,
          packSize,
          mrp: parseFloat(mrp),
          distributorPrice: parseFloat(distributorPrice),
          active: true,
        },
      });

      const rule = await tx.incentiveRule.create({
        data: {
          productId: product.id,
          amountPerUnit: rate,
          currency: 'INR',
          campaignName: campaignName || 'Standard Incentive',
          active: true,
        },
      });

      return { product, rule };
    });

    return NextResponse.json({
      success: true,
      message: `Product ${result.product.name} created with ₹${rate}/unit incentive rate.`,
      product: result.product,
      rule: result.rule,
    });
  } catch (error: any) {
    console.error('Create product error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 400 });
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
    const { productId, amountPerUnit, campaignName, active } = body;

    if (!productId || amountPerUnit === undefined) {
      return NextResponse.json({ error: 'productId and amountPerUnit are required' }, { status: 400 });
    }

    const rate = parseFloat(amountPerUnit);

    // Update rules preserving historical records (deactivate old rule, create new active rule)
    const result = await prisma.$transaction(async (tx) => {
      await tx.incentiveRule.updateMany({
        where: { productId, active: true },
        data: { active: false, endDate: new Date() },
      });

      const newRule = await tx.incentiveRule.create({
        data: {
          productId,
          amountPerUnit: rate,
          currency: 'INR',
          campaignName: campaignName || 'Updated Incentive Rate',
          active: active !== undefined ? active : true,
          startDate: new Date(),
        },
      });

      return newRule;
    });

    return NextResponse.json({
      success: true,
      message: `Incentive rate updated to ₹${rate}/unit! Historical sales will retain past rates.`,
      rule: result,
    });
  } catch (error) {
    console.error('Update incentive rule error:', error);
    return NextResponse.json({ error: 'Failed to update incentive rule' }, { status: 500 });
  }
}
