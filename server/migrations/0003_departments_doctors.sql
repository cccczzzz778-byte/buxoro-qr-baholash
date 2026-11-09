CREATE TABLE IF NOT EXISTS medical_departments (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_medical_department_name ON medical_departments(institution_id, lower(name));
CREATE TABLE IF NOT EXISTS medical_doctors (
  id TEXT PRIMARY KEY,
  department_id TEXT NOT NULL REFERENCES medical_departments(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  specialty TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_medical_doctor_name ON medical_doctors(department_id, lower(full_name));
CREATE INDEX IF NOT EXISTS idx_medical_departments_institution ON medical_departments(institution_id);
CREATE INDEX IF NOT EXISTS idx_medical_doctors_department ON medical_doctors(department_id);
