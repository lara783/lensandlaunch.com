-- ─── Services (Rate Card) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category         text NOT NULL,
  name             text NOT NULL,
  resource         text,
  charge_out_rate  numeric(10,2) NOT NULL,
  unit             text NOT NULL DEFAULT 'hourly' CHECK (unit IN ('hourly', 'fixed')),
  active           boolean NOT NULL DEFAULT true,
  sort_order       int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage services"
  ON services FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── COGS Items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cogs_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  cost         numeric(10,2) NOT NULL,
  unit         text NOT NULL DEFAULT 'monthly' CHECK (unit IN ('monthly', 'annual', 'per_use')),
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cogs_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage cogs"
  ON cogs_items FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ─── Seed: Services ───────────────────────────────────────────────────────────
INSERT INTO services (category, name, resource, charge_out_rate, unit, sort_order) VALUES
  ('Strategy & Consulting', 'Strategy & Consulting', 'Lara', 200.00, 'hourly', 10),
  ('Strategy & Consulting', 'Copywriting', 'Lara', 150.00, 'hourly', 20),

  ('Photo', 'Photography – Shoot Day', 'Lara', 200.00, 'hourly', 30),
  ('Photo', 'Photography – Editing', 'Lara', 100.00, 'hourly', 40),
  ('Photo', 'Photography – Half Day', 'Lara', 800.00, 'fixed', 50),
  ('Photo', 'Photography – Full Day', 'Lara', 1500.00, 'fixed', 60),

  ('Video', 'Videography – Shoot Day', 'Lara', 200.00, 'hourly', 70),
  ('Video', 'Videography – Editing', 'Lara', 100.00, 'hourly', 80),
  ('Video', 'Videography – Half Day', 'Lara', 800.00, 'fixed', 90),
  ('Video', 'Videography – Full Day', 'Lara', 1500.00, 'fixed', 100),

  ('Project Management', 'Project Management', 'Lara', 150.00, 'hourly', 110),
  ('Project Management', 'Account Management', 'Lara', 150.00, 'hourly', 120),

  ('Retainer', 'Monthly Content Retainer – Starter', 'Lara', 2000.00, 'fixed', 130),
  ('Retainer', 'Monthly Content Retainer – Growth',  'Lara', 3500.00, 'fixed', 140),
  ('Retainer', 'Monthly Content Retainer – Premium', 'Lara', 5500.00, 'fixed', 150)
ON CONFLICT DO NOTHING;

-- ─── Seed: COGS ───────────────────────────────────────────────────────────────
INSERT INTO cogs_items (name, cost, unit, sort_order) VALUES
  ('Adobe Creative Cloud', 89.99,  'monthly', 10),
  ('Frame.io',             15.00,  'monthly', 20),
  ('Notion',               16.00,  'monthly', 30),
  ('Google Workspace',     14.00,  'monthly', 40),
  ('Canva Pro',            24.99,  'monthly', 50),
  ('Dropbox',              20.00,  'monthly', 60),
  ('Camera Insurance',     100.00, 'monthly', 70),
  ('Equipment Hire',       150.00, 'per_use', 80)
ON CONFLICT DO NOTHING;
