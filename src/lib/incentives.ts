import { prisma } from '@/lib/prisma';
import { SaleStatus, EarningStatus } from '@prisma/client';

export interface IncentiveCalculationResult {
  productId: string;
  units: number;
  perUnitRate: number;
  incentiveAmount: number;
  campaignName: string;
  ruleId: string | null;
}

export interface ReversalResult {
  saleId: string;
  unitsReturned: number;
  reversalAmount: number;
  remainingEarnings: number;
  reversalId: string;
}

export class IncentiveEngine {
  /**
   * Resolves the active per-unit incentive rate for a given product at a specific date.
   */
  static async resolveIncentiveRate(
    productId: string,
    soldAt: Date = new Date()
  ): Promise<IncentiveCalculationResult> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        incentiveRules: {
          where: {
            active: true,
            startDate: { lte: soldAt },
            OR: [
              { endDate: null },
              { endDate: { gte: soldAt } }
            ],
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const activeRule = product.incentiveRules[0];
    const perUnitRate = activeRule ? activeRule.amountPerUnit : 0;
    const campaignName = activeRule ? (activeRule.campaignName || 'Standard Incentive') : 'No Rule Active';

    return {
      productId,
      units: 0,
      perUnitRate,
      incentiveAmount: 0,
      campaignName,
      ruleId: activeRule ? activeRule.id : null,
    };
  }

  /**
   * Calculates incentive amount for given product SKU/ID and unit count.
   */
  static async calculateIncentive(
    productId: string,
    units: number,
    soldAt: Date = new Date()
  ): Promise<IncentiveCalculationResult> {
    if (units <= 0) {
      throw new Error('Units count must be greater than zero');
    }

    const resolved = await this.resolveIncentiveRate(productId, soldAt);
    const incentiveAmount = Math.round(units * resolved.perUnitRate * 100) / 100;

    return {
      ...resolved,
      units,
      incentiveAmount,
    };
  }

  /**
   * Records a new Sale and generates the associated Earning atomically using a database transaction.
   * Ensures duplicate submissions are rejected via reference code idempotency.
   */
  static async recordSaleWithIncentive(data: {
    distributorId: string;
    retailerId?: string;
    productId: string;
    units: number;
    unitPrice: number;
    source?: string;
    referenceCode: string;
    notes?: string;
    soldAt?: Date;
  }) {
    const {
      distributorId,
      retailerId,
      productId,
      units,
      unitPrice,
      source = 'DIRECT',
      referenceCode,
      notes,
      soldAt = new Date(),
    } = data;

    // Check idempotency / duplicate reference code
    const existingSale = await prisma.sale.findUnique({
      where: { referenceCode },
    });

    if (existingSale) {
      throw new Error(`Duplicate sale submission: Reference code ${referenceCode} already exists.`);
    }

    // Resolve current incentive rate
    const incentiveResult = await this.calculateIncentive(productId, units, soldAt);
    const saleAmount = Math.round(units * unitPrice * 100) / 100;

    // Execute atomic transaction for Sale + Earning creation & Target/Balance update
    return await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          distributorId,
          retailerId: retailerId || null,
          productId,
          units,
          unitPrice,
          saleAmount,
          perUnitIncentiveRate: incentiveResult.perUnitRate,
          incentiveAmount: incentiveResult.incentiveAmount,
          source,
          referenceCode,
          status: SaleStatus.APPROVED,
          notes,
          soldAt,
        },
        include: {
          product: true,
          retailer: true,
        },
      });

      const earning = await tx.earning.create({
        data: {
          distributorId,
          saleId: sale.id,
          amount: incentiveResult.incentiveAmount,
          status: EarningStatus.APPROVED,
        },
      });

      // Update distributor's payable balance
      await tx.distributor.update({
        where: { id: distributorId },
        data: {
          balanceRupees: {
            increment: incentiveResult.incentiveAmount,
          },
        },
      });

      // Update current month target progress
      const currentPeriod = soldAt.toISOString().slice(0, 7);
      await tx.target.upsert({
        where: {
          distributorId_period: {
            distributorId,
            period: currentPeriod,
          },
        },
        update: {
          achievedUnits: { increment: units },
          achievedRevenue: { increment: saleAmount },
        },
        create: {
          distributorId,
          period: currentPeriod,
          targetUnits: 1500,
          targetRevenue: 75000,
          achievedUnits: units,
          achievedRevenue: saleAmount,
        },
      });

      return {
        sale,
        earning,
        incentiveResult,
      };
    });
  }

  /**
   * Processes product return reversal using the stored historical perUnitIncentiveRate.
   */
  static async processReturnReversal(
    saleId: string,
    unitsReturned: number,
    reason: string,
    createdBy: string
  ): Promise<ReversalResult> {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        reversals: true,
        earnings: true,
      },
    });

    if (!sale) {
      throw new Error(`Sale not found: ${saleId}`);
    }

    const totalPreviouslyReturned = sale.reversals.reduce((sum, r) => sum + r.unitsReturned, 0);
    const availableUnitsForReturn = sale.units - totalPreviouslyReturned;

    if (unitsReturned <= 0 || unitsReturned > availableUnitsForReturn) {
      throw new Error(
        `Invalid return units: ${unitsReturned}. Available for return: ${availableUnitsForReturn} out of ${sale.units} units.`
      );
    }

    // Use historical perUnitIncentiveRate snapshot from sale!
    const reversalAmount = Math.round(unitsReturned * sale.perUnitIncentiveRate * 100) / 100;

    return await prisma.$transaction(async (tx) => {
      const reversal = await tx.reversal.create({
        data: {
          saleId: sale.id,
          distributorId: sale.distributorId,
          unitsReturned,
          reversalAmount,
          reason,
          createdBy,
        },
      });

      // Adjust distributor balance
      await tx.distributor.update({
        where: { id: sale.distributorId },
        data: {
          balanceRupees: {
            decrement: reversalAmount,
          },
        },
      });

      const totalEarningsAmount = sale.earnings.reduce((sum, e) => sum + e.amount, 0);
      const remainingEarnings = Math.max(0, totalEarningsAmount - reversalAmount);

      return {
        saleId,
        unitsReturned,
        reversalAmount,
        remainingEarnings,
        reversalId: reversal.id,
      };
    });
  }
}
