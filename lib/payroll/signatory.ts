/** Resolve a role label on older records without replacing a named historical actor. */
export function resolvePayrollActorName(name: string, signatoryName?: string | null): string {
  const signatory = signatoryName?.trim();
  const roleLabels = ['hr admin', 'hr administrator', 'super admin', 'admin (system)', 'maria santos (hr admin)'];
  return signatory && roleLabels.includes(name.trim().toLowerCase()) ? signatory : name;
}

/** HR and Super Admin approve under the authorized signatory configured for payroll. */
export function getPayrollApprovalName(name: string, signatoryName?: string | null): string {
  return signatoryName?.trim() || name;
}
