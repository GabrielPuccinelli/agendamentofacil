// src/types.ts

export interface Member {
  id: string;
  organization_id: string;
  user_id: string;
  role: "admin" | "staff";
  name: string;
  slug: string;
  can_edit_profile: boolean;
}