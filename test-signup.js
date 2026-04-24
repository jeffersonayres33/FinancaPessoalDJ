import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://xyz.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'fake';

const client = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  try {
    const email = `test-member-${Date.now()}@example.com`;
    const res = await client.auth.signUp({
        email,
        password: "password123",
        options: {
            data: { name: "Test Member" }
        }
    });
    console.log('signUp returned:', res.data?.user?.email, res.error);
  } catch (e) {
    console.error('script error:', e);
  }
}
run();
