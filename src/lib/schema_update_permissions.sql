-- Add can_edit_profile column to members table
ALTER TABLE members
ADD
  COLUMN can_edit_profile BOOLEAN DEFAULT FALSE;

-- Clear existing policies before recreating them
DROP POLICY IF EXISTS "Allow staff to update their own profile" ON members;

-- Add new policy to allow staff to update their can_edit_profile status if they have permission
CREATE POLICY "Allow staff to update their own profile" ON members FOR UPDATE USING (
  user_id = auth.uid ()
  AND can_edit_profile = TRUE
)
WITH
  CHECK (user_id = auth.uid ());