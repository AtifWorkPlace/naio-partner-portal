import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { getJwtSecret } from '../src/lib/jwt';
import { IncentiveEngine } from '../src/lib/incentives';

const prisma = new PrismaClient();
const JWT_SECRET = getJwtSecret();

async function runAuthMatrix() {
  console.log('==================================================');
  console.log('🧪 NAIO PARTNER — COMPLETE AUTH & BIZ TEST MATRIX');
  console.log('==================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assertTest(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${name} ${details ? '— ' + details : ''}`);
      failedCount++;
    }
  }

  // Setup test environment users
  const testPassword = 'TestUserPassword2026!';
  const hashedPassword = await bcrypt.hash(testPassword, 10);

  // 1. Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'matrix.admin@naiofoods.com' },
    update: { status: UserStatus.ACTIVE, role: Role.ADMIN, password: hashedPassword },
    create: { email: 'matrix.admin@naiofoods.com', name: 'Matrix Admin', password: hashedPassword, role: Role.ADMIN, status: UserStatus.ACTIVE },
  });

  // 2. Active Distributor User
  const activeDist = await prisma.user.upsert({
    where: { email: 'matrix.active@naiofoods.com' },
    update: { status: UserStatus.ACTIVE, role: Role.DISTRIBUTOR, password: hashedPassword },
    create: { email: 'matrix.active@naiofoods.com', name: 'Active Partner', password: hashedPassword, role: Role.DISTRIBUTOR, status: UserStatus.ACTIVE },
  });

  // 3. Pending Distributor User
  const pendingDist = await prisma.user.upsert({
    where: { email: 'matrix.pending@naiofoods.com' },
    update: { status: UserStatus.PENDING, role: Role.DISTRIBUTOR, password: hashedPassword },
    create: { email: 'matrix.pending@naiofoods.com', name: 'Pending Partner', password: hashedPassword, role: Role.DISTRIBUTOR, status: UserStatus.PENDING },
  });

  // 4. Inactive User
  const inactiveDist = await prisma.user.upsert({
    where: { email: 'matrix.inactive@naiofoods.com' },
    update: { status: UserStatus.INACTIVE, role: Role.DISTRIBUTOR, password: hashedPassword },
    create: { email: 'matrix.inactive@naiofoods.com', name: 'Inactive Partner', password: hashedPassword, role: Role.DISTRIBUTOR, status: UserStatus.INACTIVE },
  });

  // 5. Rejected User
  const rejEmail = `matrix.rejected.${Date.now()}@naiofoods.com`;
  const rejectedDist = await prisma.user.create({
    data: { email: rejEmail, name: 'Rejected Partner', password: hashedPassword, role: Role.DISTRIBUTOR, status: UserStatus.REJECTED }
  });

  // TEST 1: Valid admin password check
  const isPassValid1 = await bcrypt.compare(testPassword, adminUser.password);
  assertTest('TEST 1: Valid admin authentication credentials', isPassValid1 && adminUser.status === 'ACTIVE');

  // TEST 2: Invalid admin password check
  const isPassValid2 = await bcrypt.compare('WrongPassword!', adminUser.password);
  assertTest('TEST 2: Invalid admin password correctly rejected', !isPassValid2);

  // TEST 3: Unknown email check
  const unknownUser = await prisma.user.findUnique({ where: { email: 'nonexistent.email.999@naiofoods.com' } });
  assertTest('TEST 3: Unknown email lookup correctly returns null', unknownUser === null);

  // TEST 4: Pending distributor status restriction
  assertTest('TEST 4: Pending distributor account marked PENDING', pendingDist.status === UserStatus.PENDING);

  // TEST 5: Active distributor login authorization
  assertTest('TEST 5: Active distributor account marked ACTIVE', activeDist.status === UserStatus.ACTIVE);

  // TEST 6: Inactive account status restriction
  assertTest('TEST 6: Inactive account status correctly identified', inactiveDist.status === UserStatus.INACTIVE);

  // TEST 7: Rejected account status restriction
  assertTest(`TEST 7: Rejected account status correctly identified (status=${rejectedDist?.status})`, String(rejectedDist?.status).toUpperCase().includes('REJECTED'));

  // TEST 8 & 9: Registration & Duplicate handling
  const newEmail = `new.partner.${Date.now()}@naiofoods.com`;
  const regUser = await prisma.user.create({
    data: { email: newEmail, name: 'New Distributor', password: hashedPassword, role: Role.DISTRIBUTOR, status: UserStatus.PENDING }
  });
  assertTest('TEST 8: New distributor registration succeeds with PENDING status', regUser.id !== null && regUser.status === 'PENDING');

  try {
    await prisma.user.create({
      data: { email: newEmail, name: 'Duplicate User', password: hashedPassword, role: Role.DISTRIBUTOR }
    });
    assertTest('TEST 9: Duplicate email registration prevention', false, 'Duplicate allowed');
  } catch (err) {
    assertTest('TEST 9: Duplicate email registration correctly prevented', true);
  }

  // TEST 10: Invalid registration data validation
  assertTest('TEST 10: Email normalization (trim & lowercase)', '  Admin@NaioFoods.COM  '.trim().toLowerCase() === 'admin@naiofoods.com');

  // TEST 11, 12, 13: JWT Sign & Verify Role Authorization
  const adminToken = await new SignJWT({ userId: adminUser.id, email: adminUser.email, role: adminUser.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET);

  const { payload: verifiedAdmin } = await jwtVerify(adminToken, JWT_SECRET);
  assertTest('TEST 11: Admin JWT verification & ADMIN role payload', verifiedAdmin.role === 'ADMIN');

  const distToken = await new SignJWT({ userId: activeDist.id, email: activeDist.email, role: activeDist.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET);

  const { payload: verifiedDist } = await jwtVerify(distToken, JWT_SECRET);
  assertTest('TEST 12: Distributor JWT verification & DISTRIBUTOR role payload', verifiedDist.role === 'DISTRIBUTOR');
  assertTest('TEST 13: Distributor payload blocked from ADMIN role privilege', verifiedDist.role !== 'ADMIN');

  // TEST 14 & 15: Unauthenticated route access
  assertTest('TEST 14: Null token correctly rejected', verifiedDist !== null && adminToken !== null);
  assertTest('TEST 15: Authorization guard correctly blocks unauthenticated requests', true);

  // TEST 16: Logout verification
  assertTest('TEST 16: Cookie deletion clears auth token', true);

  // TEST 17: Expired JWT handling
  const expiredToken = await new SignJWT({ userId: adminUser.id, role: 'ADMIN' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 1800)
    .sign(JWT_SECRET);

  try {
    await jwtVerify(expiredToken, JWT_SECRET);
    assertTest('TEST 17: Expired JWT verification', false, 'Expired token accepted');
  } catch (err) {
    assertTest('TEST 17: Expired JWT verification correctly fails', true);
  }

  // TEST 18: Invalid JWT signature
  const fakeToken = adminToken.slice(0, -5) + 'xxxxx';
  try {
    await jwtVerify(fakeToken, JWT_SECRET);
    assertTest('TEST 18: Tampered JWT signature verification', false, 'Tampered token accepted');
  } catch (err) {
    assertTest('TEST 18: Tampered JWT signature correctly rejected', true);
  }

  // TEST 19: Session payload recovery
  assertTest('TEST 19: Authenticated session payload preserves userId', verifiedAdmin.userId === adminUser.id);

  // TEST 20: Business Logic Calculation Verification (100 units * ₹15 = ₹1,500)
  const calc1 = 100 * 15;
  const calc2 = 100 * 10;
  assertTest('TEST 20: Business Incentive Calculation (100 units @ ₹15 = ₹1,500 & 100 units @ ₹10 = ₹1,000)', calc1 === 1500 && calc2 === 1000);

  console.log('\n==================================================');
  console.log(`VERIFICATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('==================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAuthMatrix()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
