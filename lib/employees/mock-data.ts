import { Department, Position, EmployeeWithRelations } from '@/types/employee';

export const fallbackDepartments: Department[] = [
  {
    id: '00000000-0000-0000-0000-000000000011',
    name: 'Internal Department',
    code: 'INT',
    description: 'Internal administration, operations, human resources, and general company affairs',
    created_at: '2026-09-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    name: 'Tech Department',
    code: 'TECH',
    description: 'Software development, systems architecture, IT infrastructure, and technical platforms',
    created_at: '2026-09-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000013',
    name: 'Creative Department',
    code: 'CREATIVE',
    description: 'Creative direction, UI/UX design, multimedia production, and brand design',
    created_at: '2026-09-01T00:00:00.000Z',
  },
  {
    id: '00000000-0000-0000-0000-000000000014',
    name: 'QA Department',
    code: 'QA',
    description: 'Quality assurance, test automation, software verification, and compliance testing',
    created_at: '2026-09-01T00:00:00.000Z',
  },
];

export const fallbackPositions: Position[] = [
  // 1. Internal Department (00000000-0000-0000-0000-000000000011)
  {
    id: '00000000-0000-0000-0000-000000000021',
    department_id: '00000000-0000-0000-0000-000000000011',
    title: 'CEO',
    description: 'Chief Executive Officer and strategic executive leadership',
    created_at: '2026-09-01T00:00:00.000Z',
    department: fallbackDepartments[0],
  },
  {
    id: '00000000-0000-0000-0000-000000000022',
    department_id: '00000000-0000-0000-0000-000000000011',
    title: 'Operations Manager',
    description: 'Directs company operations, internal workflows, and operational execution',
    created_at: '2026-09-01T00:00:00.000Z',
    department: fallbackDepartments[0],
  },
  {
    id: '00000000-0000-0000-0000-000000000023',
    department_id: '00000000-0000-0000-0000-000000000011',
    title: 'HR/Admin',
    description: 'Human resources management, payroll administration, and office operations',
    created_at: '2026-09-01T00:00:00.000Z',
    department: fallbackDepartments[0],
  },

  // 2. Tech Department (00000000-0000-0000-0000-000000000012)
  {
    id: '00000000-0000-0000-0000-000000000024',
    department_id: '00000000-0000-0000-0000-000000000012',
    title: 'Sr. Tech',
    description: 'Senior technical lead, software architecture, and systems engineering',
    created_at: '2026-09-01T00:00:00.000Z',
    department: fallbackDepartments[1],
  },
  {
    id: '00000000-0000-0000-0000-000000000025',
    department_id: '00000000-0000-0000-0000-000000000012',
    title: 'Jr. Tech',
    description: 'Junior technical engineer, software development, and systems support',
    created_at: '2026-09-01T00:00:00.000Z',
    department: fallbackDepartments[1],
  },

  // 3. Creative Department (00000000-0000-0000-0000-000000000013)
  {
    id: '00000000-0000-0000-0000-000000000026',
    department_id: '00000000-0000-0000-0000-000000000013',
    title: 'Creative Head',
    description: 'Creative direction, brand identity, and design strategy',
    created_at: '2026-09-01T00:00:00.000Z',
    department: fallbackDepartments[2],
  },
  {
    id: '00000000-0000-0000-0000-000000000027',
    department_id: '00000000-0000-0000-0000-000000000013',
    title: 'UI/UX Designer',
    description: 'Designs intuitive user interfaces, wireframes, and design systems',
    created_at: '2026-09-01T00:00:00.000Z',
    department: fallbackDepartments[2],
  },
  {
    id: '00000000-0000-0000-0000-000000000028',
    department_id: '00000000-0000-0000-0000-000000000013',
    title: 'Video Editor',
    description: 'Video production, motion graphics, audio editing, and video post-production',
    created_at: '2026-09-01T00:00:00.000Z',
    department: fallbackDepartments[2],
  },

  // 4. QA Department (00000000-0000-0000-0000-000000000014)
  {
    id: '00000000-0000-0000-0000-000000000029',
    department_id: '00000000-0000-0000-0000-000000000014',
    title: 'Sr. Tech',
    description: 'Senior quality assurance specialist and test automation lead',
    created_at: '2026-09-01T00:00:00.000Z',
    department: fallbackDepartments[3],
  },
  {
    id: '00000000-0000-0000-0000-000000000030',
    department_id: '00000000-0000-0000-0000-000000000014',
    title: 'Jr. Tech',
    description: 'Junior quality assurance tester and validation support',
    created_at: '2026-09-01T00:00:00.000Z',
    department: fallbackDepartments[3],
  },
];

export const fallbackEmployees: EmployeeWithRelations[] = [];
