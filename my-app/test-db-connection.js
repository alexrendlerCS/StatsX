// Test database connection script
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("🔍 Testing Database Connection...");
console.log("Supabase URL:", supabaseUrl ? "✅ Set" : "❌ Missing");
console.log("Supabase Key:", supabaseKey ? "✅ Set" : "❌ Missing");

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing environment variables!");
  console.log("Please check your .env file contains:");
  console.log("NEXT_PUBLIC_SUPABASE_URL=your_url");
  console.log("NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log("\n🧪 Testing basic connection...");

    // Test 1: Basic connection
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("*")
      .limit(3);

    if (teamsError) {
      console.error("❌ Teams table error:", teamsError.message);
    } else {
      console.log("✅ Teams table:", teams?.length || 0, "records found");
      if (teams && teams.length > 0) {
        console.log("   Sample team:", teams[0]);
      }
    }

    // Test 2: Weekly leaders
    const { data: leaders, error: leadersError } = await supabase
      .from("weekly_leaders")
      .select("*")
      .limit(3);

    if (leadersError) {
      console.error("❌ Weekly leaders error:", leadersError.message);
    } else {
      console.log("✅ Weekly leaders:", leaders?.length || 0, "records found");
    }

    // Test 3: Hot players
    const { data: hotPlayers, error: hotError } = await supabase
      .from("hot_players")
      .select("*")
      .limit(3);

    if (hotError) {
      console.error("❌ Hot players error:", hotError.message);
    } else {
      console.log("✅ Hot players:", hotPlayers?.length || 0, "records found");
    }

    // Test 4: Cold players
    const { data: coldPlayers, error: coldError } = await supabase
      .from("cold_players")
      .select("*")
      .limit(3);

    if (coldError) {
      console.error("❌ Cold players error:", coldError.message);
    } else {
      console.log(
        "✅ Cold players:",
        coldPlayers?.length || 0,
        "records found"
      );
    }

    // Test 5: Players to watch
    const { data: playersToWatch, error: watchError } = await supabase
      .from("players_to_watch")
      .select("*")
      .limit(3);

    if (watchError) {
      console.error("❌ Players to watch error:", watchError.message);
    } else {
      console.log(
        "✅ Players to watch:",
        playersToWatch?.length || 0,
        "records found"
      );
    }

    console.log("\n🎉 Database connection test completed!");
  } catch (error) {
    console.error("❌ Connection test failed:", error.message);
  }
}

testConnection();
