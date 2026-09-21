export type EmploymentType = 'regular' | 'probationary' | 'contractual' | 'part_time';

export type PayType = 'monthly' | 'daily' | 'hourly';

export type EmployeeStatus = 'active' | 'inactive' | 'terminated';

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
}

export interface Position {
  id: string;
  department_id: string | null;
  title: string;
  description: string | null;
  created_at: string;
  department?: Department | null;
}

export interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  department_id: string | null;
  position_id: string | null;
  employment_type: EmploymentType;
  pay_type: PayType;
  basic_salary: number;
  hourly_rate: number;
  hire_date: string;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
}

export interface EmployeeWithRelations extends Employee {
  department?: Department | null;
  position?: Position | null;
}

export interface EmployeeFormData {
  employee_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  department_id: string;
  position_id: string;
  employment_type: EmploymentType;
  pay_type: PayType;
  basic_salary: number;
  hourly_rate: number;
  hire_date: string;
  status: EmployeeStatus;
}

export interface EmployeeFilters {
  search?: string;
  department_id?: string;
  status?: EmployeeStatus | 'all';
  employment_type?: EmploymentType | 'all';
  pay_type?: PayType | 'all';
}
