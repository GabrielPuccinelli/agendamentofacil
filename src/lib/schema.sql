-- ETAPA 1: LIMPEZA COMPLETA (POLÍTICAS, TABELAS, FUNÇÕES)

-- Apaga todas as políticas de segurança existentes
DROP POLICY IF EXISTS "Allow authenticated users to create their own organization" ON organizations;
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

-- Apaga as funções antigas para evitar conflitos
DROP FUNCTION IF EXISTS get_user_role(uuid, uuid);
DROP FUNCTION IF EXISTS create_organization_and_member(text, text, text, text);
DROP FUNCTION IF EXISTS create_organization_and_admin(text,text,text,text,text,text,text,text);


-- Apaga as tabelas existentes para garantir um recomeço limpo
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS availability CASCADE;
DROP TABLE IF EXISTS member_services CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ETAPA 2: RECONSTRUÇÃO DO BANCO DE DADOS (TABELAS E FUNÇÕES)

-- Create organizations table
CREATE TABLE
  organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users (id),
    slug TEXT NOT NULL UNIQUE
  );

-- Create members table with all required columns
CREATE TABLE
  members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
    name TEXT,
    last_name TEXT,
    phone TEXT,
    birth_date DATE,
    address TEXT,
    slug TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    can_edit_profile BOOLEAN NOT NULL DEFAULT FALSE,
    avatar_url TEXT
  );

-- Create services table
CREATE TABLE
  services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    name TEXT NOT NULL,
    organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
    duration INT NOT NULL,
    price NUMERIC(10, 2)
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
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    client_name TEXT,
    client_email TEXT,
    client_phone TEXT
  );

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role (p_user_id UUID, p_organization_id UUID) RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT m.role INTO v_role FROM members m
  WHERE m.user_id = p_user_id AND m.organization_id = p_organization_id;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql;


-- ETAPA 3: REAPLICAR AS POLÍTICAS DE SEGURANÇA (RLS)

-- Enable RLS for all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policies for organizations
CREATE POLICY "Allow authenticated users to create their own organization" ON organizations FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Allow public read access to organizations" ON organizations FOR SELECT USING (true);
CREATE POLICY "Allow admin full access to organizations" ON organizations FOR ALL USING (get_user_role (auth.uid (), id) = 'admin');

-- Policies for members
CREATE POLICY "Allow public read access to members" ON members FOR SELECT USING (true);
CREATE POLICY "Allow admin full access to members" ON members FOR ALL USING (get_user_role (auth.uid (), organization_id) = 'admin');
CREATE POLICY "Allow staff to view their own membership" ON members FOR SELECT USING (user_id = auth.uid ());
-- Allow admins to create new members
CREATE POLICY "Allow admins to create members" ON members FOR INSERT WITH CHECK (get_user_role(auth.uid(), organization_id) = 'admin');


-- Policies for services
CREATE POLICY "Allow public read access to services" ON services FOR SELECT USING (true);
CREATE POLICY "Allow admin full access to services" ON services FOR ALL USING (get_user_role (auth.uid (), organization_id) = 'admin');

-- Policies for member_services
CREATE POLICY "Allow public read access to member_services" ON member_services FOR SELECT USING (true);
CREATE POLICY "Allow admin full access to member_services" ON member_services FOR ALL USING (EXISTS (SELECT 1 FROM members m WHERE m.id = member_id AND get_user_role (auth.uid (), m.organization_id) = 'admin'));
CREATE POLICY "Allow staff to manage their own services" ON member_services FOR ALL USING (EXISTS (SELECT 1 FROM members m WHERE m.id = member_id AND m.user_id = auth.uid ()));

-- Policies for availability
CREATE POLICY "Allow public read access to availability" ON availability FOR SELECT USING (true);
CREATE POLICY "Allow admin full access to availability" ON availability FOR ALL USING (EXISTS (SELECT 1 FROM members m WHERE m.id = member_id AND get_user_role (auth.uid (), m.organization_id) = 'admin'));
CREATE POLICY "Allow staff to manage their own availability" ON availability FOR ALL USING (EXISTS (SELECT 1 FROM members m WHERE m.id = member_id AND m.user_id = auth.uid ()));

-- Policies for bookings
CREATE POLICY "Allow public read access to bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Allow admin full access to bookings" ON bookings FOR ALL USING (EXISTS (SELECT 1 FROM members m WHERE m.id = member_id AND get_user_role (auth.uid (), m.organization_id) = 'admin'));
CREATE POLICY "Allow staff to view their own bookings" ON bookings FOR SELECT USING (EXISTS (SELECT 1 FROM members m WHERE m.id = member_id AND m.user_id = auth.uid ()));
CREATE POLICY "Allow clients to create bookings" ON bookings FOR INSERT WITH CHECK (true);
