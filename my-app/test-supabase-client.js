// Test Supabase client creation
require("dotenv").config();

console.log("🔍 Testing Supabase Client Creation...");

// Check environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Environment Variables:");
console.log("URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
console.log("Key:", supabaseKey ? "✅ Set" : "❌ Missing");

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing environment variables!");
  process.exit(1);
}

// Test client creation
try {
  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("✅ Supabase client created successfully");
  console.log("Client URL:", supabase.supabaseUrl);
  console.log("Client Key Length:", supabase.supabaseKey?.length || 0);

  // Test a simple query
  supabase
    .from("teams")
    .select("count")
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error("❌ Query test failed:", error.message);
      } else {
        console.log("✅ Query test successful:", data);
      }
    })
    .catch((err) => {
      console.error("❌ Query test error:", err.message);
    });
} catch (error) {
  console.error("❌ Client creation failed:", error.message);
}






