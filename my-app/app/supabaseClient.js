import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xrstrludepuahpovxpzb.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhyc3RybHVkZXB1YWhwb3Z4cHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1NjA5OTcsImV4cCI6MjA0NzEzNjk5N30.zi3dWGxLif4__7tSOn2-r2nS1wZI_SLBUpHGMpKMznI";

const supabase = createClient(supabaseUrl, supabaseKey, {
  headers: {
    "Content-Type": "application/json",
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  },
});

export default supabase;
