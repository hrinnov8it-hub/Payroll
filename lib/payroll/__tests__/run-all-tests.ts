import { runPayrollEngineTests } from './payroll-calculation.test';
import { runPhilippineComplianceTests } from './ph-statutory-compliance.test';
import { runReportsTests } from '../../reports/__tests__/reports.test';
import { runSecurityHardeningTests } from '../../auth/__tests__/security-hardening.test';
import { runEdgeCasesAndErrorHandlingTests } from './edge-cases-error-handling.test';
import { runIntegrationLifecycleTests } from './integration-lifecycle.test';
import { runRLSAndPermissionsTests } from '../../auth/__tests__/rls-and-permissions.test';
import { runUIWorkflowAndResponsiveTests } from './ui-workflow-responsive.test';

async function main() {
  console.log('================================================================');
  console.log('INNOV8IT PAYROLL - FULL SYSTEM TEST VERIFICATION RUN (PHASE 14)');
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

  console.log('--- 5. Running Phase 14 Edge Cases & Error Handling Tests ---');
  const edgeTests = await runEdgeCasesAndErrorHandlingTests();
  edgeTests.results.forEach((r) => console.log(r));
  console.log(`Phase 14 Edge Cases Tests: ${edgeTests.passed} Passed, ${edgeTests.failed} Failed\n`);

  console.log('--- 6. Running Phase 14 End-to-End Lifecycle Workflow Tests ---');
  const lifecycleTests = await runIntegrationLifecycleTests();
  lifecycleTests.results.forEach((r) => console.log(r));
  console.log(`Phase 14 Lifecycle Tests: ${lifecycleTests.passed} Passed, ${lifecycleTests.failed} Failed\n`);

  console.log('--- 7. Running Phase 14 RLS & Permissions Security Tests ---');
  const rlsTests = runRLSAndPermissionsTests();
  rlsTests.results.forEach((r) => console.log(r));
  console.log(`Phase 14 RLS & Permissions Tests: ${rlsTests.passed} Passed, ${rlsTests.failed} Failed\n`);

  console.log('--- 8. Running Phase 14 UI Workflow & Responsive Layout Tests ---');
  const uiTests = await runUIWorkflowAndResponsiveTests();
  uiTests.results.forEach((r) => console.log(r));
  console.log(`Phase 14 UI & Responsive Tests: ${uiTests.passed} Passed, ${uiTests.failed} Failed\n`);

  const totalPassed =
    engineTests.passed +
    phTests.passed +
    reportsTests.passed +
    securityTests.passed +
    edgeTests.passed +
    lifecycleTests.passed +
    rlsTests.passed +
    uiTests.passed;

  const totalFailed =
    engineTests.failed +
    phTests.failed +
    reportsTests.failed +
    securityTests.failed +
    edgeTests.failed +
    lifecycleTests.failed +
    rlsTests.failed +
    uiTests.failed;

  console.log('================================================================');
  console.log(`TOTAL SUITES: 8 | ALL TESTS: ${totalPassed} Passed, ${totalFailed} Failed`);
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
