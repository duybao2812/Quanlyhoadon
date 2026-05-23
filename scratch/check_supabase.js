const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Environment variables not loaded correctly!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  try {
    console.log("📡 Querying partners from Supabase...");
    const { data, error } = await supabase
      .from('partners')
      .select('id, name, owner_id')
      .limit(5);
      
    if (error) {
      console.error("❌ Error querying partners:", error.message);
      return;
    }
    
    console.log("partners data query results (first 5 rows):");
    console.log(JSON.stringify(data, null, 2));
    
  } catch (err) {
    console.error("❌ Exception:", err.message);
  }
}

checkData();
