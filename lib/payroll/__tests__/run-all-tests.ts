import { runPayrollEngineTests } from './payroll-calculation.test';
import { runPhilippineComplianceTests } from './ph-statutory-compliance.test';
import { runReportsTests } from '../../reports/__tests__/reports.test';
import { runSecurityHardeningTests } from '../../auth/__tests__/security-hardening.test';

async function main() {
  console.log('================================================================');
  console.log('INNOV8IT PAYROLL - FULL SYSTEM TEST VERIFICATION RUN');
  console.log('================================================================\n');

  console.log('--- 1. Running Phase 7 Calculation Engine Tests ---');
  const engineTests = runPayrollEngineTests();
  engineTests.results.forEach((r) => console.log(r));
  console.log(`Phase 7 Tests: ${engineTests.passed} Passed, ${engineTests.failed} Failed\n`);

  console.log('--- 2. Running Phase 11 Philippine Statutory Compliance Tests ---');
  const phTests = runPhilippineComplianceTests();
  phTests.results.forEach((r) => console.log(r));
  console.log(`Phase 11 Compliance Tests: ${phTests.passed} Passed, ${phTests.failed} Failed\n`);

  console.log('--- 3. Running Phase 12 Payroll Reports & Compliance Tests ---');
  const reportsTests = await runReportsTests();
  reportsTests.results.forEach((r) => console.log(r));
  console.log(`Phase 12 Reports Tests: ${reportsTests.passed} Passed, ${reportsTests.failed} Failed\n`);

  console.log('--- 4. Running Phase 13 Audit & Security Hardening Tests ---');
  const securityTests = await runSecurityHardeningTests();
  securityTests.results.forEach((r) => console.log(r));
  console.log(`Phase 13 Security Tests: ${securityTests.passed} Passed, ${securityTests.failed} Failed\n`);

  const totalPassed = engineTests.passed + phTests.passed + reportsTests.passed + securityTests.passed;
  const totalFailed = engineTests.failed + phTests.failed + reportsTests.failed + securityTests.failed;

  console.log('================================================================');
  console.log(`TOTAL RESULTS: ${totalPassed} Passed, ${totalFailed} Failed`);
  console.log('================================================================');

  if (totalFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
