import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://xyz.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fake';

console.log("URL:", url);
console.log("KEY HEAD:", key.substring(0, 10));

const client = createClient(url, key);

async function run() {
  try {
    const res = await client.auth.admin.listUsers();
    console.log('listUsers returned:', res.data?.users?.length, res.error);
    
    // Create random user
    const email = `test-${Date.now()}@example.com`;
    const res2 = await client.auth.admin.createUser({
        email,
        password: "password123",
        email_confirm: true,
        user_metadata: { name: "Test" }
    });
    console.log('createUser returned:', res2.data?.user?.email, res2.error);

    if (res2.data?.user?.id) {
        console.log('cleaning up...');
        await client.auth.admin.deleteUser(res2.data.user.id);
    }
  } catch (e) {
    console.error('script error:', e);
  }
}
run();
