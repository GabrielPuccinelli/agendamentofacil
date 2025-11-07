-- Create organizations table
CREATE TABLE
  organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users (id)
  );

-- Create members table
CREATE TABLE
  members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
    role TEXT NOT NULL
  );

-- Create services table
CREATE TABLE
  services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name TEXT NOT NULL,
    organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
    duration INT NOT NULL
  );

-- Create member_services join table
CREATE TABLE
  member_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    member_id UUID REFERENCES members (id) ON DELETE CASCADE,
    service_id UUID REFERENCES services (id) ON DELETE CASCADE,
    UNIQUE (member_id, service_id)
  );

-- Create availability table
CREATE TABLE
  availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    member_id UUID REFERENCES members (id) ON DELETE CASCADE,
    day_of_week INT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    UNIQUE (member_id, day_of_week)
  );

-- Create bookings table
CREATE TABLE
  bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    member_id UUID REFERENCES members (id),
    service_id UUID REFERENCES services (id),
    start_time TIMESTAMP
    WITH
      TIME ZONE NOT NULL,
      end_time TIMESTAMP
    WITH
      TIME ZONE NOT NULL,
      client_name TEXT,
      client_email TEXT,
      client_phone TEXT
  );

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role (user_id UUID, organization_id UUID) RETURNS TEXT AS $$
DECLARE
  role TEXT;
BEGIN
  SELECT
    m.role INTO role
  FROM
    members m
  WHERE
    m.user_id = user_id
    AND m.organization_id = organization_id;
  RETURN role;
END;
$$ LANGUAGE plpgsql;

-- Function to get user organization id
CREATE OR REPLACE FUNCTION get_user_organization_id (user_id UUID) RETURNS UUID AS $$
DECLARE
  organization_id UUID;
BEGIN
  SELECT
    m.organization_id INTO organization_id
  FROM
    members m
  WHERE
    m.user_id = user_id;
  RETURN organization_id;
END;
$$ LANGUAGE plpgsql;