const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Environment variables not loaded correctly!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPolicies() {
  try {
    console.log("📡 Querying RLS policies from PostgreSQL pg_policies catalog...");
    const { data, error } = await supabase
      .from('partners') // wait, pg_policies is a catalog, we need to run custom SQL or check if pg_policies is queryable directly
      // In Supabase, catalog tables are not exposed via Postgrest REST API unless they are in public schema.
      // But we can run an RPC or custom query if we have an RPC, or we can use the supabase client to run an raw sql query?
      // Wait! Supabase client doesn't support raw SQL queries directly from client library unless we use an RPC.
      // Wait, is there any standard RPC we can call? Usually no.
      // But wait! Can we run it using a postgres driver in node?
      // Yes! Since we have the connection string or we can install pg? But we don't have pg connection string directly (only SUPABASE_URL).
      // Wait, let's see if we can check it by fetching partners with different headers!
      .select('id');
      
    console.log("Partners select succeeded.");
  } catch (err) {
    console.error("❌ Exception:", err.message);
  }
}

// Let's query partners using different headers!
async function checkWithHeader() {
  try {
    // 1. Try with target owner_id: 9fc1d204-b8ad-4eb5-a8ec-59bc38770739
    const testUid = "9fc1d204-b8ad-4eb5-a8ec-59bc38770739";
    const customSupabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY, {
      global: {
        headers: {
          'x-custom-user-id': testUid
        }
      }
    });
    
    console.log(`📡 Querying partners with custom header 'x-custom-user-id': '${testUid}'...`);
    const { data, error } = await customSupabase
      .from('partners')
      .select('id, name');
      
    if (error) {
      console.error("❌ Error with custom header:", error.message);
      return;
    }
    
    console.log(`Query succeeded! Returned ${data.length} rows.`);
    if (data.length > 0) {
      console.log("First row:", data[0]);
    }
    
  } catch (err) {
    console.error("❌ Exception:", err.message);
  }
}

checkWithHeader();
