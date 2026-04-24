import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://xyz.supabase.co';
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'fake';

const clientFalse = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  try {
    const res = await clientFalse.auth.getUser('dummy-token-123');
    console.log('clientFalse returned:', res);
  } catch (e) {
    console.error('clientFalse error:', e.name, e.message);
  }
}
run();
