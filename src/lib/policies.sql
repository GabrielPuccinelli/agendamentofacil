-- Enable RLS for all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Clear existing policies
DROP POLICY IF EXISTS "Allow public read access to organizations" ON organizations;
DROP POLICY IF EXISTS "Allow admin full access to organizations" ON organizations;
DROP POLICY IF EXISTS "Allow public read access to members" ON members;
DROP POLICY IF EXISTS "Allow admin full access to members" ON members;
DROP POLICY IF EXISTS "Allow staff to view their own membership" ON members;
DROP POLICY IF EXISTS "Allow public read access to services" ON services;
DROP POLICY IF EXISTS "Allow admin full access to services" ON services;
DROP POLICY IF EXISTS "Allow public read access to member_services" ON member_services;
DROP POLICY IF EXISTS "Allow admin full access to member_services" ON member_services;
DROP POLICY IF EXISTS "Allow staff to manage their own services" ON member_services;
DROP POLICY IF EXISTS "Allow public read access to availability" ON availability;
DROP POLICY IF EXISTS "Allow admin full access to availability" ON availability;
DROP POLICY IF EXISTS "Allow staff to manage their own availability" ON availability;
DROP POLICY IF EXISTS "Allow public read access to bookings" ON bookings;
DROP POLICY IF EXISTS "Allow admin full access to bookings" ON bookings;
DROP POLICY IF EXISTS "Allow staff to view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Allow clients to create bookings" ON bookings;

-- Policies for organizations
CREATE POLICY "Allow public read access to organizations" ON organizations FOR
SELECT
  USING (true);

CREATE POLICY "Allow admin full access to organizations" ON organizations FOR ALL USING (
  get_user_role (auth.uid (), id) = 'admin'
);

-- Policies for members
CREATE POLICY "Allow public read access to members" ON members FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to members" ON members FOR ALL USING (
  get_user_role (auth.uid (), organization_id) = 'admin'
);

CREATE POLICY "Allow staff to view their own membership" ON members FOR
SELECT
  USING (user_id = auth.uid ());

-- Policies for services
CREATE POLICY "Allow public read access to services" ON services FOR SELECT USING (true);

CREATE POLICY "Allow admin full access to services" ON services FOR ALL USING (
  get_user_role (auth.uid (), organization_id) = 'admin'
);

-- Policies for member_services
CREATE POLICY "Allow public read access to member_services" ON member_services FOR
SELECT
  USING (true);

CREATE POLICY "Allow admin full access to member_services" ON member_services FOR ALL USING (
  EXISTS (
    SELECT
      1
    FROM
      members m
    WHERE
      m.id = member_id
      AND get_user_role (auth.uid (), m.organization_id) = 'admin'
  )
);

CREATE POLICY "Allow staff to manage their own services" ON member_services FOR ALL USING (
  EXISTS (
    SELECT
      1
    FROM
      members m
    WHERE
      m.id = member_id
      AND m.user_id = auth.uid ()
  )
);

-- Policies for availability
CREATE POLICY "Allow public read access to availability" ON availability FOR
SELECT
  USING (true);

CREATE POLICY "Allow admin full access to availability" ON availability FOR ALL USING (
  EXISTS (
    SELECT
      1
    FROM
      members m
    WHERE
      m.id = member_id
      AND get_user_role (auth.uid (), m.organization_id) = 'admin'
  )
);

CREATE POLICY "Allow staff to manage their own availability" ON availability FOR ALL USING (
  EXISTS (
    SELECT
      1
    FROM
      members m
    WHERE
      m.id = member_id
      AND m.user_id = auth.uid ()
  )
);

-- Policies for bookings
CREATE POLICY "Allow public read access to bookings" ON bookings FOR
SELECT
  USING (true);

CREATE POLICY "Allow admin full access to bookings" ON bookings FOR ALL USING (
  EXISTS (
    SELECT
      1
    FROM
      members m
    WHERE
      m.id = member_id
      AND get_user_role (auth.uid (), m.organization_id) = 'admin'
  )
);

CREATE POLICY "Allow staff to view their own bookings" ON bookings FOR
SELECT
  USING (
    EXISTS (
      SELECT
        1
      FROM
        members m
      WHERE
        m.id = member_id
        AND m.user_id = auth.uid ()
    )
  );

CREATE POLICY "Allow clients to create bookings" ON bookings FOR INSERT
WITH
  CHECK (true);