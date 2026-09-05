import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

let globalPrisma: PrismaClient | null = null;

async function main() {
  console.log('🔍 Running Database & Auth Diagnostic Test...\n');

  try {
    console.log('1. Testing Prisma Client Initialization...');
    globalPrisma = new PrismaClient();
    console.log('   PRISMA CLIENT: PASS\n');
  } catch (err: any) {
    console.error('   PRISMA CLIENT: FAIL —', err.message);
    process.exit(1);
  }

  try {
    console.log('2. Testing Database Connection & User Table Query...');
    const userCount = await globalPrisma.user.count();
    console.log(`   DATABASE CONNECTION: PASS (Total Users: ${userCount})\n`);
  } catch (err: any) {
    console.error('   DATABASE CONNECTION: FAIL —', err.message);
    process.exit(1);
  }

  try {
    console.log('3. Testing Admin Account & Status Verification...');
    const admin = await globalPrisma.user.findUnique({
      where: { email: 'admin@naiofoods.com' }
    });

    if (!admin) {
      console.log('   ADMIN USER QUERY: FAIL (admin@naiofoods.com not found)');
    } else {
      console.log(`   ADMIN USER QUERY: PASS (Role: ${admin.role}, Status: ${admin.status})`);
      
      const isPasswordMatch = await bcrypt.compare('NaioAdmin2026!', admin.password);
      if (isPasswordMatch) {
        console.log('   ADMIN BCRYPT VERIFICATION: PASS\n');
      } else {
        console.log('   ADMIN BCRYPT VERIFICATION: FAIL (Password hash mismatch)\n');
      }
    }
  } catch (err: any) {
    console.error('   ADMIN QUERY: FAIL —', err.message);
  }

  try {
    console.log('4. Testing Distributor Account & Relationship Query...');
    const distUser = await globalPrisma.user.findUnique({
      where: { email: 'kamrup.distributor@naiofoods.com' },
      include: { distributor: true }
    });

    if (!distUser) {
      console.log('   DISTRIBUTOR QUERY: FAIL (kamrup.distributor@naiofoods.com not found)');
    } else {
      console.log(`   DISTRIBUTOR QUERY: PASS (Role: ${distUser.role}, Status: ${distUser.status}, Code: ${distUser.distributor?.distributorCode || 'None'})`);

      const isDistPasswordMatch = await bcrypt.compare('Distributor2026!', distUser.password);
      if (isDistPasswordMatch) {
        console.log('   DISTRIBUTOR BCRYPT VERIFICATION: PASS\n');
      } else {
        console.log('   DISTRIBUTOR BCRYPT VERIFICATION: FAIL (Password hash mismatch)\n');
      }
    }
  } catch (err: any) {
    console.error('   DISTRIBUTOR QUERY: FAIL —', err.message);
  }

  console.log('==================================================');
  console.log('DIAGNOSTIC TEST COMPLETE: ALL SYSTEMS GO');
  console.log('==================================================');
}

main()
  .catch((e) => {
    console.error('Unhandled Diagnostic Failure:', e);
    process.exit(1);
  })
  .finally(async () => {
    if (globalPrisma) await globalPrisma.$disconnect();
  });
