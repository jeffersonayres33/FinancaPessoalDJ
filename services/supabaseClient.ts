
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pbrbqwjbzjebhlfcfmtk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yf2bUxlTHW2MqNxpvqWlZg_2qBgkC2E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const validateConfig = () => {
  if (!SUPABASE_URL || !SUPABASE_URL.includes('supabase.co')) {
    return { valid: false, message: 'URL do Supabase inválida.' };
  }
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.length < 20) {
    return { valid: false, message: 'Chave Anon do Supabase parece inválida (muito curta).' };
  }
  // Check for common mistake: using a publishable key from another service
  if (SUPABASE_ANON_KEY.startsWith('pk_') || SUPABASE_ANON_KEY.startsWith('sk_')) {
     return { valid: false, message: 'A chave parece ser de outro serviço (Stripe/Clerk?). Deve ser a chave "anon" do Supabase.' };
  }
  return { valid: true };
};
