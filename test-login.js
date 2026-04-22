const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://pbrbqwjbzjebhlfcfmtk.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yf2bUxlTHW2MqNxpvqWlZg_2qBgkC2E';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test_schema_error@email.com',
    password: 'MudarSenha123!'
  });
  console.log('Result:', data, error);
}
run();
