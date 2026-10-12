-- ==============================================================================
-- Innov8IT Payroll - Update Departments to 4 Designated Core Departments
-- 1. Internal Department (INT)
-- 2. Tech Department (TECH)
-- 3. Creative Department (CREATIVE)
-- 4. QA Department (QA)
-- ==============================================================================

-- 1. Clear or reassign existing positions and departments cleanly
DELETE FROM public.positions;
DELETE FROM public.departments;

-- 2. Insert the 4 designated departments
INSERT INTO public.departments (id, name, code, description)
VALUES
  ('00000000-0000-0000-0000-000000000011', 'Internal Department', 'INT', 'Internal administration, operations, human resources, and general company affairs'),
  ('00000000-0000-0000-0000-000000000012', 'Tech Department', 'TECH', 'Software development, systems architecture, IT infrastructure, and technical platforms'),
  ('00000000-0000-0000-0000-000000000013', 'Creative Department', 'CREATIVE', 'Creative direction, UI/UX design, multimedia production, and brand design'),
  ('00000000-0000-0000-0000-000000000014', 'QA Department', 'QA', 'Quality assurance, test automation, software verification, and compliance testing')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    code = EXCLUDED.code,
    description = EXCLUDED.description;

-- 3. Insert standard positions for the 4 departments
INSERT INTO public.positions (id, department_id, title, description)
VALUES
  -- Internal Department
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011', 'CEO', 'Chief Executive Officer and strategic executive leadership'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000011', 'Operations Manager', 'Directs company operations, internal workflows, and operational execution'),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000011', 'HR/Admin', 'Human resources management, payroll administration, and office operations'),

  -- Tech Department
  ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000012', 'Sr. Tech', 'Senior technical lead, software architecture, and systems engineering'),
  ('00000000-0000-0000-0000-000000000025', '00000000-0000-0000-0000-000000000012', 'Jr. Tech', 'Junior technical engineer, software development, and systems support'),

  -- Creative Department
  ('00000000-0000-0000-0000-000000000026', '00000000-0000-0000-0000-000000000013', 'Creative Head', 'Creative direction, brand identity, and design strategy'),
  ('00000000-0000-0000-0000-000000000027', '00000000-0000-0000-0000-000000000013', 'UI/UX Designer', 'Designs intuitive user interfaces, wireframes, and design systems'),
  ('00000000-0000-0000-0000-000000000028', '00000000-0000-0000-0000-000000000013', 'Video Editor', 'Video production, motion graphics, audio editing, and video post-production'),

  -- QA Department
  ('00000000-0000-0000-0000-000000000029', '00000000-0000-0000-0000-000000000014', 'Sr. Tech', 'Senior quality assurance specialist and test automation lead'),
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000014', 'Jr. Tech', 'Junior quality assurance tester and validation support')
ON CONFLICT (id) DO UPDATE
SET department_id = EXCLUDED.department_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description;
