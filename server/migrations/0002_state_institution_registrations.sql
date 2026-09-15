CREATE TABLE IF NOT EXISTS institution_registrations (
  id TEXT PRIMARY KEY,
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL,
  stir TEXT NOT NULL,
  district TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  director_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  review_note TEXT NOT NULL DEFAULT '',
  institution_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  reviewed_at TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS institution_registrations_stir_unique ON institution_registrations(stir);
CREATE INDEX IF NOT EXISTS institution_registrations_district_status_idx ON institution_registrations(district,status);
