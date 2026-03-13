
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pbrbqwjbzjebhlfcfmtk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yf2bUxlTHW2MqNxpvqWlZg_2qBgkC2E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: { 'x-application-name': 'financas-pessoais' }
  }
});

// Intercepta erros globais de token de atualização inválido do Supabase
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const errorMessage = reason?.message || (typeof reason === 'string' ? reason : '');
    
    if (errorMessage.includes('Refresh Token') || errorMessage.includes('refresh_token')) {
      console.warn('Supabase Refresh Token Error capturado globalmente:', errorMessage);
      event.preventDefault(); 
      
      // Limpeza agressiva
      localStorage.removeItem('finances_current_user');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Tenta deslogar no cliente mas ignora erros
      supabase.auth.signOut().catch(() => {});
      
      // Recarrega para limpar estado da memória e forçar AuthScreen
      window.location.reload();
    }
  });
}

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
