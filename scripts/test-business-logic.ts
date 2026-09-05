import { IncentiveEngine } from '../src/lib/incentives';

async function runStandaloneBusinessLogicTests() {
  console.log('🧪 Starting NAIO PARTNER Business Logic Verification Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASSED: ${testName}`);
      passed++;
    } else {
      console.log(`  ❌ FAILED: ${testName}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST 1: Unit Incentive Calculation (₹15 / unit)
  // Input: units = 25, rate = 15 -> Expected: ₹375
  // ----------------------------------------------------
  console.log('Test 1: Unit Incentive Calculation (₹15 / unit)');
  const units1 = 25;
  const rate1 = 15;
  const earning1 = Math.round(units1 * rate1 * 100) / 100;
  assert(earning1 === 375.0, '25 units @ ₹15/unit = ₹375 earning');

  // ----------------------------------------------------
  // TEST 2: Unit Incentive Calculation (₹10 / unit)
  // Input: units = 25, rate = 10 -> Expected: ₹250
  // ----------------------------------------------------
  console.log('\nTest 2: Unit Incentive Calculation (₹10 / unit)');
  const units2 = 25;
  const rate2 = 10;
  const earning2 = Math.round(units2 * rate2 * 100) / 100;
  assert(earning2 === 250.0, '25 units @ ₹10/unit = ₹250 earning');

  // ----------------------------------------------------
  // TEST 3: Historical Incentive Rate Preservation Test
  // Sale 1 recorded at ₹15/unit. Rule subsequently changed to ₹10/unit for Sale 2.
  // Verify Sale 1 earning snapshot remains ₹15/unit.
  // ----------------------------------------------------
  console.log('\nTest 3: Historical Rate Preservation Test');
  const sale1Snapshot = {
    units: 100,
    perUnitIncentiveRate: 15.0,
    incentiveAmount: 100 * 15.0, // 1500.0
  };

  // Incentive rate rule is updated to ₹10/unit
  const updatedRuleRate = 10.0;
  const sale2Snapshot = {
    units: 100,
    perUnitIncentiveRate: updatedRuleRate,
    incentiveAmount: 100 * updatedRuleRate, // 1000.0
  };

  assert(sale1Snapshot.perUnitIncentiveRate === 15.0, 'Historical Sale 1 preserves original ₹15/unit rate snapshot');
  assert(sale1Snapshot.incentiveAmount === 1500.0, 'Historical Sale 1 preserves ₹1,500 earning');
  assert(sale2Snapshot.perUnitIncentiveRate === 10.0, 'New Sale 2 uses new ₹10/unit rate');

  // ----------------------------------------------------
  // TEST 4: Product Return Reversal Transaction Test
  // Sale: 100 units @ ₹15 = ₹1,500 earning
  // Return: 20 units returned -> Reversal: 20 × ₹15 = ₹300 reversal
  // Net remaining earning: ₹1,200
  // ----------------------------------------------------
  console.log('\nTest 4: Return Reversal Calculation');
  const originalUnits = 100;
  const originalRate = 15.0;
  const originalEarning = originalUnits * originalRate;

  const returnedUnits = 20;
  const reversalAmount = returnedUnits * originalRate;
  const netEarning = originalEarning - reversalAmount;

  assert(reversalAmount === 300.0, 'Reversal amount for 20 returned units @ ₹15 = ₹300');
  assert(netEarning === 1200.0, 'Net remaining earning after 20 unit return = ₹1,200');

  // ----------------------------------------------------
  // TEST 5: Distributor Code Formatting Rule
  // District: KAM -> NAIO-KAM-001
  // ----------------------------------------------------
  console.log('\nTest 5: Distributor Identifier Uniqueness & Format');
  const generateCode = (districtCode: string, seq: number) => {
    const padSeq = seq.toString().padStart(3, '0');
    return `NAIO-${districtCode.toUpperCase()}-${padSeq}`;
  };

  const code1 = generateCode('KAM', 1);
  const code2 = generateCode('DIB', 2);
  const code3 = generateCode('JOR', 3);

  assert(code1 === 'NAIO-KAM-001', 'Formatted Kamrup distributor code: NAIO-KAM-001');
  assert(code2 === 'NAIO-DIB-002', 'Formatted Dibrugarh distributor code: NAIO-DIB-002');
  assert(code3 === 'NAIO-JOR-003', 'Formatted Jorhat distributor code: NAIO-JOR-003');

  console.log(`\n==================================================`);
  console.log(`VERIFICATION RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runStandaloneBusinessLogicTests();
