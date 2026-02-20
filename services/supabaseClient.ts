
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pbrbqwjbzjebhlfcfmtk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yf2bUxlTHW2MqNxpvqWlZg_2qBgkC2E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
