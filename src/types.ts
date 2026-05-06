export interface Member {
  id: string;
  organization_id: string;
  user_id: string | null;
  role: 'admin' | 'staff';
  name: string;
  last_name?: string;
  slug: string;
  phone?: string | null;
  birth_date?: string | null;
  avatar_url?: string | null;
  cpf?: string | null;
  rg?: string | null;
  gender?: string | null;
  cep?: string | null;
  address?: string | null;
  address_number?: string | null;
  city?: string | null;
  state?: string | null;
  can_edit_profile: boolean;
  can_edit_price: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  allow_staff_price_edit: boolean;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  price: number;
  organization_id: string;
}
