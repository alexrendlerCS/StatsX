// Test if the Supabase URL is reachable
const https = require("https");

const supabaseUrl = "https://pgscqyrvhadnzmpdarax.supabase.co";

console.log("🔍 Testing Supabase URL reachability...");
console.log("URL:", supabaseUrl);

// Test if the URL is reachable
const url = new URL(supabaseUrl);
const options = {
  hostname: url.hostname,
  port: 443,
  path: "/rest/v1/",
  method: "GET",
  headers: {
    apikey: "test",
    Authorization: "Bearer test",
  },
};

const req = https.request(options, (res) => {
  console.log("✅ URL is reachable!");
  console.log("Status Code:", res.statusCode);
  console.log("Headers:", res.headers);

  res.on("data", (chunk) => {
    console.log("Response:", chunk.toString());
  });

  res.on("end", () => {
    console.log("✅ Connection test completed");
  });
});

req.on("error", (error) => {
  console.error("❌ URL is not reachable:", error.message);
  console.log("This could mean:");
  console.log("1. The URL is incorrect");
  console.log("2. The Supabase project doesn't exist");
  console.log("3. Network connectivity issues");
});

req.setTimeout(10000, () => {
  console.error("❌ Request timed out");
  req.destroy();
});

req.end();
