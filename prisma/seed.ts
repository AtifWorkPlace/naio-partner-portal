import { PrismaClient, Role, UserStatus, SaleStatus, EarningStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting NAIO PARTNER database seed...');

  const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'NaioAdmin2026!';
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  // 1. Create or update Super Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@naiofoods.com' },
    update: {
      name: 'NAIO Admin',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'admin@naiofoods.com',
      name: 'NAIO Admin',
      password: hashedPassword,
      phone: '+91 9800000000',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('✅ Admin user ready:', adminUser.email);

  // 2. Create Assam Districts
  const districtsData = [
    { name: 'Kamrup Metro', code: 'KAM', state: 'Assam' },
    { name: 'Kamrup', code: 'KMR', state: 'Assam' },
    { name: 'Dibrugarh', code: 'DIB', state: 'Assam' },
    { name: 'Jorhat', code: 'JOR', state: 'Assam' },
    { name: 'Nagaon', code: 'NAG', state: 'Assam' },
    { name: 'Sonitpur', code: 'SON', state: 'Assam' },
    { name: 'Tinsukia', code: 'TIN', state: 'Assam' },
    { name: 'Cachar', code: 'CAC', state: 'Assam' },
    { name: 'Barpeta', code: 'BAR', state: 'Assam' },
    { name: 'Dhubri', code: 'DHU', state: 'Assam' },
    { name: 'Golaghat', code: 'GOL', state: 'Assam' },
  ];

  const districtMap: Record<string, string> = {};
  for (const d of districtsData) {
    const district = await prisma.district.upsert({
      where: { code: d.code },
      update: { name: d.name, state: d.state, active: true },
      create: { name: d.name, code: d.code, state: d.state, active: true },
    });
    districtMap[d.code] = district.id;
  }
  console.log(`✅ Loaded ${districtsData.length} Assam districts`);

  // 3. Create NAIO Products catalog
  const productsData = [
    {
      sku: 'OYSTER-200G',
      name: 'Fresh Oyster Mushroom 200g',
      category: 'Fresh Produce',
      unit: 'pack',
      packSize: '200g',
      mrp: 50.0,
      distributorPrice: 35.0,
      incentiveRate: 15.0,
    },
    {
      sku: 'OYSTER-500G',
      name: 'Fresh Oyster Mushroom 500g',
      category: 'Fresh Produce',
      unit: 'pack',
      packSize: '500g',
      mrp: 120.0,
      distributorPrice: 85.0,
      incentiveRate: 15.0,
    },
    {
      sku: 'OYSTER-1KG',
      name: 'Fresh Oyster Mushroom 1kg',
      category: 'Fresh Produce',
      unit: 'pack',
      packSize: '1kg',
      mrp: 230.0,
      distributorPrice: 165.0,
      incentiveRate: 15.0,
    },
    {
      sku: 'DRIED-100G',
      name: 'Premium Dried Oyster Mushroom 100g',
      category: 'Processed Foods',
      unit: 'pack',
      packSize: '100g',
      mrp: 150.0,
      distributorPrice: 105.0,
      incentiveRate: 10.0,
    },
    {
      sku: 'POWDER-250G',
      name: 'Organic Mushroom Powder 250g',
      category: 'Health Supplements',
      unit: 'pack',
      packSize: '250g',
      mrp: 280.0,
      distributorPrice: 195.0,
      incentiveRate: 10.0,
    },
  ];

  const productMap: Record<string, string> = {};
  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        category: p.category,
        unit: p.unit,
        packSize: p.packSize,
        mrp: p.mrp,
        distributorPrice: p.distributorPrice,
        active: true,
      },
      create: {
        sku: p.sku,
        name: p.name,
        category: p.category,
        unit: p.unit,
        packSize: p.packSize,
        mrp: p.mrp,
        distributorPrice: p.distributorPrice,
        active: true,
      },
    });
    productMap[p.sku] = product.id;

    // Create default incentive rule
    const existingRule = await prisma.incentiveRule.findFirst({
      where: { productId: product.id, active: true },
    });
    if (!existingRule) {
      await prisma.incentiveRule.create({
        data: {
          productId: product.id,
          amountPerUnit: p.incentiveRate,
          currency: 'INR',
          campaignName: 'Standard Incentive',
          active: true,
        },
      });
    }
  }
  console.log(`✅ Loaded ${productsData.length} NAIO products with incentive rules`);

  // 4. Create Sample Distributors
  const distributorUsersData = [
    {
      email: 'rakesh.sharma@naiofoods.com',
      name: 'Rakesh Sharma',
      phone: '+91 9876543210',
      distributorCode: 'NAIO-KAM-001',
      businessName: 'Assam Food Hub',
      districtCode: 'KAM',
      districtName: 'Kamrup Metro',
      address: 'GS Road, Dispur, Guwahati, Assam 781005',
      gstin: '18AABCA1234F1ZB',
      status: UserStatus.ACTIVE,
    },
    {
      email: 'anupama.gogoi@naiofoods.com',
      name: 'Anupama Gogoi',
      phone: '+91 9876543211',
      distributorCode: 'NAIO-DIB-002',
      businessName: 'Valley Fresh Traders',
      districtCode: 'DIB',
      districtName: 'Dibrugarh',
      address: 'RCM Road, Dibrugarh, Assam 786001',
      gstin: '18BCCDB5678G2ZC',
      status: UserStatus.ACTIVE,
    },
    {
      email: 'bhaskar.saikia@naiofoods.com',
      name: 'Bhaskar Saikia',
      phone: '+91 9876543212',
      distributorCode: 'NAIO-JOR-003',
      businessName: 'Green Valley Distribution',
      districtCode: 'JOR',
      districtName: 'Jorhat',
      address: 'AT Road, Jorhat, Assam 785001',
      gstin: '18CDEEF9012H3ZD',
      status: UserStatus.PENDING,
    },
  ];

  const distributorMap: Record<string, string> = {};
  for (const d of distributorUsersData) {
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {
        name: d.name,
        phone: d.phone,
        role: Role.DISTRIBUTOR,
        status: d.status,
      },
      create: {
        email: d.email,
        name: d.name,
        password: hashedPassword,
        phone: d.phone,
        role: Role.DISTRIBUTOR,
        status: d.status,
      },
    });

    const distributor = await prisma.distributor.upsert({
      where: { userId: user.id },
      update: {
        distributorCode: d.distributorCode,
        businessName: d.businessName,
        phone: d.phone,
        districtId: districtMap[d.districtCode],
        districtName: d.districtName,
        address: d.address,
        gstin: d.gstin,
        status: d.status,
      },
      create: {
        userId: user.id,
        distributorCode: d.distributorCode,
        businessName: d.businessName,
        phone: d.phone,
        districtId: districtMap[d.districtCode],
        districtName: d.districtName,
        address: d.address,
        gstin: d.gstin,
        status: d.status,
        balanceRupees: 2000.0,
      },
    });
    distributorMap[d.distributorCode] = distributor.id;
  }
  console.log(`✅ Loaded ${distributorUsersData.length} distributors`);

  // 5. Create Retailers for NAIO-KAM-001
  const kamDistributorId = distributorMap['NAIO-KAM-001'];
  if (kamDistributorId) {
    const retailer1 = await prisma.retailer.create({
      data: {
        distributorId: kamDistributorId,
        name: 'Guwahati Supermart',
        phone: '+91 9123456789',
        businessName: 'Guwahati Supermart Pvt Ltd',
        address: 'Paltan Bazaar, Guwahati',
        district: 'Kamrup Metro',
      },
    });

    const retailer2 = await prisma.retailer.create({
      data: {
        distributorId: kamDistributorId,
        name: 'Brahmaputra Groceries',
        phone: '+91 9234567890',
        businessName: 'Brahmaputra Organics',
        address: 'Zoo Road, Guwahati',
        district: 'Kamrup Metro',
      },
    });

    // 6. Create Monthly Target for NAIO-KAM-001
    const currentPeriod = new Date().toISOString().slice(0, 7); // "2026-09"
    await prisma.target.upsert({
      where: {
        distributorId_period: {
          distributorId: kamDistributorId,
          period: currentPeriod,
        },
      },
      update: {
        targetUnits: 1500,
        targetRevenue: 75000.0,
        achievedUnits: 150,
        achievedRevenue: 8500.0,
      },
      create: {
        distributorId: kamDistributorId,
        period: currentPeriod,
        targetUnits: 1500,
        targetRevenue: 75000.0,
        achievedUnits: 150,
        achievedRevenue: 8500.0,
      },
    });

    // 7. Create Sample Sales & Earnings
    const oysterProduct = await prisma.product.findUnique({ where: { sku: 'OYSTER-200G' } });
    const driedProduct = await prisma.product.findUnique({ where: { sku: 'DRIED-100G' } });

    if (oysterProduct) {
      const sale1 = await prisma.sale.create({
        data: {
          distributorId: kamDistributorId,
          retailerId: retailer1.id,
          productId: oysterProduct.id,
          units: 100,
          unitPrice: oysterProduct.mrp,
          saleAmount: 100 * oysterProduct.mrp, // 5000.0
          perUnitIncentiveRate: 15.0,
          incentiveAmount: 1500.0, // 100 * 15
          source: 'DIRECT',
          referenceCode: 'SALE-2026-000123',
          status: SaleStatus.APPROVED,
          notes: 'Initial bulk order for Guwahati Supermart',
        },
      });

      await prisma.earning.create({
        data: {
          distributorId: kamDistributorId,
          saleId: sale1.id,
          amount: 1500.0,
          status: EarningStatus.APPROVED,
        },
      });
    }

    if (driedProduct) {
      const sale2 = await prisma.sale.create({
        data: {
          distributorId: kamDistributorId,
          retailerId: retailer2.id,
          productId: driedProduct.id,
          units: 50,
          unitPrice: driedProduct.mrp,
          saleAmount: 50 * driedProduct.mrp, // 7500.0
          perUnitIncentiveRate: 10.0,
          incentiveAmount: 500.0, // 50 * 10
          source: 'DIRECT',
          referenceCode: 'SALE-2026-000124',
          status: SaleStatus.APPROVED,
          notes: 'Dried mushroom stock for Brahmaputra Groceries',
        },
      });

      await prisma.earning.create({
        data: {
          distributorId: kamDistributorId,
          saleId: sale2.id,
          amount: 500.0,
          status: EarningStatus.APPROVED,
        },
      });
    }

    console.log('✅ Created sample sales & earnings for NAIO-KAM-001');
  }

  console.log('🚀 NAIO PARTNER database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
