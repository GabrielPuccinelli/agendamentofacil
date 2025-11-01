// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

// --- Pegue essas informações no seu painel do Supabase ---
// 1. Vá em Settings (Ícone de engrenagem)
// 2. Clique em 'API'
// 3. Copie a 'Project URL' e a 'API Key' (a 'anon public')
// --------------------------------------------------------

const supabaseUrl = "https://yyekxiajifeyfuabdasv.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5ZWt4aWFqaWZleWZ1YWJkYXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2Njc1NDQsImV4cCI6MjA3NzI0MzU0NH0.jcaEnkdhRrheYkLCFSZXYL1PvZeWWWlloEBFjmo39EY"

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL ou Anon Key não foram definidas!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)