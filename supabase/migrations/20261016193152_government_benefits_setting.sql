-- Persist the statutory control used by payroll calculation and Settings.
alter table public.payroll_settings
  add column if not exists enable_statutory_deductions boolean not null default true;

comment on column public.payroll_settings.enable_statutory_deductions is
  'Enables automatic SSS, PhilHealth, Pag-IBIG and withholding tax calculations for payroll runs.';
