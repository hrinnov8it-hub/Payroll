# Innov8IT Payroll Web App — Antigravity Implementation Plan

## Project Instruction

You are implementing a production-ready web-based payroll management system for **Innov8IT**.

Follow this document as the implementation source of truth.

## Critical Rule

**DO NOT implement the entire application at once.**

You must implement **ONE PHASE AT A TIME**.

For every phase:

1. Read the current phase requirements.
2. Inspect the existing project before changing files.
3. Implement ONLY the requested phase.
4. Do not add future-phase features.
5. Do not create unnecessary placeholder modules.
6. Preserve working code from previous phases.
7. Run relevant checks/tests.
8. Report exactly what files were created or modified.
9. Stop after completing the current phase.
10. Wait for explicit approval before proceeding to the next phase.

If the user says:

> Implement Phase 1 only.

Then implement **Phase 1 only**.

Do not continue to Phase 2 or beyond.

---

# 1. Project Overview

Build a secure, responsive, maintainable payroll web application for Innov8IT.

The application must support:

- Authentication
- Employee management
- Attendance and time inputs
- Payroll periods
- Payroll processing
- Overtime
- Night differential
- Earnings
- Deductions
- Philippine government contributions
- Withholding tax
- Payroll review
- Payroll approval
- Payroll locking
- Payslips
- Payroll history
- Reports
- Security
- Audit logs

---

# 2. Technology Stack

## Frontend

- Next.js
- TypeScript
- Semantic HTML through TSX
- Plain CSS
- TypeScript/JavaScript for interactions

## Styling Rules

Use:

- Plain CSS
- CSS variables
- Reusable classes/components
- Responsive layouts

Do NOT use:

- Tailwind CSS
- Bootstrap
- Material UI
- Chakra UI
- Other UI frameworks unless explicitly approved

## Backend

- Next.js server-side functionality
- Server Components where appropriate
- Route Handlers where appropriate
- Server Actions where appropriate
- TypeScript

## Database

- Supabase PostgreSQL

## Authentication

- Supabase Auth

## Hosting

- Vercel

## Version Control

- GitHub

## Development Environment

- Antigravity

---

# 3. Environment Variables

Use environment variables.

Expected local file:

```text
.env.local
```

Initial variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Never hardcode credentials into source files.

Never commit `.env.local`.

Ensure `.gitignore` contains:

```gitignore
.env
.env.local
.env.*
```

An optional `.env.example` may be committed:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

# 4. Innov8IT Branding Requirements

The frontend must follow the approved Innov8IT branding.

Do not invent random colors or visual identity if brand assets are available.

The design should be:

- Modern
- Clean
- Professional
- Technology-focused
- Spacious
- Easy to scan
- Responsive
- Consistent

## Design System Must Cover

- Logo usage
- Primary color
- Secondary color
- Accent color
- Background colors
- Surface colors
- Text colors
- Muted text
- Border colors
- Success
- Warning
- Error
- Info
- Typography
- Heading sizes
- Body sizes
- Button styles
- Input styles
- Dropdown styles
- Table styles
- Card styles
- Modal styles
- Status badges
- Sidebar
- Top navigation
- Loading states
- Empty states
- Error states
- Spacing
- Border radius
- Shadows

Use CSS variables.

Example:

```css
:root {
  --brand-primary: #000000;
  --brand-secondary: #ffffff;
  --brand-accent: #000000;

  --bg-main: #f7f8fa;
  --bg-surface: #ffffff;

  --text-main: #111827;
  --text-muted: #6b7280;

  --border-color: #e5e7eb;

  --success: #16a34a;
  --warning: #d97706;
  --danger: #dc2626;
  --info: #2563eb;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
}
```

Replace placeholder brand colors with approved Innov8IT colors.

---

# 5. Suggested Project Structure

```text
app/
├── (auth)/
│   └── login/
├── dashboard/
├── employees/
├── attendance/
├── payroll/
│   ├── periods/
│   ├── runs/
│   └── review/
├── payslips/
├── reports/
├── settings/
└── api/

components/
├── layout/
├── forms/
├── tables/
├── employees/
├── attendance/
├── payroll/
└── ui/

lib/
├── supabase/
├── payroll/
├── validations/
├── permissions/
└── utils/

styles/
├── globals.css
├── variables.css
├── layout.css
├── components.css
└── pages.css

types/
├── employee.ts
├── attendance.ts
├── payroll.ts
├── auth.ts
└── database.ts
```

Avoid unnecessary folder complexity.

---

# 6. Core Application Flow

```text
Authentication
      ↓
Employee Setup
      ↓
Attendance / Time Entry
      ↓
Payroll Period
      ↓
Payroll Calculation
      ↓
Payroll Review
      ↓
Payroll Approval
      ↓
Payroll Locking
      ↓
Payslip Generation
      ↓
Payroll History / Reports
```

---

# 7. User Roles

Initial roles:

## Admin

May:

- Manage users
- Manage employees
- Manage payroll settings
- Run payroll
- Review payroll
- Approve payroll
- Unlock payroll if authorized
- View reports
- View audit logs

## Payroll / HR

May:

- Manage employee payroll data
- Enter attendance/time data
- Create payroll periods
- Process payroll
- Review payroll
- Generate payslips
- Access permitted reports

## Employee

May:

- Log in
- View their permitted profile data
- View their own payslips
- View their own payroll history if enabled

Permissions must be enforced at the database/server level.

Do not rely only on hiding frontend buttons.

---

# 8. Initial Database Areas

Plan for these entities:

```text
profiles
departments
positions
employees
payroll_settings
earning_types
deduction_types
attendance
payroll_periods
payroll_runs
payroll_run_items
employee_earnings
employee_deductions
payslips
audit_logs
```

Do not create all tables in Phase 1 unless Phase 1 explicitly requires it.

---

# 9. Employee Data Requirements

Suggested employee fields:

```text
id
employee_number
first_name
middle_name
last_name
email
department_id
position_id
employment_type
pay_type
basic_salary
hourly_rate
hire_date
status
created_at
updated_at
```

Possible employment types:

```text
regular
probationary
contractual
part_time
```

Possible pay types:

```text
monthly
daily
hourly
```

Possible employee status:

```text
active
inactive
terminated
```

---

# 10. Attendance and Time Requirements

The payroll system must support:

- Days worked
- Regular hours
- Overtime hours
- Night differential hours
- Late minutes
- Undertime
- Absences
- Holiday hours
- Rest day hours

## Night Differential

The system must capture:

```text
night_diff_hours
night_diff_rate
night_diff_pay
```

Night differential should be calculated through centralized payroll logic.

Do not calculate night differential directly inside UI components.

The qualifying schedule and percentage must follow approved company policy and applicable Philippine labor rules.

Keep relevant rates configurable where practical.

---

# 11. Payroll Earnings

Support:

- Basic pay
- Overtime pay
- Night differential pay
- Allowances
- Bonuses
- Holiday pay
- Rest day pay
- Other earnings

---

# 12. Payroll Deductions

Support:

- SSS
- PhilHealth
- Pag-IBIG
- Withholding tax
- Loans
- Absence deductions
- Late deductions
- Undertime deductions
- Other deductions

---

# 13. Payroll Calculation Flow

```text
Basic Pay
+ Overtime Pay
+ Night Differential Pay
+ Allowances
+ Bonuses
+ Holiday Pay
+ Rest Day Pay
+ Other Earnings
-------------------------
= Gross Pay

Gross Pay
- SSS
- PhilHealth
- Pag-IBIG
- Withholding Tax
- Loans
- Absence Deductions
- Late Deductions
- Undertime Deductions
- Other Deductions
-------------------------
= Net Pay
```

---

# 14. Payroll Calculation Architecture

Keep payroll calculations separate from frontend components.

Suggested structure:

```text
lib/payroll/
├── calculate-basic-pay.ts
├── calculate-overtime.ts
├── calculate-night-differential.ts
├── calculate-holiday-pay.ts
├── calculate-rest-day-pay.ts
├── calculate-government-contributions.ts
├── calculate-tax.ts
├── calculate-deductions.ts
├── calculate-gross-pay.ts
└── calculate-net-pay.ts
```

Calculation functions should:

- Be deterministic
- Be reusable
- Accept typed input
- Return typed output
- Be independently testable
- Avoid direct UI dependencies

---

# 15. Payroll Snapshot Requirement

Historical payroll must remain accurate even when employee settings change later.

When payroll is processed/finalized, save the values actually used.

A payroll snapshot may include:

```text
employee_id
employee_name_snapshot
employee_number_snapshot
department_snapshot
position_snapshot

basic_salary_snapshot
hourly_rate_snapshot

regular_hours
overtime_hours
night_diff_hours

basic_pay
overtime_pay
night_diff_rate
night_diff_pay

allowances
bonuses
holiday_pay
rest_day_pay
other_earnings

gross_pay

sss
philhealth
pagibig
withholding_tax
loans
absence_deduction
late_deduction
undertime_deduction
other_deductions

total_deductions
net_pay
```

Do not recalculate historical payroll using an employee's current salary.

---

# 16. Payroll Status Flow

Suggested payroll statuses:

```text
draft
processing
review
approved
paid
locked
```

Rules:

- Draft can be edited.
- Processing may be recalculated.
- Review should show calculation details.
- Approved requires authorized approval.
- Paid indicates the payroll was released/processed.
- Locked prevents ordinary edits.

Any unlock/reopen action must be permission-controlled and audited.

---

# 17. Payslip Requirements

Payslips must follow Innov8IT branding.

Include:

- Innov8IT logo
- Employee name
- Employee number
- Department
- Position
- Payroll period
- Pay date

## Earnings Section

- Basic pay
- Overtime pay
- Night differential pay
- Allowances
- Bonuses
- Holiday pay
- Rest day pay
- Other earnings

## Deductions Section

- SSS
- PhilHealth
- Pag-IBIG
- Withholding tax
- Loans
- Absence
- Late
- Undertime
- Other deductions

## Totals

- Gross pay
- Total deductions
- Net pay

Employees must not be able to access another employee's payslip.

---

# 18. Philippine Payroll Requirements

A later phase must support approved current Philippine payroll calculations for:

- SSS
- PhilHealth
- Pag-IBIG
- Withholding tax
- Overtime
- Night differential
- Rest day work
- Regular holidays
- Special holidays
- Relevant combinations of overtime/night work/rest days/holidays

Important:

- Do not guess legal rates.
- Use approved/current official rules when this phase is implemented.
- Preserve effective dates/versioning when practical.
- Keep configurable values outside UI code.

---

# 19. Security Requirements

Payroll data is sensitive.

Implement:

- Supabase Row Level Security
- Role-based access
- Server-side authorization
- Employee-specific payslip access
- Protected salary information
- Protected payroll records
- Secure environment variables
- Input validation
- Database constraints
- Audit logs

Do not trust client-side checks alone.

---

# 20. Audit Log Requirements

Track important actions including:

```text
User login
Employee created
Employee updated
Employee salary changed
Attendance created
Attendance updated
Payroll period created
Payroll calculated
Payroll recalculated
Payroll reviewed
Payroll approved
Payroll unlocked
Payroll marked paid
Payslip generated
Payroll setting changed
```

Each log should include:

- Action
- Actor/user
- Target entity
- Target ID where applicable
- Timestamp
- Relevant metadata where appropriate

---

# 21. Reports

Plan for:

- Payroll summary
- Employee payroll history
- Earnings report
- Deduction report
- Department payroll totals
- SSS summary
- PhilHealth summary
- Pag-IBIG summary
- Withholding tax summary
- Overtime summary
- Night differential summary

Exports may be added later if approved.

---

# 22. Testing Requirements

Test:

- Login
- Logout
- Protected routes
- Role permissions
- RLS
- Employee CRUD
- Employee search
- Employee filters
- Attendance input
- Overtime
- Night differential
- Holiday calculations
- Gross pay
- Deductions
- Net pay
- Payroll snapshots
- Payroll approval
- Payroll locking
- Payroll unlocking
- Payslip permissions
- Reports
- Responsive layouts
- Error states
- Unauthorized access

Payroll calculations must use expected-result test cases.

---

# 23. Deployment Requirements

Deployment platform:

- Vercel

Database/auth:

- Supabase

Repository:

- GitHub

Before production:

1. Run local tests.
2. Check TypeScript errors.
3. Check build errors.
4. Check environment variables.
5. Check Supabase connection.
6. Check RLS.
7. Check authentication.
8. Check payroll calculations.
9. Check mobile layouts.
10. Check production permissions.

---

# 24. Implementation Phases

---

## PHASE 1 — Project Foundation

### Goal

Create only the technical and frontend foundation.

### Implement

- Verify/create Next.js project
- Use TypeScript
- Use plain CSS
- Configure project structure
- Create global styles
- Create CSS variables
- Create base application layout
- Create basic reusable UI primitives
- Create placeholder Login page UI
- Create placeholder Dashboard page UI
- Create sidebar
- Create top navigation
- Make layout responsive
- Prepare Supabase configuration files
- Prepare `.env.local` usage
- Ensure `.gitignore` protects environment files

### Do NOT implement yet

- Real Supabase database tables
- Payroll calculation
- Employees CRUD
- Attendance
- Government contributions
- Night differential calculation logic
- Payroll runs
- Payslips
- Reports
- Audit logs

### Phase 1 Completion Criteria

- App runs locally
- TypeScript compiles
- No Tailwind
- No Bootstrap
- Plain CSS works
- Login screen exists visually
- Dashboard shell exists visually
- Sidebar/topbar work responsively
- Supabase configuration foundation exists
- Environment files are protected
- No Phase 2+ business logic was implemented

---

## PHASE 2 — Innov8IT Design System

### Goal

Finalize the approved visual language.

### Implement

- Actual Innov8IT logo
- Approved colors
- Typography
- Buttons
- Inputs
- Cards
- Tables
- Badges
- Modals
- Sidebar styles
- Topbar styles
- Loading states
- Empty states
- Error states
- Responsive design system

### Do NOT implement

- Employee CRUD logic
- Payroll calculations
- Attendance logic

---

## PHASE 3 — Supabase Authentication

### Goal

Implement secure login and session handling.

### Implement

- Supabase client/server configuration
- Login
- Logout
- Session handling
- Protected routes
- Profile/role foundation
- Auth error handling

### Do NOT implement

- Full employee module
- Payroll calculations

---

## PHASE 4 — Employee Management

### Goal

Implement employee master data.

### Implement

- Departments
- Positions
- Employees table/schema
- Employee list
- Add employee
- Edit employee
- Employee profile
- Search
- Filters
- Active/inactive status
- Pay type
- Salary/rate data
- Validation
- Appropriate RLS

---

## PHASE 5 — Payroll Configuration

### Goal

Create payroll settings and earning/deduction categories.

### Implement

- Payroll frequency
- Earning types
- Deduction types
- Configurable overtime rate
- Configurable night differential rate
- Holiday rate settings
- Rest day rate settings
- Allowance types
- Bonus types
- Loan categories
- Other earning/deduction categories

---

## PHASE 6 — Attendance and Time Inputs

### Goal

Capture payroll-relevant time data.

### Implement

- Days worked
- Regular hours
- Overtime hours
- Night differential hours
- Late minutes
- Undertime
- Absences
- Holiday hours
- Rest day hours
- Manual entry UI
- Validation
- Employee/pay-period relationship

---

## PHASE 7 — Payroll Calculation Engine

### Goal

Implement centralized payroll calculations.

### Implement

- Basic pay
- Overtime
- Night differential
- Holiday pay
- Rest day pay
- Allowances
- Bonuses
- Gross pay
- Deductions
- Net pay

### Requirement

Keep logic under `lib/payroll/`.

Do not place payroll formulas directly in page components.

---

## PHASE 8 — Payroll Periods and Payroll Runs

### Goal

Create payroll processing workflows.

### Implement

- Payroll periods
- Payroll runs
- Payroll run items
- Status workflow
- Payroll snapshots
- Recalculation rules
- Historical preservation

---

## PHASE 9 — Payroll Review and Approval

### Goal

Add controlled payroll review.

### Implement

- Review table
- Employee payroll breakdown
- Gross pay
- Earnings
- Overtime
- Night differential
- Deductions
- Net pay
- Approval action
- Approver record
- Approval timestamp
- Locking
- Permission-controlled unlocking
- Audit events

---

## PHASE 10 — Payslips

### Goal

Generate secure Innov8IT payslips.

### Implement

- Payslip page
- Earnings
- Deductions
- Gross
- Net
- Payroll period
- Employee info
- Innov8IT branding
- Employee-specific permissions

---

## PHASE 11 — Philippine Payroll Rules

### Goal

Implement approved current Philippine payroll compliance calculations.

### Implement

- SSS
- PhilHealth
- Pag-IBIG
- Withholding tax
- Overtime rules
- Night differential rules
- Rest day rules
- Holiday rules

Use verified official/current rules.

---

## PHASE 12 — Reports

### Goal

Provide payroll reporting.

### Implement

- Payroll summary
- Employee history
- Earnings report
- Deduction report
- Department totals
- Government contribution summaries
- Tax summary
- Overtime summary
- Night differential summary

---

## PHASE 13 — Audit and Security Hardening

### Goal

Strengthen production security.

### Implement

- Full RLS review
- Server-side permission checks
- Audit log coverage
- Sensitive-data review
- Validation review
- Unauthorized-access testing

---

## PHASE 14 — Testing ✅ COMPLETE

### Goal

Verify production readiness.

### Implement

- ✅ Unit tests for payroll calculations (Phase 7 engine — 49 tests)
- ✅ Integration tests — full payroll lifecycle Draft→Review→Approved→Paid→Locked (18 tests)
- ✅ Permission tests — route guard access matrix (Admin/HR/Employee) (18 tests)
- ✅ RLS tests — data isolation, append-only audit log, PII masking (18 tests)
- ✅ UI workflow tests — employee search/filter, CSV export, currency formatting (14 tests)
- ✅ Responsive testing — mobile overflow, grid breakpoints, timecard guardrails (14 tests)
- ✅ Edge cases — zero hours, salary caps, 13th month thresholds, negative net pay (21 tests)
- ✅ Error handling — workflow state guards, unauthorized action rejection (21 tests)

### Verification Results

| Suite | Tests | Result |
|---|---|---|
| Phase 7 Calculation Engine | 49 | ✅ PASS |
| Phase 11 Philippine Statutory Compliance | 49 | ✅ PASS |
| Phase 12 Payroll Reports & Analytics | 21 | ✅ PASS |
| Phase 13 Audit & Security Hardening | 17 | ✅ PASS |
| Phase 14 Edge Cases & Error Handling | 21 | ✅ PASS |
| Phase 14 Integration Lifecycle Workflow | 18 | ✅ PASS |
| Phase 14 RLS & Permissions Security | 18 | ✅ PASS |
| Phase 14 UI Workflow & Responsive | 14 | ✅ PASS |
| **TOTAL** | **177** | **✅ ALL PASSED** |

- ✅ `npm test` — 177 passed, 0 failed
- ✅ `npm run type-check` — 0 TypeScript errors
- ✅ `npm test` exits with code 0 (production ready)

---

## PHASE 15 — Vercel Deployment

### Goal

Deploy production application.

### Implement

- GitHub integration
- Vercel project configuration
- Environment variables
- Production build
- Production Supabase verification
- Authentication verification
- RLS verification
- Payroll smoke tests
- Responsive smoke tests

---

# 25. Standard Antigravity Completion Report

At the end of every phase, return:

## Phase Completed

State the phase number and name.

## Files Created

List every new file.

## Files Modified

List every changed file.

## Database Changes

List migrations/tables/policies, or state:

```text
No database changes.
```

## Tests / Checks Performed

List:

- TypeScript check
- Build check
- Tests
- Manual checks

## Remaining Issues

List any issues.

If none:

```text
None.
```

## Scope Confirmation

Explicitly state:

```text
No future phases were implemented.
```

Then STOP.

---

# 26. FIRST IMPLEMENTATION COMMAND

Use this when starting the project:

```text
Implement PHASE 1 — Project Foundation ONLY.

Follow the attached Innov8IT Payroll Web App Implementation Plan as the source of truth.

Important:
- Do not implement Phase 2 or any later phase.
- Do not create payroll calculations.
- Do not create employee CRUD.
- Do not create attendance logic.
- Do not create government contribution logic.
- Do not create night differential calculation logic yet.
- Do not create payslips or reports.
- Use Next.js + TypeScript.
- Use semantic TSX/HTML-style markup.
- Use plain CSS only.
- Do not use Tailwind or Bootstrap.
- Preserve the existing repository structure where reasonable.
- Inspect existing files before making changes.
- Do not delete working existing code unless required.
- At completion, provide the Standard Antigravity Completion Report and stop.
```

---

# 27. Definition of Done for MVP

The MVP is complete when an authorized payroll user can:

```text
Log in
→ Manage employees
→ Enter payroll-relevant attendance/time
→ Create payroll periods
→ Calculate payroll
→ Include overtime
→ Include night differential
→ Add earnings and deductions
→ Review payroll
→ Approve payroll
→ Lock payroll
→ Generate payslips
→ Review payroll history
→ View reports
```

The application must:

- Follow Innov8IT branding
- Preserve historical payroll data
- Enforce user permissions
- Protect sensitive payroll information
- Use Supabase securely
- Be responsive
- Be deployable through Vercel
- Be maintained through GitHub
